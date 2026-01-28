import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import {
  InventoryItem,
  InventorySummary,
  CylinderMovement,
  CreateMovementRequest,
  InventoryQuery,
  CylinderStatus,
  LocationType
} from '../types/cylinderInventory';

export class CylinderInventoryRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async getInventory(query: InventoryQuery = {}): Promise<InventoryItem[]> {
    const pool = await this.getPool();
    let whereConditions: string[] = [];
    let request = pool.request();

    if (query.locationType) {
      whereConditions.push('cli.location_type = @locationType');
      request = request.input('locationType', sql.VarChar, query.locationType);
    }

    if (query.referenceId === undefined) {
      // For YARD, PLANT, REFILLING locations where referenceId is null
      whereConditions.push('cli.location_reference_id IS NULL');
    } else if (query.referenceId !== null) {
      // For CUSTOMER, VEHICLE locations with specific referenceId
      whereConditions.push('cli.location_reference_id = @referenceId');
      request = request.input('referenceId', sql.Int, query.referenceId);
    }

    if (query.cylinderStatus) {
      whereConditions.push('cli.cylinder_status = @cylinderStatus');
      request = request.input('cylinderStatus', sql.VarChar, query.cylinderStatus);
    }

    if (query.cylinderTypeId) {
      whereConditions.push('cli.cylinder_type_id = @cylinderTypeId');
      request = request.input('cylinderTypeId', sql.Int, query.cylinderTypeId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
    const sqlQuery = `
      SELECT
        cli.inventory_id,
        cli.cylinder_type_id,
        ct.Capacity as cylinder_type_name,
        cli.location_type,
        cli.location_reference_id,
        cli.location_reference_name,
        cli.cylinder_status,
        cli.quantity,
        cli.last_updated,
        cli.updated_by
      FROM CYLINDER_LOCATION_INVENTORY cli
      INNER JOIN CYLINDER_TYPE_MASTER ct ON cli.cylinder_type_id = ct.CylinderTypeId
      ${whereClause}
      ORDER BY cli.cylinder_type_id, cli.location_type, cli.cylinder_status
    `;

    const result = await request.query(sqlQuery);

    return result.recordset.map(row => ({
      inventoryId: row.inventory_id,
      cylinderTypeId: row.cylinder_type_id,
      cylinderTypeName: row.cylinder_type_name,
      locationType: row.location_type,
      locationReferenceId: row.location_reference_id,
      locationReferenceName: row.location_reference_name,
      cylinderStatus: row.cylinder_status,
      quantity: row.quantity,
      lastUpdated: row.last_updated,
      updatedBy: row.updated_by
    }));
  }

  async getInventorySummary(): Promise<InventorySummary[]> {
    const pool = await this.getPool();

    const result = await pool.request().query(`
      SELECT
        cli.cylinder_type_id,
        ct.Capacity as cylinder_type_name,
        cli.location_type,
        cli.cylinder_status,
        SUM(cli.quantity) as total_quantity
      FROM CYLINDER_LOCATION_INVENTORY cli
      INNER JOIN CYLINDER_TYPE_MASTER ct ON cli.cylinder_type_id = ct.CylinderTypeId
      GROUP BY cli.cylinder_type_id, ct.Capacity, cli.location_type, cli.cylinder_status
      ORDER BY cli.cylinder_type_id, cli.location_type, cli.cylinder_status
    `);

    // Group by cylinder type
    const summaryMap = new Map<number, InventorySummary>();

    result.recordset.forEach(row => {
      if (!summaryMap.has(row.cylinder_type_id)) {
        summaryMap.set(row.cylinder_type_id, {
          cylinderTypeId: row.cylinder_type_id,
          cylinderTypeName: row.cylinder_type_name,
          totalQuantity: 0,
          locations: {}
        });
      }

      const summary = summaryMap.get(row.cylinder_type_id)!;

      if (!summary.locations[row.location_type]) {
        summary.locations[row.location_type] = { filled: 0, empty: 0, total: 0 };
      }

      if (row.cylinder_status === 'FILLED') {
        summary.locations[row.location_type].filled = row.total_quantity;
      } else {
        summary.locations[row.location_type].empty = row.total_quantity;
      }

      summary.locations[row.location_type].total += row.total_quantity;
      summary.totalQuantity += row.total_quantity;
    });

    return Array.from(summaryMap.values());
  }

  async updateInventory(
    cylinderTypeId: number,
    locationType: LocationType,
    referenceId: number | null,
    cylinderStatus: CylinderStatus,
    quantityChange: number,
    updatedBy: number
  ): Promise<void> {
    const pool = await this.getPool();

    try {
      // Check if inventory record exists
      const existingResult = await pool.request()
        .input('cylinderTypeId', sql.Int, cylinderTypeId)
        .input('locationType', sql.VarChar, locationType)
        .input('referenceId', referenceId || null)
        .input('cylinderStatus', sql.VarChar, cylinderStatus)
        .query(`
          SELECT inventory_id, quantity FROM CYLINDER_LOCATION_INVENTORY
          WHERE cylinder_type_id = @cylinderTypeId
          AND location_type = @locationType
          AND ISNULL(location_reference_id, 0) = ISNULL(@referenceId, 0)
          AND cylinder_status = @cylinderStatus
        `);

      if (existingResult.recordset.length > 0) {
        // Update existing record
        const newQuantity = existingResult.recordset[0].quantity + quantityChange;

        if (newQuantity <= 0) {
          // Remove record if quantity becomes zero or negative
          await pool.request()
            .input('inventoryId', sql.BigInt, existingResult.recordset[0].inventory_id)
            .query('DELETE FROM CYLINDER_LOCATION_INVENTORY WHERE inventory_id = @inventoryId');
        } else {
          // Update quantity
          await pool.request()
            .input('inventoryId', sql.BigInt, existingResult.recordset[0].inventory_id)
            .input('quantity', sql.Int, newQuantity)
            .input('updatedBy', sql.Int, updatedBy)
            .query(`
              UPDATE CYLINDER_LOCATION_INVENTORY
              SET quantity = @quantity, last_updated = GETDATE(), updated_by = @updatedBy
              WHERE inventory_id = @inventoryId
            `);
        }
      } else if (quantityChange > 0) {
        // Create new record only if quantity is positive
        await pool.request()
          .input('cylinderTypeId', sql.Int, cylinderTypeId)
          .input('locationType', sql.VarChar, locationType)
          .input('referenceId', referenceId || null)
          .input('referenceName', null) // Skip reference name lookup for now
          .input('cylinderStatus', sql.VarChar, cylinderStatus)
          .input('quantity', sql.Int, quantityChange)
          .input('updatedBy', sql.Int, updatedBy)
          .query(`
            INSERT INTO CYLINDER_LOCATION_INVENTORY (
              cylinder_type_id, location_type, location_reference_id, location_reference_name,
              cylinder_status, quantity, updated_by
            ) VALUES (
              @cylinderTypeId, @locationType, @referenceId, @referenceName,
              @cylinderStatus, @quantity, @updatedBy
            )
          `);
      }
    } catch (error: any) {
      // Handle specific foreign key constraint errors
      if (error.number === 547) {
        const errorMessage = error.message;
        if (errorMessage.includes('FK_INVENTORY_USER')) {
          throw new Error(`User ID ${updatedBy} does not exist in the system. Please ensure the user is properly created in USER_MASTER table.`);
        } else if (errorMessage.includes('FK_INVENTORY_CYLINDER_TYPE')) {
          throw new Error(`Cylinder type ID ${cylinderTypeId} does not exist. Please select a valid cylinder type.`);
        }
        throw new Error(`Database constraint violation: ${errorMessage}`);
      }
      throw error;
    }
  }

  async logMovement(movement: CreateMovementRequest): Promise<void> {
    const pool = await this.getPool();

    await pool.request()
      .input('cylinderTypeId', sql.Int, movement.cylinderTypeId)
      .input('fromLocationType', sql.VarChar, movement.fromLocation.type)
      .input('fromReferenceId', sql.Int, movement.fromLocation.referenceId)
      .input('fromCylinderStatus', sql.VarChar, movement.fromLocation.status)
      .input('toLocationType', sql.VarChar, movement.toLocation.type)
      .input('toReferenceId', sql.Int, movement.toLocation.referenceId)
      .input('toCylinderStatus', sql.VarChar, movement.toLocation.status)
      .input('quantity', sql.Int, movement.quantity)
      .input('movementType', sql.VarChar, movement.movementType)
      .input('referenceTransactionId', sql.BigInt, movement.referenceTransactionId)
      .input('movedBy', sql.Int, movement.movedBy)
      .input('notes', sql.VarChar, movement.notes)
      .query(`
        INSERT INTO CYLINDER_MOVEMENT_LOG (
          cylinder_type_id, from_location_type, from_location_reference_id,
          from_cylinder_status, to_location_type, to_location_reference_id,
          to_cylinder_status, quantity, movement_type, reference_transaction_id,
          moved_by, notes
        ) VALUES (
          @cylinderTypeId, @fromLocationType, @fromReferenceId,
          @fromCylinderStatus, @toLocationType, @toReferenceId,
          @toCylinderStatus, @quantity, @movementType, @referenceTransactionId,
          @movedBy, @notes
        )
      `);
  }

  async validateInventoryAvailability(
    cylinderTypeId: number,
    locationType: LocationType,
    locationReferenceId: number | null,
    cylinderStatus: CylinderStatus,
    requiredQuantity: number
  ): Promise<boolean> {
    const pool = await this.getPool();

    const result = await pool.request()
      .input('cylinderTypeId', sql.Int, cylinderTypeId)
      .input('locationType', sql.VarChar, locationType)
      .input('referenceId', sql.Int, locationReferenceId)
      .input('cylinderStatus', sql.VarChar, cylinderStatus)
      .query(`
        SELECT quantity FROM CYLINDER_LOCATION_INVENTORY
        WHERE cylinder_type_id = @cylinderTypeId
        AND location_type = @locationType
        AND ISNULL(location_reference_id, 0) = ISNULL(@referenceId, 0)
        AND cylinder_status = @cylinderStatus
      `);

    const availableQuantity = result.recordset[0]?.quantity || 0;
    return availableQuantity >= requiredQuantity;
  }

  async getCylinderMovements(
    cylinderTypeId?: number,
    referenceTransactionId?: number,
    limit: number = 50
  ): Promise<any[]> {
    const pool = await this.getPool();
    let whereConditions: string[] = [];
    let request = pool.request();

    if (cylinderTypeId) {
      whereConditions.push('cml.cylinder_type_id = @cylinderTypeId');
      request = request.input('cylinderTypeId', sql.Int, cylinderTypeId);
    }

    if (referenceTransactionId) {
      whereConditions.push('cml.reference_transaction_id = @referenceTransactionId');
      request = request.input('referenceTransactionId', sql.BigInt, referenceTransactionId);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const result = await request
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          cml.*,
          ct.Capacity as cylinder_type_name,
          CAST(cml.moved_by AS VARCHAR(10)) as moved_by_name
        FROM CYLINDER_MOVEMENT_LOG cml
        INNER JOIN CYLINDER_TYPE_MASTER ct ON cml.cylinder_type_id = ct.CylinderTypeId
        ${whereClause}
        ORDER BY cml.movement_date DESC
      `);

    return result.recordset;
  }

  async createMovement(data: {
    cylinderTypeId: number;
    fromLocationType?: string;
    fromLocationReferenceId?: number;
    toLocationType: string;
    toLocationReferenceId?: number;
    quantity: number;
    cylinderStatus: string;
    movementType?: string;
    referenceTransactionId?: number;
    movedBy: number;
    notes?: string;
  }): Promise<number> {
    const pool = await this.getPool();
    const request = pool.request();

    const result = await request
      .input('cylinder_type_id', sql.BigInt, data.cylinderTypeId)
      .input('from_location_type', data.fromLocationType || null)
      .input('from_location_reference_id', data.fromLocationReferenceId || null)
      .input('to_location_type', sql.VarChar, data.toLocationType)
      .input('to_location_reference_id', data.toLocationReferenceId || null)
      .input('quantity', sql.Int, data.quantity)
      .input('cylinder_status', sql.VarChar, data.cylinderStatus)
      .input('movement_type', data.movementType || null)
      .input('reference_transaction_id', data.referenceTransactionId || null)
      .input('moved_by', sql.Int, data.movedBy)
      .input('notes', data.notes || null)
      .query(`
        INSERT INTO CYLINDER_MOVEMENT_LOG (
          cylinder_type_id, from_location_type, from_location_reference_id,
          from_cylinder_status, to_location_type, to_location_reference_id,
          to_cylinder_status, quantity, movement_type, reference_transaction_id,
          moved_by, movement_date, notes
        )
        OUTPUT INSERTED.movement_id
        VALUES (
          @cylinder_type_id, @from_location_type, @from_location_reference_id,
          @cylinder_status, @to_location_type, @to_location_reference_id,
          @cylinder_status, @quantity, @movement_type, @reference_transaction_id,
          @moved_by, GETDATE(), @notes
        )
      `);

    return result.recordset[0].movement_id;
  }
}
