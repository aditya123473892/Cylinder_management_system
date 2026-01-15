import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import { DeliveryTransaction, DeliveryTransactionLine, DeliveryTransactionWithLines, CreateDeliveryTransactionRequest } from '../types/deliveryTransaction';

export class DeliveryTransactionRepository {
  private async getPool(): Promise<sql.ConnectionPool> {
    return await connectDB();
  }

  async findAll(): Promise<DeliveryTransactionWithLines[]> {
    const pool = await this.getPool();

    // Get all transactions with basic info including GR status
    const transactions = await pool.request().query(`
      SELECT dt.*, c.CustomerName as customer_name, l.LocationName as location_name,
             v.vehicle_number, d.driver_name,
             gr.gr_status, gr.advance_amount as gr_advance_amount
      FROM dbo.DELIVERY_TRANSACTION dt
      INNER JOIN dbo.CUSTOMER_MASTER c ON dt.customer_id = c.CustomerId
      INNER JOIN dbo.LOCATION_MASTER l ON dt.to_location_id = l.LocationId
      LEFT JOIN dbo.VEHICLE_MASTER v ON dt.vehicle_id = v.vehicle_id
      LEFT JOIN dbo.DRIVER_MASTER d ON dt.driver_id = d.driver_id
      LEFT JOIN dbo.GR_MASTER gr ON dt.delivery_id = gr.delivery_id
      ORDER BY dt.delivery_id DESC
    `);

    // Get line items for each transaction and calculate totals
    const transactionsWithLines = await Promise.all(
      transactions.recordset.map(async (transaction: any) => {
        const linesResult = await pool.request()
          .input('deliveryId', sql.BigInt, transaction.delivery_id)
          .query(`
            SELECT dtl.*, ct.Capacity as cylinder_type_name
            FROM dbo.DELIVERY_TRANSACTION_LINE dtl
            INNER JOIN dbo.CYLINDER_TYPE_MASTER ct ON dtl.cylinder_type_id = ct.CylinderTypeId
            WHERE dtl.delivery_id = @deliveryId
            ORDER BY dtl.delivery_line_id
          `);

        // Calculate totals from line items
        const totalDeliveredQty = linesResult.recordset.reduce((sum: number, line: any) => sum + line.delivered_qty, 0);
        const totalReturnedQty = linesResult.recordset.reduce((sum: number, line: any) => sum + line.returned_qty, 0);
        const totalAmount = linesResult.recordset.reduce((sum: number, line: any) => sum + (line.line_amount || 0), 0);

        return {
          ...transaction,
          lines: linesResult.recordset,
          total_delivered_qty: totalDeliveredQty,
          total_returned_qty: totalReturnedQty,
          total_net_qty: totalDeliveredQty - totalReturnedQty,
          total_bill_amount: totalAmount
        };
      })
    );

    return transactionsWithLines;
  }

  async findById(id: number): Promise<DeliveryTransactionWithLines | null> {
    const pool = await this.getPool();

    // Get header
    const headerResult = await pool.request()
      .input('id', sql.BigInt, id)
      .query(`
        SELECT dt.*, c.CustomerName as customer_name, l.LocationName as location_name
        FROM dbo.DELIVERY_TRANSACTION dt
        INNER JOIN dbo.CUSTOMER_MASTER c ON dt.customer_id = c.CustomerId
        INNER JOIN dbo.LOCATION_MASTER l ON dt.to_location_id = l.LocationId
        WHERE dt.delivery_id = @id
      `);

    if (headerResult.recordset.length === 0) {
      return null;
    }

    // Get lines
    const linesResult = await pool.request()
      .input('id', sql.BigInt, id)
      .query(`
        SELECT dtl.*, ct.Capacity as cylinder_type_name
        FROM dbo.DELIVERY_TRANSACTION_LINE dtl
        INNER JOIN dbo.CYLINDER_TYPE_MASTER ct ON dtl.cylinder_type_id = ct.CylinderTypeId
        WHERE dtl.delivery_id = @id
        ORDER BY dtl.delivery_line_id
      `);

    return {
      ...headerResult.recordset[0],
      lines: linesResult.recordset
    };
  }

