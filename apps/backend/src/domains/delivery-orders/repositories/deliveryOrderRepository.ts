import sql from 'mssql';
import { DeliveryOrder, DeliveryOrderLine, DeliveryPlan, DeliveryPlanOrder, LoadingTransaction, LoadingTransactionLine, DeliveryReconciliation, DeliveryReconciliationLine, DeliveryOrderWithLines, DeliveryPlanWithOrders, DeliveryDashboardData, UserPendingTasks } from '../types/deliveryOrder';

export class DeliveryOrderRepository {
  private pool: sql.ConnectionPool;

  constructor(pool: sql.ConnectionPool) {
    this.pool = pool;
  }

  // Delivery Order Operations
  async createDeliveryOrder(orderData: {
    order_number: string;
    customer_id: number;
    customer_name: string;
    customer_type: string;
    location_id: number;
    location_name: string;
    rate_contract_id: number;
    order_date: Date;
    requested_delivery_date: Date;
    requested_delivery_time?: Date;
    priority: string;
    special_instructions?: string;
    total_ordered_qty: number;
    created_by: number;
  }): Promise<number> {
    const request = this.pool.request();

    const result = await request
      .input('order_number', sql.VarChar, orderData.order_number)
      .input('customer_id', sql.Int, orderData.customer_id)
      .input('customer_name', sql.VarChar, orderData.customer_name)
      .input('customer_type', sql.VarChar, orderData.customer_type)
      .input('location_id', sql.Int, orderData.location_id)
      .input('location_name', sql.VarChar, orderData.location_name)
      .input('rate_contract_id', sql.Int, orderData.rate_contract_id)
      .input('order_date', sql.Date, orderData.order_date)
      .input('requested_delivery_date', sql.Date, orderData.requested_delivery_date)
      .input('requested_delivery_time', sql.Time, orderData.requested_delivery_time)
      .input('priority', sql.VarChar, orderData.priority)
      .input('special_instructions', sql.VarChar, orderData.special_instructions)
      .input('total_ordered_qty', sql.Int, orderData.total_ordered_qty)
      .input('created_by', sql.Int, orderData.created_by)
      .query(`
        INSERT INTO DELIVERY_ORDER (
          order_number, customer_id, customer_name, customer_type, location_id, location_name,
          rate_contract_id, order_date, requested_delivery_date, requested_delivery_time,
          priority, special_instructions, total_ordered_qty, created_by
        )
        OUTPUT INSERTED.order_id
        VALUES (
          @order_number, @customer_id, @customer_name, @customer_type, @location_id, @location_name,
          @rate_contract_id, @order_date, @requested_delivery_date, @requested_delivery_time,
          @priority, @special_instructions, @total_ordered_qty, @created_by
        )
      `);

    return result.recordset[0].order_id;
  }

  async createDeliveryOrderLines(orderId: number, lines: Array<{
    cylinder_type_id: number;
    cylinder_description: string;
    ordered_qty: number;
    rate_applied: number;
  }>): Promise<void> {
    const table = new sql.Table('DeliveryOrderLineType');
    table.columns.add('cylinder_type_id', sql.Int);
    table.columns.add('cylinder_description', sql.VarChar(100));
    table.columns.add('ordered_qty', sql.Int);
    table.columns.add('rate_applied', sql.Decimal(10, 2));

    lines.forEach(line => {
      table.rows.add(line.cylinder_type_id, line.cylinder_description, line.ordered_qty, line.rate_applied);
    });

    const request = this.pool.request();
    request.input('order_id', sql.BigInt, orderId);
    request.input('order_lines', table);

    await request.execute('sp_create_delivery_order_lines');
  }

  async getDeliveryOrders(filters?: {
    customer_id?: number;
    status?: string;
    date_from?: Date;
    date_to?: Date;
  }): Promise<DeliveryOrder[]> {
    let query = `
      SELECT * FROM DELIVERY_ORDER
      WHERE 1=1
    `;
    const request = this.pool.request();

    if (filters?.customer_id) {
      query += ' AND customer_id = @customer_id';
      request.input('customer_id', sql.Int, filters.customer_id);
    }

    if (filters?.status) {
      query += ' AND order_status = @status';
      request.input('status', sql.VarChar, filters.status);
    }

    if (filters?.date_from) {
      query += ' AND requested_delivery_date >= @date_from';
      request.input('date_from', sql.Date, filters.date_from);
    }

    if (filters?.date_to) {
      query += ' AND requested_delivery_date <= @date_to';
      request.input('date_to', sql.Date, filters.date_to);
    }

    query += ' ORDER BY requested_delivery_date DESC, created_at DESC';

    const result = await request.query(query);
    return result.recordset;
  }

