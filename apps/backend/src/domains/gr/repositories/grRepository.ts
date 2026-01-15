import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { Gr, GrWithDelivery, CreateGrRequest, ApproveGrRequest } from '../types/gr';

export class GrRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<GrWithDelivery[]> {
    const pool = await this.getPool();

    const grs = await pool.request().query(`
      SELECT
        g.*,
        c.CustomerName as customer_name,
        v.vehicle_number,
        d.driver_name,
        dt.delivery_datetime
      FROM dbo.GR_MASTER g
      INNER JOIN dbo.DELIVERY_TRANSACTION dt ON g.delivery_id = dt.delivery_id
      INNER JOIN dbo.CUSTOMER_MASTER c ON dt.customer_id = c.CustomerId
      LEFT JOIN dbo.VEHICLE_MASTER v ON dt.vehicle_id = v.vehicle_id
      LEFT JOIN dbo.DRIVER_MASTER d ON dt.driver_id = d.driver_id
      ORDER BY g.gr_id DESC
    `);

    return grs.recordset.map((row: any) => ({
      ...row,
      delivery_info: {
        customer_name: row.customer_name,
        vehicle_number: row.vehicle_number,
        driver_name: row.driver_name,
        delivery_datetime: row.delivery_datetime
      }
    }));
  }

  async findById(id: number): Promise<GrWithDelivery | null> {
    const pool = await this.getPool();

    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .query(`
        SELECT
          g.*,
          c.CustomerName as customer_name,
          v.vehicle_number,
          d.driver_name,
          dt.delivery_datetime
        FROM dbo.GR_MASTER g
        INNER JOIN dbo.DELIVERY_TRANSACTION dt ON g.delivery_id = dt.delivery_id
        INNER JOIN dbo.CUSTOMER_MASTER c ON dt.customer_id = c.CustomerId
        LEFT JOIN dbo.VEHICLE_MASTER v ON dt.vehicle_id = v.vehicle_id
        LEFT JOIN dbo.DRIVER_MASTER d ON dt.driver_id = d.driver_id
        WHERE g.gr_id = @id
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      ...row,
      delivery_info: {
        customer_name: row.customer_name,
        vehicle_number: row.vehicle_number,
        driver_name: row.driver_name,
        delivery_datetime: row.delivery_datetime
      }
    };
  }

  async create(data: CreateGrRequest, createdBy: number): Promise<GrWithDelivery> {
    const pool = await this.getPool();

    // Generate GR number
    const grNumber = `GR-${Date.now()}`;

    // Check if delivery exists and doesn't already have a GR
    const deliveryCheck = await pool.request()
      .input('deliveryId', sql.BigInt, data.delivery_id)
      .query(`
        SELECT dt.delivery_id
        FROM dbo.DELIVERY_TRANSACTION dt
        LEFT JOIN dbo.GR_MASTER g ON dt.delivery_id = g.delivery_id
        WHERE dt.delivery_id = @deliveryId AND g.gr_id IS NULL
      `);

    if (deliveryCheck.recordset.length === 0) {
      throw new Error('Delivery transaction not found or already has a GR');
    }

    const result = await pool.request()
      .input('deliveryId', sql.BigInt, data.delivery_id)
      .input('grNumber', sql.VarChar(50), grNumber)
      .input('advanceAmount', sql.Decimal(12, 2), data.advance_amount)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO dbo.GR_MASTER (
          delivery_id, gr_number, advance_amount, created_by
        )
        OUTPUT INSERTED.*
        VALUES (
          @deliveryId, @grNumber, @advanceAmount, @createdBy
        )
      `);

    return await this.findById(result.recordset[0].gr_id) as GrWithDelivery;
  }

  async approve(id: number, data: ApproveGrRequest, approvedBy: number): Promise<GrWithDelivery> {
    const pool = await this.getPool();

    // Check current status
    const currentGr = await this.findById(id);
    if (!currentGr) {
      throw new Error('GR not found');
    }

    if (currentGr.gr_status !== 'PENDING') {
      throw new Error('GR can only be approved when in PENDING status');
    }

    // Update advance amount if provided
    let updateQuery = `
      UPDATE dbo.GR_MASTER
      SET gr_status = 'APPROVED',
          approved_by = @approvedBy,
          approved_at = GETDATE()
    `;

    if (data.advance_amount !== undefined) {
      updateQuery += `, advance_amount = @advanceAmount`;
    }

    updateQuery += `, updated_at = GETDATE() WHERE gr_id = @id`;

    const request = pool.request()
      .input('id', sql.BigInt, id)
      .input('approvedBy', sql.Int, approvedBy);

    if (data.advance_amount !== undefined) {
      request.input('advanceAmount', sql.Decimal(12, 2), data.advance_amount);
    }

    await request.query(updateQuery);

    return await this.findById(id) as GrWithDelivery;
  }

  async finalize(id: number, finalizedBy: number): Promise<GrWithDelivery> {
    const pool = await this.getPool();

    // Check current status
    const currentGr = await this.findById(id);
    if (!currentGr) {
      throw new Error('GR not found');
    }

    if (currentGr.gr_status !== 'APPROVED') {
      throw new Error('GR can only be finalized when in APPROVED status');
    }

    await pool.request()
      .input('id', sql.BigInt, id)
      .input('finalizedBy', sql.Int, finalizedBy)
      .query(`
        UPDATE dbo.GR_MASTER
        SET gr_status = 'FINALIZED',
            finalized_by = @finalizedBy,
            finalized_at = GETDATE(),
            updated_at = GETDATE()
        WHERE gr_id = @id
      `);

    return await this.findById(id) as GrWithDelivery;
  }

  async closeTrip(id: number, closedBy: number): Promise<GrWithDelivery> {
    const pool = await this.getPool();

    // First finalize the GR if not already finalized
    const currentGr = await this.findById(id);
    if (!currentGr) {
      throw new Error('GR not found');
    }

    if (currentGr.gr_status === 'PENDING') {
      throw new Error('Cannot close trip for PENDING GR. GR must be approved first.');
    }

    if (currentGr.gr_status === 'APPROVED') {
      // Auto-finalize if approved
      await this.finalize(id, closedBy);
    }

    // Note: Since we don't have a trip status field in delivery transaction,
    // we'll just return the finalized GR. In a real implementation,
    // you might want to add a status field to DELIVERY_TRANSACTION table.

    return await this.findById(id) as GrWithDelivery;
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .query('SELECT 1 FROM dbo.GR_MASTER WHERE gr_id = @id');
    return result.recordset.length > 0;
  }

  async findByDeliveryId(deliveryId: number): Promise<GrWithDelivery | null> {
    const pool = await this.getPool();

    const result = await pool.request()
      .input('deliveryId', sql.BigInt, deliveryId)
      .query(`
        SELECT gr_id FROM dbo.GR_MASTER WHERE delivery_id = @deliveryId
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    return await this.findById(result.recordset[0].gr_id);
  }
}
