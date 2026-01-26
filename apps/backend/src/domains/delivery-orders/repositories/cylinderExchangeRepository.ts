import sql from 'mssql';
import { 
  OrderExchangeTracking, 
  DailyReconciliation, 
  ExchangeVarianceDetail, 
  VehicleEndOfDayInventory,
  OrderExchangeTrackingWithOrder,
  DailyReconciliationWithDetails
} from '../types/cylinderExchange';

export class CylinderExchangeRepository {
  private pool: sql.ConnectionPool;

  constructor(pool: sql.ConnectionPool) {
    this.pool = pool;
  }

  // Order Exchange Tracking Operations
  async recordExchange(exchangeData: {
    order_id: number;
    delivery_transaction_id?: number;
    filled_delivered: number;
    empty_collected: number;
    expected_empty: number;
    variance_qty: number;
    variance_type: string;
    variance_reason?: string;
    customer_acknowledged: boolean;
    acknowledged_by?: number;
    notes?: string;
  }): Promise<number> {
    const request = this.pool.request();

    // Create a temporary table to hold the output
    const outputTable = new sql.Table('#OutputTable');
    outputTable.columns.add('exchange_id', sql.BigInt);

    const result = await request
      .input('order_id', sql.BigInt, exchangeData.order_id)
      .input('delivery_transaction_id', sql.BigInt, exchangeData.delivery_transaction_id)
      .input('filled_delivered', sql.Int, exchangeData.filled_delivered)
      .input('empty_collected', sql.Int, exchangeData.empty_collected)
      .input('expected_empty', sql.Int, exchangeData.expected_empty)
      .input('variance_qty', sql.Int, exchangeData.variance_qty)
      .input('variance_type', sql.VarChar, exchangeData.variance_type)
      .input('variance_reason', sql.VarChar, exchangeData.variance_reason)
      .input('customer_acknowledged', sql.Bit, exchangeData.customer_acknowledged)
      .input('acknowledged_by', sql.Int, exchangeData.acknowledged_by)
      .input('notes', sql.VarChar, exchangeData.notes)
      .query(`
        DECLARE @OutputTable TABLE (exchange_id BIGINT);
        
        INSERT INTO ORDER_EXCHANGE_TRACKING (
          order_id, delivery_transaction_id, filled_delivered, empty_collected,
          expected_empty, variance_qty, variance_type, variance_reason,
          customer_acknowledged, acknowledged_by, notes
        )
        OUTPUT INSERTED.exchange_id INTO @OutputTable(exchange_id)
        VALUES (
          @order_id, @delivery_transaction_id, @filled_delivered, @empty_collected,
          @expected_empty, @variance_qty, @variance_type, @variance_reason,
          @customer_acknowledged, @acknowledged_by, @notes
        );
        
        SELECT exchange_id FROM @OutputTable;
      `);

    return result.recordset[0].exchange_id;
  }