  async getDeliveryOrderWithLines(orderId: number): Promise<DeliveryOrderWithLines | null> {
    const request = this.pool.request();
    request.input('order_id', sql.BigInt, orderId);

    const result = await request.query(`
      SELECT * FROM DELIVERY_ORDER WHERE order_id = @order_id;
      SELECT * FROM DELIVERY_ORDER_LINE WHERE order_id = @order_id ORDER BY order_line_id;
    `);

    const recordsets = result.recordsets as any[];
    if (recordsets[0].length === 0) return null;

    return {
      ...recordsets[0][0],
      lines: recordsets[1]
    };
  }

  // Delivery Plan Operations
  async createDeliveryPlan(planData: {
    plan_date: Date;
    vehicle_id: number;
    driver_id: number;
    planned_departure_time?: Date;
    planned_return_time?: Date;
    notes?: string;
    created_by: number;
  }): Promise<number> {
    const request = this.pool.request();

    const result = await request
      .input('plan_date', sql.Date, planData.plan_date)
      .input('vehicle_id', sql.Int, planData.vehicle_id)
      .input('driver_id', sql.Int, planData.driver_id)
      .input('planned_departure_time', sql.Time, planData.planned_departure_time)
      .input('planned_return_time', sql.Time, planData.planned_return_time)
      .input('notes', sql.VarChar, planData.notes)
      .input('created_by', sql.Int, planData.created_by)
      .query(`
        INSERT INTO DELIVERY_PLAN (
          plan_date, vehicle_id, driver_id, planned_departure_time,
          planned_return_time, notes, created_by
        )
        OUTPUT INSERTED.plan_id
        VALUES (
          @plan_date, @vehicle_id, @driver_id, @planned_departure_time,
          @planned_return_time, @notes, @created_by
        )
      `);

    return result.recordset[0].plan_id;
  }

  async assignOrdersToPlan(planId: number, orders: Array<{
    order_id: number;
    sequence_number: number;
    planned_delivery_time?: Date;
  }>): Promise<void> {
    const table = new sql.Table('DeliveryPlanOrderType');
    table.columns.add('order_id', sql.BigInt);
    table.columns.add('sequence_number', sql.Int);
    table.columns.add('planned_delivery_time', sql.Time);

    orders.forEach(order => {
      table.rows.add(order.order_id, order.sequence_number, order.planned_delivery_time);
    });

    const request = this.pool.request();
    request.input('plan_id', sql.BigInt, planId);
    request.input('plan_orders', table);

    await request.execute('sp_assign_orders_to_plan');
  }

  async getDeliveryPlans(filters?: {
    date_from?: Date;
    date_to?: Date;
    status?: string;
    vehicle_id?: number;
  }): Promise<DeliveryPlan[]> {
    let query = `
      SELECT * FROM DELIVERY_PLAN
      WHERE 1=1
    `;
    const request = this.pool.request();

    if (filters?.date_from) {
      query += ' AND plan_date >= @date_from';
      request.input('date_from', sql.Date, filters.date_from);
    }

    if (filters?.date_to) {
      query += ' AND plan_date <= @date_to';
      request.input('date_to', sql.Date, filters.date_to);
    }

    if (filters?.status) {
      query += ' AND plan_status = @status';
      request.input('status', sql.VarChar, filters.status);
    }

    if (filters?.vehicle_id) {
      query += ' AND vehicle_id = @vehicle_id';
      request.input('vehicle_id', sql.Int, filters.vehicle_id);
    }

    query += ' ORDER BY plan_date DESC, created_at DESC';

    const result = await request.query(query);
    return result.recordset;
  }

  // Loading Operations
  async createLoadingTransaction(planId: number, loadedBy: number, supervisorId?: number): Promise<number> {
    const request = this.pool.request();

    const result = await request
      .input('plan_id', sql.BigInt, planId)
      .input('loaded_by', sql.Int, loadedBy)
      .input('supervisor_id', sql.Int, supervisorId)
      .query(`
        INSERT INTO LOADING_TRANSACTION (
          plan_id, loading_date, loading_time, loaded_by, supervisor_id
        )
        OUTPUT INSERTED.loading_id
        VALUES (
          @plan_id, CAST(GETDATE() AS DATE), CAST(GETDATE() AS TIME), @loaded_by, @supervisor_id
        )
      `);

    return result.recordset[0].loading_id;
  }

