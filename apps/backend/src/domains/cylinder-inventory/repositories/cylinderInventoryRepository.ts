import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import {
  CylinderLocationInventory,
  CylinderMovementLog,
  CreateCylinderMovementRequest,
  CylinderInventorySummary,
  CylinderLocationSummary
} from '../types/cylinderInventory';

export class CylinderInventoryRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  // Inventory methods
  async getInventorySummary(): Promise<CylinderInventorySummary[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT
        ctm.CylinderTypeId as cylinder_type_id,
        ctm.Capacity as cylinder_capacity,
        cli.location_type,
        cli.location_reference_name,
        SUM(cli.quantity) as quantity
      FROM dbo.CYLINDER_TYPE_MASTER ctm
      LEFT JOIN dbo.CYLINDER_LOCATION_INVENTORY cli ON ctm.CylinderTypeId = cli.cylinder_type_id
      GROUP BY ctm.CylinderTypeId, ctm.Capacity, cli.location_type, cli.location_reference_name
      ORDER BY ctm.CylinderTypeId, cli.location_type
    `);

    // Group by cylinder type
    const summaryMap = new Map<number, CylinderInventorySummary>();

    for (const row of result.recordset) {
      const cylinderId = row.cylinder_type_id;

      if (!summaryMap.has(cylinderId)) {
        summaryMap.set(cylinderId, {
          cylinder_type_id: cylinderId,
          cylinder_capacity: row.cylinder_capacity,
          locations: [],
          total_quantity: 0
        });
      }

      const summary = summaryMap.get(cylinderId)!;

      if (row.location_type && row.quantity > 0) {
        summary.locations.push({
          location_type: row.location_type,
          location_reference_name: row.location_reference_name,
          quantity: row.quantity
        });
        summary.total_quantity += row.quantity;
      }
    }

    return Array.from(summaryMap.values());
  }

  async getLocationSummary(): Promise<CylinderLocationSummary[]> {
    const pool = await this.getPool();
    const result = await pool.request().query(`
      SELECT
        cli.location_type,
        cli.location_reference_name,
        ctm.CylinderTypeId as cylinder_type_id,
        ctm.Capacity as cylinder_capacity,
        SUM(cli.quantity) as quantity
      FROM dbo.CYLINDER_LOCATION_INVENTORY cli
      JOIN dbo.CYLINDER_TYPE_MASTER ctm ON cli.cylinder_type_id = ctm.CylinderTypeId
      GROUP BY cli.location_type, cli.location_reference_name, ctm.CylinderTypeId, ctm.Capacity
      ORDER BY cli.location_type, cli.location_reference_name, ctm.CylinderTypeId
    `);

    // Group by location
    const summaryMap = new Map<string, CylinderLocationSummary>();

    for (const row of result.recordset) {
      const locationKey = `${row.location_type}-${row.location_reference_name || ''}`;

      if (!summaryMap.has(locationKey)) {
        summaryMap.set(locationKey, {
          location_type: row.location_type,
          location_reference_name: row.location_reference_name,
          cylinder_types: [],
          total_cylinders: 0
        });
      }

      const summary = summaryMap.get(locationKey)!;

      summary.cylinder_types.push({
        cylinder_type_id: row.cylinder_type_id,
        cylinder_capacity: row.cylinder_capacity,
        quantity: row.quantity
      });
      summary.total_cylinders += row.quantity;
    }

    return Array.from(summaryMap.values());
  }

  async getInventoryByLocation(
    locationType: string,
    locationReferenceId?: number
  ): Promise<CylinderLocationInventory[]> {
    const pool = await this.getPool();
    let query = `
      SELECT cli.*, ctm.Capacity, ctm.CylinderTypeId
      FROM dbo.CYLINDER_LOCATION_INVENTORY cli
      JOIN dbo.CYLINDER_TYPE_MASTER ctm ON cli.cylinder_type_id = ctm.CylinderTypeId
      WHERE cli.location_type = @locationType
    `;
    const request = pool.request().input('locationType', sql.VarChar(20), locationType);

    if (locationReferenceId !== undefined) {
      query += ' AND cli.location_reference_id = @locationReferenceId';
      request.input('locationReferenceId', sql.Int, locationReferenceId);
    }

    query += ' ORDER BY cli.last_updated DESC';

    const result = await request.query(query);

    return result.recordset.map((row: any) => ({
      ...row,
      cylinder_type: {
        CylinderTypeId: row.CylinderTypeId,
        Capacity: row.Capacity
      }
    }));
  }

  async updateInventoryQuantity(
    cylinderTypeId: number,
    locationType: string,
    locationReferenceId: number | null,
    quantityChange: number,
    updatedBy: number
  ): Promise<void> {
    const pool = await this.getPool();

    // First, try to update existing record
    let result = await pool.request()
      .input('cylinderTypeId', sql.Int, cylinderTypeId)
      .input('locationType', sql.VarChar(20), locationType)
      .input('locationReferenceId', sql.Int, locationReferenceId)
      .input('quantityChange', sql.Int, quantityChange)
      .input('updatedBy', sql.Int, updatedBy)
      .query(`
        UPDATE dbo.CYLINDER_LOCATION_INVENTORY
        SET quantity = quantity + @quantityChange,
            last_updated = GETDATE(),
            updated_by = @updatedBy
        WHERE cylinder_type_id = @cylinderTypeId
        AND location_type = @locationType
        AND (
          (@locationReferenceId IS NULL AND location_reference_id IS NULL) OR
          location_reference_id = @locationReferenceId
        )
      `);

    // If no record was updated, insert new record
    if (result.rowsAffected[0] === 0) {
      // Get location reference name if applicable
      let locationReferenceName = null;
      if (locationReferenceId) {
        if (locationType === 'VEHICLE') {
          const vehicleResult = await pool.request()
            .input('id', sql.Int, locationReferenceId)
            .query('SELECT vehicle_number FROM dbo.VEHICLE_MASTER WHERE vehicle_id = @id');
          locationReferenceName = vehicleResult.recordset[0]?.vehicle_number;
        } else if (locationType === 'CUSTOMER') {
          const customerResult = await pool.request()
            .input('id', sql.Int, locationReferenceId)
            .query('SELECT customer_name FROM dbo.CUSTOMER_MASTER WHERE customer_id = @id');
          locationReferenceName = customerResult.recordset[0]?.customer_name;
        }
      }

      await pool.request()
        .input('cylinderTypeId', sql.Int, cylinderTypeId)
        .input('locationType', sql.VarChar(20), locationType)
        .input('locationReferenceId', sql.Int, locationReferenceId)
        .input('locationReferenceName', sql.VarChar(100), locationReferenceName)
        .input('quantity', sql.Int, Math.max(0, quantityChange)) // Ensure non-negative
        .input('updatedBy', sql.Int, updatedBy)
        .query(`
          INSERT INTO dbo.CYLINDER_LOCATION_INVENTORY (
            cylinder_type_id, location_type, location_reference_id,
            location_reference_name, quantity, updated_by
          )
          VALUES (@cylinderTypeId, @locationType, @locationReferenceId,
                  @locationReferenceName, @quantity, @updatedBy)
        `);
    }
  }

  // Movement log methods
  async recordMovement(
    movement: CreateCylinderMovementRequest,
    movedBy: number
  ): Promise<CylinderMovementLog> {
    const pool = await this.getPool();

    // Get location reference names
    let fromLocationName = null;
    let toLocationName = null;

    if (movement.from_location_reference_id) {
      if (movement.from_location_type === 'VEHICLE') {
        const result = await pool.request()
          .input('id', sql.Int, movement.from_location_reference_id)
          .query('SELECT vehicle_number FROM dbo.VEHICLE_MASTER WHERE vehicle_id = @id');
        fromLocationName = result.recordset[0]?.vehicle_number;
      } else if (movement.from_location_type === 'CUSTOMER') {
        const result = await pool.request()
          .input('id', sql.Int, movement.from_location_reference_id)
          .query('SELECT customer_name FROM dbo.CUSTOMER_MASTER WHERE customer_id = @id');
        fromLocationName = result.recordset[0]?.customer_name;
      }
    }

    if (movement.to_location_reference_id) {
      if (movement.to_location_type === 'VEHICLE') {
        const result = await pool.request()
          .input('id', sql.Int, movement.to_location_reference_id)
          .query('SELECT vehicle_number FROM dbo.VEHICLE_MASTER WHERE vehicle_id = @id');
        toLocationName = result.recordset[0]?.vehicle_number;
      } else if (movement.to_location_type === 'CUSTOMER') {
        const result = await pool.request()
          .input('id', sql.Int, movement.to_location_reference_id)
          .query('SELECT customer_name FROM dbo.CUSTOMER_MASTER WHERE customer_id = @id');
        toLocationName = result.recordset[0]?.customer_name;
      }
    }

    const result = await pool.request()
      .input('cylinderTypeId', sql.Int, movement.cylinder_type_id)
      .input('fromLocationType', sql.VarChar(20), movement.from_location_type || null)
      .input('fromLocationReferenceId', sql.Int, movement.from_location_reference_id || null)
      .input('toLocationType', sql.VarChar(20), movement.to_location_type)
      .input('toLocationReferenceId', sql.Int, movement.to_location_reference_id || null)
      .input('quantity', sql.Int, movement.quantity)
      .input('movementType', sql.VarChar(20), movement.movement_type || null)
      .input('referenceTransactionId', sql.BigInt, movement.reference_transaction_id || null)
      .input('notes', sql.VarChar(500), movement.notes || null)
      .input('movedBy', sql.Int, movedBy)
      .query(`
        INSERT INTO dbo.CYLINDER_MOVEMENT_LOG (
          cylinder_type_id, from_location_type, from_location_reference_id,
          to_location_type, to_location_reference_id, quantity,
          movement_type, reference_transaction_id, notes, moved_by
        )
        OUTPUT INSERTED.*
        VALUES (@cylinderTypeId, @fromLocationType, @fromLocationReferenceId,
                @toLocationType, @toLocationReferenceId, @quantity,
                @movementType, @referenceTransactionId, @notes, @movedBy)
      `);

    return result.recordset[0];
  }

  async getMovementLogs(
    limit: number = 100,
    offset: number = 0
  ): Promise<CylinderMovementLog[]> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .input('offset', sql.Int, offset)
      .query(`
        SELECT cml.*, ctm.Capacity, um.UserName
        FROM dbo.CYLINDER_MOVEMENT_LOG cml
        JOIN dbo.CYLINDER_TYPE_MASTER ctm ON cml.cylinder_type_id = ctm.CylinderTypeId
        JOIN dbo.USER_MASTER um ON cml.moved_by = um.UserId
        ORDER BY cml.movement_date DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    return result.recordset.map((row: any) => ({
      ...row,
      cylinder_type: {
        CylinderTypeId: row.cylinder_type_id,
        Capacity: row.Capacity
      },
      moved_by_user: {
        UserId: row.moved_by,
        UserName: row.UserName
      }
    }));
  }

  async getMovementsByCylinderType(cylinderTypeId: number): Promise<CylinderMovementLog[]> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('cylinderTypeId', sql.Int, cylinderTypeId)
      .query(`
        SELECT cml.*, ctm.Capacity, um.UserName
        FROM dbo.CYLINDER_MOVEMENT_LOG cml
        JOIN dbo.CYLINDER_TYPE_MASTER ctm ON cml.cylinder_type_id = ctm.CylinderTypeId
        JOIN dbo.USER_MASTER um ON cml.moved_by = um.UserId
        WHERE cml.cylinder_type_id = @cylinderTypeId
        ORDER BY cml.movement_date DESC
      `);

    return result.recordset.map((row: any) => ({
      ...row,
      cylinder_type: {
        CylinderTypeId: row.cylinder_type_id,
        Capacity: row.Capacity
      },
      moved_by_user: {
        UserId: row.moved_by,
        UserName: row.UserName
      }
    }));
  }

  async getMovementsByTransaction(transactionId: number): Promise<CylinderMovementLog[]> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('transactionId', sql.BigInt, transactionId)
      .query(`
        SELECT cml.*, ctm.Capacity, um.UserName
        FROM dbo.CYLINDER_MOVEMENT_LOG cml
        JOIN dbo.CYLINDER_TYPE_MASTER ctm ON cml.cylinder_type_id = ctm.CylinderTypeId
        JOIN dbo.USER_MASTER um ON cml.moved_by = um.UserId
        WHERE cml.reference_transaction_id = @transactionId
        ORDER BY cml.movement_date DESC
      `);

    return result.recordset.map((row: any) => ({
      ...row,
      cylinder_type: {
        CylinderTypeId: row.cylinder_type_id,
        Capacity: row.Capacity
      },
      moved_by_user: {
        UserId: row.moved_by,
        UserName: row.UserName
      }
    }));
  }
}
