import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { GR, GRWithDeliveryDetails, CreateGRRequest, GRPreviewData } from '../types/gr';

export class GRRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<GRWithDeliveryDetails[]> {
    const pool = await this.getPool();

    const result = await pool.request().query(`
      SELECT gr.*,
             c.CustomerName as customer_name,
             l.LocationName as location_name,
             dt.delivery_date, dt.delivery_time,
             dt.total_delivered_qty, dt.total_bill_amount,
             v.vehicle_number, d.driver_name
      FROM dbo.GR_MASTER gr
      INNER JOIN dbo.DELIVERY_TRANSACTION dt ON gr.delivery_id = dt.delivery_id
      INNER JOIN dbo.CUSTOMER_MASTER c ON dt.customer_id = c.CustomerId
      INNER JOIN dbo.LOCATION_MASTER l ON dt.location_id = l.LocationId
      LEFT JOIN dbo.VEHICLE_MASTER v ON dt.vehicle_id = v.vehicle_id
      LEFT JOIN dbo.DRIVER_MASTER d ON dt.driver_id = d.driver_id
      ORDER BY gr.gr_id DESC
    `);

    return result.recordset.map((row: any) => ({
      ...row,
      delivery_transaction: {
        delivery_id: row.delivery_id,
        customer_name: row.customer_name,
        customer_type: 'DIRECT', // Default customer type
        from_location_name: row.location_name,
        to_location_name: row.location_name,
        vehicle_number: row.vehicle_number,
        driver_name: row.driver_name,
        delivery_datetime: row.delivery_date ? new Date(`${row.delivery_date}T${row.delivery_time || '00:00:00'}`).toISOString() : '',
        total_delivered_qty: row.total_delivered_qty,
        total_bill_amount: row.total_bill_amount
      }
    }));
  }

  async findById(id: number): Promise<GRWithDeliveryDetails | null> {
    const pool = await this.getPool();

    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .query(`
        SELECT gr.*,
               c.CustomerName as customer_name,
               l.LocationName as location_name,
               dt.delivery_date, dt.delivery_time,
               dt.total_delivered_qty, dt.total_bill_amount,
               v.vehicle_number, d.driver_name
        FROM dbo.GR_MASTER gr
        INNER JOIN dbo.DELIVERY_TRANSACTION dt ON gr.delivery_id = dt.delivery_id
        INNER JOIN dbo.CUSTOMER_MASTER c ON dt.customer_id = c.CustomerId
        INNER JOIN dbo.LOCATION_MASTER l ON dt.location_id = l.LocationId
        LEFT JOIN dbo.VEHICLE_MASTER v ON dt.vehicle_id = v.vehicle_id
        LEFT JOIN dbo.DRIVER_MASTER d ON dt.driver_id = d.driver_id
        WHERE gr.gr_id = @id
      `);

    if (result.recordset.length === 0) {
      return null;
    }

    const row = result.recordset[0];
    return {
      ...row,
      delivery_transaction: {
        delivery_id: row.delivery_id,
        customer_name: row.customer_name,
        customer_type: 'DIRECT', // Default customer type
        from_location_name: row.location_name,
        to_location_name: row.location_name,
        vehicle_number: row.vehicle_number,
        driver_name: row.driver_name,
        delivery_datetime: row.delivery_date ? new Date(`${row.delivery_date}T${row.delivery_time || '00:00:00'}`).toISOString() : '',
        total_delivered_qty: row.total_delivered_qty,
        total_bill_amount: row.total_bill_amount
      }
    };
  }

  async findByDeliveryId(deliveryId: number): Promise<GR | null> {
    const pool = await this.getPool();

    const result = await pool.request()
      .input('deliveryId', sql.BigInt, deliveryId)
      .query('SELECT * FROM dbo.GR_MASTER WHERE delivery_id = @deliveryId');

    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  async findApproved(): Promise<GRWithDeliveryDetails[]> {
    const pool = await this.getPool();

    // First, let's check what columns actually exist in the delivery transaction table
    const schemaCheck = await pool.request().query(`
      SELECT TOP 1 * FROM dbo.DELIVERY_TRANSACTION
    `);
    console.log('DELIVERY_TRANSACTION columns:', Object.keys(schemaCheck.recordset[0] || {}));

    const result = await pool.request().query(`
      SELECT gr.*,
             c.CustomerName as customer_name,
             l.LocationName as location_name,
             dt.delivery_date, dt.delivery_time,
             dt.total_delivered_qty, dt.total_bill_amount,
             v.vehicle_number, d.driver_name
      FROM dbo.GR_MASTER gr
      INNER JOIN dbo.DELIVERY_TRANSACTION dt ON gr.delivery_id = dt.delivery_id
      INNER JOIN dbo.CUSTOMER_MASTER c ON dt.customer_id = c.CustomerId
      INNER JOIN dbo.LOCATION_MASTER l ON dt.location_id = l.LocationId
      LEFT JOIN dbo.VEHICLE_MASTER v ON dt.vehicle_id = v.vehicle_id
      LEFT JOIN dbo.DRIVER_MASTER d ON dt.driver_id = d.driver_id
      WHERE gr.gr_status = 'APPROVED' OR gr.gr_status = 'FINALIZED'
      ORDER BY gr.gr_id DESC
    `);

    return result.recordset.map((row: any) => ({
      ...row,
      delivery_transaction: {
        delivery_id: row.delivery_id,
        customer_name: row.customer_name,
        customer_type: 'DIRECT', // Default customer type
        from_location_name: row.location_name,
        to_location_name: row.location_name,
        vehicle_number: row.vehicle_number,
        driver_name: row.driver_name,
        delivery_datetime: row.delivery_date ? new Date(`${row.delivery_date}T${row.delivery_time || '00:00:00'}`).toISOString() : '',
        total_delivered_qty: row.total_delivered_qty,
        total_bill_amount: row.total_bill_amount
      }
    }));
  }

  async getGRPreviewData(deliveryId: number): Promise<GRPreviewData | null> {
    const pool = await this.getPool();

    // Get delivery transaction details
    const deliveryResult = await pool.request()
      .input('deliveryId', sql.BigInt, deliveryId)
      .query(`
        SELECT dt.*, c.CustomerName as customer_name, l.LocationName as location_name,
               v.vehicle_number, d.driver_name
        FROM dbo.DELIVERY_TRANSACTION dt
        INNER JOIN dbo.CUSTOMER_MASTER c ON dt.customer_id = c.CustomerId
        INNER JOIN dbo.LOCATION_MASTER l ON dt.location_id = l.LocationId
        LEFT JOIN dbo.VEHICLE_MASTER v ON dt.vehicle_id = v.vehicle_id
        LEFT JOIN dbo.DRIVER_MASTER d ON dt.driver_id = d.driver_id
        WHERE dt.delivery_id = @deliveryId
      `);

    if (deliveryResult.recordset.length === 0) {
      return null;
    }

    const delivery = deliveryResult.recordset[0];

    // Get delivery lines
    const linesResult = await pool.request()
      .input('deliveryId', sql.BigInt, deliveryId)
      .query(`
        SELECT dtl.cylinder_description, dtl.delivered_qty, dtl.returned_qty,
               (dtl.delivered_qty - dtl.returned_qty) as net_qty, dtl.rate_applied, dtl.line_amount
        FROM dbo.DELIVERY_TRANSACTION_LINE dtl
        WHERE dtl.delivery_id = @deliveryId
        ORDER BY dtl.delivery_line_id
      `);

    // Check if GR already exists
    const existingGR = await this.findByDeliveryId(deliveryId);

    return {
      gr_id: existingGR?.gr_id,
      delivery_id: deliveryId,
      gr_number: existingGR?.gr_number,
      gr_status: existingGR?.gr_status,
      advance_amount: existingGR?.advance_amount || 0,
      delivery_details: {
        delivery_id: delivery.delivery_id,
        customer_name: delivery.customer_name,
        customer_type: 'DIRECT', // Default customer type
        from_location_name: delivery.location_name,
        to_location_name: delivery.location_name,
        vehicle_number: delivery.vehicle_number,
        driver_name: delivery.driver_name,
        delivery_datetime: delivery.delivery_date ? new Date(`${delivery.delivery_date}T${delivery.delivery_time || '00:00:00'}`).toISOString() : '',
        total_delivered_qty: delivery.total_delivered_qty,
        total_bill_amount: delivery.total_bill_amount,
        lines: linesResult.recordset
      }
    };
  }

  async create(data: CreateGRRequest, createdBy: number): Promise<GR> {
    const pool = await this.getPool();

    // Check if GR already exists for this delivery
    const existingGR = await this.findByDeliveryId(data.delivery_id);
    if (existingGR) {
      throw new Error('GR already exists for this delivery transaction');
    }

    // Generate GR number (format: GR-YYYYMMDD-XXXX)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const grNumber = `GR-${dateStr}-${randomNum}`;

    const result = await pool.request()
      .input('deliveryId', sql.BigInt, data.delivery_id)
      .input('grNumber', sql.VarChar(50), grNumber)
      .input('advanceAmount', sql.Decimal(12, 2), data.advance_amount || 0)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO dbo.GR_MASTER (
          delivery_id, gr_number, gr_status, advance_amount, created_by
        )
        OUTPUT INSERTED.*
        VALUES (
          @deliveryId, @grNumber, 'PENDING', @advanceAmount, @createdBy
        )
      `);

    return result.recordset[0];
  }

  async approve(id: number, advanceAmount: number, approvedBy: number): Promise<GR> {
    const pool = await this.getPool();

    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .input('advanceAmount', sql.Decimal(12, 2), advanceAmount)
      .input('approvedBy', sql.Int, approvedBy)
      .query(`
        UPDATE dbo.GR_MASTER
        SET gr_status = 'APPROVED',
            advance_amount = @advanceAmount,
            approved_by = @approvedBy,
            approved_at = GETDATE(),
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE gr_id = @id AND gr_status = 'PENDING'
      `);

    if (result.recordset.length === 0) {
      throw new Error('GR not found or already approved');
    }

    return result.recordset[0];
  }

  async finalize(id: number, finalizedBy: number): Promise<GR> {
    const pool = await this.getPool();

    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .input('finalizedBy', sql.Int, finalizedBy)
      .query(`
        UPDATE dbo.GR_MASTER
        SET gr_status = 'FINALIZED',
            finalized_by = @finalizedBy,
            finalized_at = GETDATE(),
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE gr_id = @id AND gr_status = 'APPROVED'
      `);

    if (result.recordset.length === 0) {
      throw new Error('GR not found or not in approved status');
    }

    return result.recordset[0];
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .query('SELECT 1 FROM dbo.GR_MASTER WHERE gr_id = @id');
    return result.recordset.length > 0;
  }
}