  async getExchangeTracking(filters?: {
    plan_id?: number;
    order_id?: number;
    variance_type?: string;
    date_from?: Date;
    date_to?: Date;
    customer_id?: number;
  }): Promise<OrderExchangeTracking[]> {
    let query = `
      SELECT oet.* FROM ORDER_EXCHANGE_TRACKING oet
      INNER JOIN DELIVERY_ORDER do ON oet.order_id = do.order_id
      WHERE 1=1
    `;
    const request = this.pool.request();

    if (filters?.plan_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM DELIVERY_PLAN_ORDER dpo 
        WHERE dpo.order_id = oet.order_id AND dpo.plan_id = @plan_id
      )`;
      request.input('plan_id', sql.BigInt, filters.plan_id);
    }

    if (filters?.order_id) {
      query += ' AND oet.order_id = @order_id';
      request.input('order_id', sql.BigInt, filters.order_id);
    }

    if (filters?.variance_type) {
      query += ' AND oet.variance_type = @variance_type';
      request.input('variance_type', sql.VarChar, filters.variance_type);
    }

    if (filters?.date_from) {
      query += ' AND oet.created_at >= @date_from';
      request.input('date_from', sql.DateTime, filters.date_from);
    }

    if (filters?.date_to) {
      query += ' AND oet.created_at <= @date_to';
      request.input('date_to', sql.DateTime, filters.date_to);
    }

    if (filters?.customer_id) {
      query += ' AND do.customer_id = @customer_id';
      request.input('customer_id', sql.Int, filters.customer_id);
    }

    query += ' ORDER BY oet.created_at DESC';

    const result = await request.query(query);
    return result.recordset;
  }

  async getExchangeTrackingWithOrder(exchangeId: number): Promise<OrderExchangeTrackingWithOrder | null> {
    const request = this.pool.request();
    request.input('exchange_id', sql.BigInt, exchangeId);

    const result = await request.query(`
      SELECT oet.* FROM ORDER_EXCHANGE_TRACKING oet WHERE oet.exchange_id = @exchange_id;
      SELECT do.* FROM DELIVERY_ORDER do 
      INNER JOIN ORDER_EXCHANGE_TRACKING oet ON do.order_id = oet.order_id 
      WHERE oet.exchange_id = @exchange_id;
      SELECT dol.* FROM DELIVERY_ORDER_LINE dol 
      INNER JOIN ORDER_EXCHANGE_TRACKING oet ON dol.order_id = oet.order_id 
      WHERE oet.exchange_id = @exchange_id;
    `);

    const recordsets = result.recordsets as any[];
    if (recordsets[0].length === 0) return null;

    return {
      ...recordsets[0][0],
      order: recordsets[1][0],
      order_lines: recordsets[2]
    };
  }

  async updateExchangeAcknowledgment(exchangeId: number, acknowledgedBy: number): Promise<void> {
    const request = this.pool.request();

    await request
      .input('exchange_id', sql.BigInt, exchangeId)
      .input('acknowledged_by', sql.Int, acknowledgedBy)
      .query(`
        UPDATE ORDER_EXCHANGE_TRACKING
        SET customer_acknowledged = 1,
            acknowledged_by = @acknowledged_by,
            acknowledged_at = GETDATE(),
            updated_at = GETDATE()
        WHERE exchange_id = @exchange_id
      `);
  }

  // Daily Reconciliation Operations
  async createDailyReconciliation(reconciliationData: {
    plan_id: number;
    reconciliation_date: Date;
    reconciliation_time: Date;
    reconciled_by: number;
    reconciliation_notes?: string;
  }): Promise<number> {
    const request = this.pool.request();

    const result = await request
      .input('plan_id', sql.BigInt, reconciliationData.plan_id)
      .input('reconciliation_date', sql.Date, reconciliationData.reconciliation_date)
      .input('reconciliation_time', sql.Time, reconciliationData.reconciliation_time)
      .input('reconciled_by', sql.Int, reconciliationData.reconciled_by)
      .input('reconciliation_notes', sql.VarChar, reconciliationData.reconciliation_notes)
      .query(`
        DECLARE @OutputTable TABLE (reconciliation_id BIGINT);
        
        INSERT INTO DAILY_RECONCILIATION (
          plan_id, reconciliation_date, reconciliation_time, reconciled_by, reconciliation_notes
        )
        OUTPUT INSERTED.reconciliation_id INTO @OutputTable(reconciliation_id)
        VALUES (
          @plan_id, @reconciliation_date, @reconciliation_time, @reconciled_by, @reconciliation_notes
        );
        
        SELECT reconciliation_id FROM @OutputTable;
      `);

    return result.recordset[0].reconciliation_id;
  }

  async getDailyReconciliations(filters?: {
    plan_id?: number;
    date_from?: Date;
    date_to?: Date;
    status?: string;
    reconciled_by?: number;
  }): Promise<DailyReconciliation[]> {
    let query = `SELECT * FROM DAILY_RECONCILIATION WHERE 1=1`;
    const request = this.pool.request();

    if (filters?.plan_id) {
      query += ' AND plan_id = @plan_id';
      request.input('plan_id', sql.BigInt, filters.plan_id);
    }

    if (filters?.date_from) {
      query += ' AND reconciliation_date >= @date_from';
      request.input('date_from', sql.Date, filters.date_from);
    }

    if (filters?.date_to) {
      query += ' AND reconciliation_date <= @date_to';
      request.input('date_to', sql.Date, filters.date_to);
    }

    if (filters?.status) {
      query += ' AND status = @status';
      request.input('status', sql.VarChar, filters.status);
    }

    if (filters?.reconciled_by) {
      query += ' AND reconciled_by = @reconciled_by';
      request.input('reconciled_by', sql.Int, filters.reconciled_by);
    }

    query += ' ORDER BY reconciliation_date DESC, reconciliation_time DESC';

    const result = await request.query(query);
    return result.recordset;
  }

  async getDailyReconciliationWithDetails(reconciliationId: number): Promise<DailyReconciliationWithDetails | null> {
    const request = this.pool.request();
    request.input('reconciliation_id', sql.BigInt, reconciliationId);

    const result = await request.query(`
      SELECT dr.* FROM DAILY_RECONCILIATION dr WHERE dr.reconciliation_id = @reconciliation_id;
      SELECT evd.* FROM EXCHANGE_VARIANCE_DETAIL evd WHERE evd.reconciliation_id = @reconciliation_id;
      SELECT vei.* FROM VEHICLE_END_OF_DAY_INVENTORY vei WHERE vei.plan_id = (
        SELECT plan_id FROM DAILY_RECONCILIATION WHERE reconciliation_id = @reconciliation_id
      );
    `);

    const recordsets = result.recordsets as any[];
    if (recordsets[0].length === 0) return null;

    return {
      ...recordsets[0][0],
      variance_details: recordsets[1],
      vehicle_inventory: recordsets[2]
    };
  }

  async updateVarianceResolution(varianceDetailId: number, resolutionStatus: string, resolutionNotes?: string): Promise<void> {
    const request = this.pool.request();

    await request
      .input('variance_detail_id', sql.BigInt, varianceDetailId)
      .input('resolution_status', sql.VarChar, resolutionStatus)
      .input('resolution_notes', sql.VarChar, resolutionNotes)
      .query(`
        UPDATE EXCHANGE_VARIANCE_DETAIL
        SET resolution_status = @resolution_status,
            resolution_notes = @resolution_notes,
            created_at = GETDATE()
        WHERE variance_detail_id = @variance_detail_id
      `);
  }

  // Vehicle Inventory Operations
  async countVehicleInventory(inventoryData: Array<{
    plan_id: number;
    cylinder_type_id: number;
    cylinder_description: string;
    expected_remaining: number;
    actual_remaining: number;
    variance: number;
    variance_reason?: string;
    counted_by: number;
  }>): Promise<void> {
    const table = new sql.Table('VehicleEndOfDayInventoryType');
    table.columns.add('plan_id', sql.BigInt);
    table.columns.add('cylinder_type_id', sql.Int);
    table.columns.add('cylinder_description', sql.VarChar(100));
    table.columns.add('expected_remaining', sql.Int);
    table.columns.add('actual_remaining', sql.Int);
    table.columns.add('variance', sql.Int);
    table.columns.add('variance_reason', sql.VarChar(100));
    table.columns.add('counted_by', sql.Int);

    inventoryData.forEach(item => {
      table.rows.add(
        item.plan_id,
        item.cylinder_type_id,
        item.cylinder_description,
        item.expected_remaining,
        item.actual_remaining,
        item.variance,
        item.variance_reason,
        item.counted_by
      );
    });

    const request = this.pool.request();
    request.input('inventory_data', table);

    await request.execute('sp_count_vehicle_inventory');
  }

  async getVehicleInventory(planId: number): Promise<VehicleEndOfDayInventory[]> {
    const request = this.pool.request();
    request.input('plan_id', sql.BigInt, planId);

    const result = await request.query(`
      SELECT * FROM VEHICLE_END_OF_DAY_INVENTORY 
      WHERE plan_id = @plan_id 
      ORDER BY cylinder_type_id
    `);

    return result.recordset;
  }

  // Summary Operations
  async getExchangeSummary(planId: number): Promise<{
    total_orders: number;
    total_exchanges: number;
    total_shortages: number;
    total_excess: number;
    total_damage: number;
    shortage_value: number;
    excess_value: number;
    damage_value: number;
    net_variance_value: number;
    pending_acknowledgments: number;
  }> {
    const request = this.pool.request();
    request.input('plan_id', sql.BigInt, planId);

    const result = await request.execute('sp_get_exchange_summary');
    return result.recordset[0];
  }

  async getExchangeVarianceSummary(planId: number): Promise<Array<{
    customer_id: number;
    customer_name: string;
    total_shortages: number;
    total_excess: number;
    total_damage: number;
    shortage_value: number;
    excess_value: number;
    damage_value: number;
    net_value: number;
    pending_resolutions: number;
  }>> {
    const request = this.pool.request();
    request.input('plan_id', sql.BigInt, planId);

    const result = await request.execute('sp_get_exchange_variance_summary');
    return result.recordset;
  }

  // Update operations
  async approveReconciliation(reconciliationId: number, approvedBy: number): Promise<void> {
    const request = this.pool.request();

    await request
      .input('reconciliation_id', sql.BigInt, reconciliationId)
      .input('approved_by', sql.Int, approvedBy)
      .query(`
        UPDATE DAILY_RECONCILIATION
        SET status = 'APPROVED',
            approved_by = @approved_by,
            approved_at = GETDATE(),
            updated_at = GETDATE()
        WHERE reconciliation_id = @reconciliation_id
      `);
  }

  async updateReconciliationStatus(reconciliationId: number, status: string, updatedBy: number): Promise<void> {
    const request = this.pool.request();

    await request
      .input('reconciliation_id', sql.BigInt, reconciliationId)
      .input('status', sql.VarChar, status)
      .input('updated_by', sql.Int, updatedBy)
      .query(`
        UPDATE DAILY_RECONCILIATION
        SET status = @status,
            updated_at = GETDATE()
        WHERE reconciliation_id = @reconciliation_id
      `);
  }
}