  async createWithTransaction(data: CreateDeliveryTransactionRequest, createdBy: number): Promise<DeliveryTransactionWithLines> {
    const pool = await this.getPool();
    const transaction = new sql.Transaction(pool);

    try {
      await transaction.begin();

      // Calculate totals
      const totalDeliveredQty = data.lines.reduce((sum, line) => sum + line.delivered_qty, 0);
      const totalReturnedQty = data.lines.reduce((sum, line) => sum + line.returned_qty, 0);
      const totalNetQty = totalDeliveredQty - totalReturnedQty;

      // Get rate contract details for rate lookup
      const rateContractResult = await transaction.request()
        .input('rateContractId', sql.Int, data.rate_contract_id)
        .query('SELECT * FROM dbo.RATE_CONTRACT_MASTER WHERE rate_contract_id = @rateContractId');

      if (rateContractResult.recordset.length === 0) {
        throw new Error('Rate contract not found');
      }

      const rateContract = rateContractResult.recordset[0];

      // Calculate total bill amount and prepare lines with rates
      let totalBillAmount = 0;
      const linesWithRates = [];

      for (const line of data.lines) {
        // Get cylinder type details
        const cylinderResult = await transaction.request()
          .input('cylinderTypeId', sql.Int, line.cylinder_type_id)
          .query('SELECT Capacity FROM dbo.CYLINDER_TYPE_MASTER WHERE CylinderTypeId = @cylinderTypeId');

        if (cylinderResult.recordset.length === 0) {
          throw new Error(`Cylinder type ${line.cylinder_type_id} not found`);
        }

        const cylinderDescription = cylinderResult.recordset[0].Capacity;
        const rateApplied = rateContract.rate_per_cylinder;
        const billableQty = line.delivered_qty; // Only delivered qty is billable
        const lineAmount = billableQty * rateApplied;

        totalBillAmount += lineAmount;

        linesWithRates.push({
          cylinder_type_id: line.cylinder_type_id,
          cylinder_description: cylinderDescription,
          delivered_qty: line.delivered_qty,
          returned_qty: line.returned_qty,
          net_qty: line.delivered_qty - line.returned_qty,
          rate_applied: rateApplied,
          billable_qty: billableQty,
          line_amount: lineAmount
        });
      }

      // Get customer and location names for snapshot
      const customerResult = await transaction.request()
        .input('customerId', sql.Int, data.customer_id)
        .query('SELECT CustomerName FROM dbo.CUSTOMER_MASTER WHERE CustomerId = @customerId');

      const locationResult = await transaction.request()
        .input('locationId', sql.Int, data.location_id)
        .query('SELECT LocationName FROM dbo.LOCATION_MASTER WHERE LocationId = @locationId');

      if (customerResult.recordset.length === 0) {
        throw new Error('Customer not found');
      }
      if (locationResult.recordset.length === 0) {
        throw new Error('Location not found');
      }

      const customerName = customerResult.recordset[0].CustomerName;
      const locationName = locationResult.recordset[0].LocationName;

      // Insert delivery header using existing table structure
      const headerResult = await transaction.request()
        .input('customer_id', sql.Int, data.customer_id)
        .input('customer_type', sql.VarChar(20), 'DIRECT') // Default customer type
        .input('from_location_id', sql.Int, data.location_id) // Use location as from_location
        .input('from_location_name', sql.VarChar(100), locationName)
        .input('to_location_id', sql.Int, data.location_id) // Use same location as to_location
        .input('to_location_name', sql.VarChar(100), locationName)
        .input('vehicle_id', sql.Int, data.vehicle_id)
        .input('driver_id', sql.Int, data.driver_id)
        .input('selected_rate_contract_id', sql.Int, data.rate_contract_id)
        .input('delivery_datetime', sql.DateTime, new Date(`${data.delivery_date}T${data.delivery_time}:00`))
        .input('total_delivered_qty', sql.Int, totalDeliveredQty)
        .input('total_returned_qty', sql.Int, totalReturnedQty)
        .input('total_net_qty', sql.Int, totalNetQty)
        .input('total_bill_amount', sql.Decimal(12, 2), totalBillAmount)
        .input('created_by', sql.Int, createdBy)
        .query(`
          INSERT INTO dbo.DELIVERY_TRANSACTION (
            customer_id, customer_type, from_location_id, from_location_name,
            to_location_id, to_location_name, vehicle_id, driver_id,
            selected_rate_contract_id, delivery_datetime,
            total_delivered_qty, total_returned_qty, total_net_qty, total_bill_amount,
            created_by
          )
          OUTPUT INSERTED.*
          VALUES (
            @customer_id, @customer_type, @from_location_id, @from_location_name,
            @to_location_id, @to_location_name, @vehicle_id, @driver_id,
            @selected_rate_contract_id, @delivery_datetime,
            @total_delivered_qty, @total_returned_qty, @total_net_qty, @total_bill_amount,
            @created_by
          )
        `);

      const deliveryId = headerResult.recordset[0].delivery_id;

      // Insert delivery lines
      const insertedLines = [];
      for (const line of linesWithRates) {
        const lineResult = await transaction.request()
          .input('delivery_id', sql.BigInt, deliveryId)
          .input('cylinder_type_id', sql.Int, line.cylinder_type_id)
          .input('cylinder_description', sql.VarChar(100), line.cylinder_description)
          .input('delivered_qty', sql.Int, line.delivered_qty)
          .input('returned_qty', sql.Int, line.returned_qty)
          .input('rate_applied', sql.Decimal(10, 2), line.rate_applied)
          .input('billable_qty', sql.Int, line.billable_qty)
          .input('line_amount', sql.Decimal(12, 2), line.line_amount)
          .query(`
            INSERT INTO dbo.DELIVERY_TRANSACTION_LINE (
              delivery_id, cylinder_type_id, cylinder_description,
              delivered_qty, returned_qty, rate_applied, billable_qty, line_amount
            )
            OUTPUT INSERTED.*
            VALUES (
              @delivery_id, @cylinder_type_id, @cylinder_description,
              @delivered_qty, @returned_qty, @rate_applied, @billable_qty, @line_amount
            )
          `);

        insertedLines.push(lineResult.recordset[0]);
      }

      await transaction.commit();

      return {
        ...headerResult.recordset[0],
        lines: insertedLines
      };

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async exists(id: number): Promise<boolean> {
    const pool = await this.getPool();
    const result = await pool.request()
      .input('id', sql.BigInt, id)
      .query('SELECT 1 FROM dbo.DELIVERY_TRANSACTION WHERE delivery_id = @id');
    return result.recordset.length > 0;
  }
}