  async updateLoadingStatus(loadingId: number, status: string, notes?: string): Promise<void> {
    const request = this.pool.request();

    await request
      .input('loading_id', sql.BigInt, loadingId)
      .input('status', sql.VarChar, status)
      .input('notes', sql.VarChar, notes)
      .query(`
        UPDATE LOADING_TRANSACTION
        SET loading_status = @status,
            loading_notes = @notes,
            completed_at = CASE WHEN @status = 'COMPLETED' THEN GETDATE() ELSE completed_at END
        WHERE loading_id = @loading_id
      `);
  }

  // Reconciliation Operations
  async createReconciliation(reconciliationData: {
    plan_id: number;
    reconciled_by: number;
  }): Promise<number> {
    const request = this.pool.request();

    const result = await request
      .input('plan_id', sql.BigInt, reconciliationData.plan_id)
      .input('reconciled_by', sql.Int, reconciliationData.reconciled_by)
      .query(`
        INSERT INTO DELIVERY_RECONCILIATION (
          plan_id, reconciliation_date, reconciled_by
        )
        OUTPUT INSERTED.reconciliation_id
        VALUES (
          @plan_id, CAST(GETDATE() AS DATE), @reconciled_by
        )
      `);

    return result.recordset[0].reconciliation_id;
  }

  async getDashboardData(dateFrom?: Date, dateTo?: Date): Promise<DeliveryDashboardData> {
    const request = this.pool.request();

    if (dateFrom) request.input('date_from', sql.Date, dateFrom);
    if (dateTo) request.input('date_to', sql.Date, dateTo);

    const result = await request.execute('sp_get_delivery_dashboard');
    const recordsets = result.recordsets as any[];

    return {
      total_orders: recordsets[0][0]?.total_orders || 0,
      pending_orders: recordsets[0][0]?.pending_orders || 0,
      assigned_orders: recordsets[0][0]?.assigned_orders || 0,
      delivered_orders: recordsets[0][0]?.delivered_orders || 0,
      total_ordered_qty: recordsets[0][0]?.total_ordered_qty || 0,
      total_delivered_qty: recordsets[0][0]?.total_delivered_qty || 0,
      total_plans: recordsets[1][0]?.total_plans || 0,
      draft_plans: recordsets[1][0]?.draft_plans || 0,
      confirmed_plans: recordsets[1][0]?.confirmed_plans || 0,
      completed_plans: recordsets[1][0]?.completed_plans || 0,
      total_planned_orders: recordsets[1][0]?.total_planned_orders || 0,
      total_delivered_orders: recordsets[1][0]?.total_delivered_orders || 0,
      total_reconciliations: recordsets[2][0]?.total_reconciliations || 0,
      total_variances: recordsets[2][0]?.total_variances || 0,
      total_adjustments: recordsets[2][0]?.total_adjustments || 0,
      approved_reconciliations: recordsets[2][0]?.approved_reconciliations || 0,
    };
  }

  async getUserPendingTasks(userId: number): Promise<UserPendingTasks[]> {
    const request = this.pool.request();
    request.input('user_id', sql.Int, userId);

    const result = await request.execute('sp_get_user_pending_tasks');
    return result.recordset;
  }

  // Update operations
  async updateOrderStatus(orderId: number, status: string, updatedBy: number): Promise<void> {
    const request = this.pool.request();

    await request
      .input('order_id', sql.BigInt, orderId)
      .input('status', sql.VarChar, status)
      .input('updated_by', sql.Int, updatedBy)
      .query(`
        UPDATE DELIVERY_ORDER
        SET order_status = @status,
            updated_by = @updated_by,
            updated_at = GETDATE()
        WHERE order_id = @order_id
      `);
  }

  async updatePlanStatus(planId: number, status: string, updatedBy: number): Promise<void> {
    const request = this.pool.request();

    await request
      .input('plan_id', sql.BigInt, planId)
      .input('status', sql.VarChar, status)
      .input('updated_by', sql.Int, updatedBy)
      .query(`
        UPDATE DELIVERY_PLAN
        SET plan_status = @status,
            updated_by = @updated_by,
            updated_at = GETDATE()
        WHERE plan_id = @plan_id
      `);
  }

  async getOrderVehicleInfo(orderId: number): Promise<{ vehicle_id: number; vehicle_number: string } | null> {
    const request = this.pool.request();
    request.input('order_id', sql.BigInt, orderId);

    const result = await request.query(`
      SELECT 
        dp.vehicle_id,
        vm.vehicle_number
      FROM DELIVERY_PLAN_ORDER dpo
      INNER JOIN DELIVERY_PLAN dp ON dpo.plan_id = dp.plan_id
      INNER JOIN VEHICLE_MASTER vm ON dp.vehicle_id = vm.vehicle_id
      WHERE dpo.order_id = @order_id
    `);

    return result.recordset.length > 0 ? result.recordset[0] : null;
  }
}
