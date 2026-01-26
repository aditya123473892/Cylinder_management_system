import { DeliveryOrderRepository } from '../repositories/deliveryOrderRepository';
import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import {
  CreateDeliveryOrderRequest,
  CreateDeliveryPlanRequest,
  DeliveryOrderWithLines,
  DeliveryDashboardData,
  UserPendingTasks,
  LoadingLineRequest,
  ReconciliationLineRequest
} from '../types/deliveryOrder';

export class DeliveryOrderService {
  private repository: DeliveryOrderRepository;

  constructor() {
    this.repository = new DeliveryOrderRepository(connectDB as any);
  }

  // Initialize with pool
  async initialize(pool: sql.ConnectionPool) {
    this.repository = new DeliveryOrderRepository(pool);
  }

  // Delivery Order Management
  async createDeliveryOrder(request: CreateDeliveryOrderRequest): Promise<number> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      // Create table-valued parameter for order lines
      const orderLinesTable = new sql.Table('DeliveryOrderLineType');
      orderLinesTable.columns.add('cylinder_type_id', sql.Int);
      orderLinesTable.columns.add('cylinder_description', sql.VarChar(100));
      orderLinesTable.columns.add('ordered_qty', sql.Int);
      orderLinesTable.columns.add('rate_applied', sql.Decimal(10, 2));

      // Get cylinder details and populate table
      for (const line of request.lines) {
        const cylinderResult = await pool.request()
          .input('cylinder_type_id', sql.Int, line.cylinder_type_id)
          .query('SELECT Capacity FROM CYLINDER_TYPE_MASTER WHERE CylinderTypeId = @cylinder_type_id');

        if (cylinderResult.recordset.length === 0) {
          throw new Error(`Cylinder type ${line.cylinder_type_id} not found`);
        }

        orderLinesTable.rows.add(
          line.cylinder_type_id,
          cylinderResult.recordset[0].Capacity,
          line.ordered_qty,
          line.rate_applied
        );
      }

      // Call stored procedure
      const result = await pool.request()
        .input('order_number', sql.VarChar(50), request.order_number)
        .input('customer_id', sql.Int, request.customer_id)
        .input('location_id', sql.Int, request.location_id)
        .input('rate_contract_id', sql.Int, request.rate_contract_id)
        .input('order_date', sql.Date, new Date(request.order_date))
        .input('requested_delivery_date', sql.Date, new Date(request.requested_delivery_date))
        .input('requested_delivery_time', sql.Time, request.requested_delivery_time && request.requested_delivery_time.trim() !== '' ? request.requested_delivery_time : null)
        .input('priority', sql.VarChar(20), request.priority)
        .input('special_instructions', sql.VarChar(500), request.special_instructions || null)
        .input('created_by', sql.Int, request.created_by)
        .input('order_lines', orderLinesTable)
        .execute('sp_create_delivery_order');

      return result.recordset[0].order_id;

    } catch (error) {
      console.error('Error creating delivery order:', error);
      throw error;
    }
  }

  async getDeliveryOrders(filters?: {
    customer_id?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
  }) {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getDeliveryOrders({
      customer_id: filters?.customer_id,
      status: filters?.status,
      date_from: filters?.date_from ? new Date(filters.date_from) : undefined,
      date_to: filters?.date_to ? new Date(filters.date_to) : undefined
    });
  }

  async getDeliveryOrderWithLines(orderId: number): Promise<DeliveryOrderWithLines | null> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getDeliveryOrderWithLines(orderId);
  }

  // Delivery Planning
  async createDeliveryPlan(request: CreateDeliveryPlanRequest): Promise<number> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      await pool.query('BEGIN TRANSACTION');

      // Validate vehicle and driver availability
      const vehicleCheck = await pool.request()
        .input('vehicle_id', sql.Int, request.vehicle_id)
        .input('plan_date', sql.Date, new Date(request.plan_date))
        .query('SELECT COUNT(*) as count FROM DELIVERY_PLAN WHERE vehicle_id = @vehicle_id AND plan_date = @plan_date');

      if (vehicleCheck.recordset[0].count > 0) {
        throw new Error('Vehicle already has a plan for this date');
      }

      const driverCheck = await pool.request()
        .input('driver_id', sql.Int, request.driver_id)
        .input('plan_date', sql.Date, new Date(request.plan_date))
        .query('SELECT COUNT(*) as count FROM DELIVERY_PLAN WHERE driver_id = @driver_id AND plan_date = @plan_date');

      if (driverCheck.recordset[0].count > 0) {
        throw new Error('Driver already has a plan for this date');
      }

      // Validate orders exist and are in correct status
      for (const order of request.orders) {
        const orderCheck = await pool.request()
          .input('order_id', sql.BigInt, order.order_id)
          .query('SELECT order_status FROM DELIVERY_ORDER WHERE order_id = @order_id');

        if (orderCheck.recordset.length === 0) {
          throw new Error(`Order ${order.order_id} not found`);
        }

        if (!['PENDING', 'CONFIRMED'].includes(orderCheck.recordset[0].order_status)) {
          throw new Error(`Order ${order.order_id} is not in a plannable status`);
        }
      }

      // Create delivery plan
      const planId = await this.repository.createDeliveryPlan({
        plan_date: new Date(request.plan_date),
        vehicle_id: request.vehicle_id,
        driver_id: request.driver_id,
        planned_departure_time: request.planned_departure_time ? new Date(request.planned_departure_time) : undefined,
        planned_return_time: request.planned_return_time ? new Date(request.planned_return_time) : undefined,
        notes: request.notes,
        created_by: request.created_by
      });

      // Assign orders to plan
      await this.repository.assignOrdersToPlan(planId, request.orders.map(order => ({
        order_id: order.order_id,
        sequence_number: order.sequence_number,
        planned_delivery_time: order.planned_delivery_time ? new Date(order.planned_delivery_time) : undefined
      })));

      await pool.query('COMMIT TRANSACTION');
      return planId;

    } catch (error) {
      await pool.query('ROLLBACK TRANSACTION');
      throw error;
    }
  }

  async getDeliveryPlans(filters?: {
    date_from?: string;
    date_to?: string;
    status?: string;
    vehicle_id?: number;
  }) {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getDeliveryPlans({
      date_from: filters?.date_from ? new Date(filters.date_from) : undefined,
      date_to: filters?.date_to ? new Date(filters.date_to) : undefined,
      status: filters?.status,
      vehicle_id: filters?.vehicle_id
    });
  }

  // Loading Process
  async startLoading(planId: number, loadedBy: number, supervisorId?: number): Promise<number> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      await pool.query('BEGIN TRANSACTION');

      // Validate plan exists and is in correct status
      const planCheck = await pool.request()
        .input('plan_id', sql.BigInt, planId)
        .query('SELECT plan_status FROM DELIVERY_PLAN WHERE plan_id = @plan_id');

      if (planCheck.recordset.length === 0) {
        throw new Error('Delivery plan not found');
      }

      if (planCheck.recordset[0].plan_status !== 'CONFIRMED') {
        throw new Error('Plan must be in CONFIRMED status to start loading');
      }

      // Create loading transaction
      const loadingId = await this.repository.createLoadingTransaction(planId, loadedBy, supervisorId);

      // Update plan status
      await this.repository.updatePlanStatus(planId, 'LOADING', loadedBy);

      // Update order statuses
      await pool.request()
        .input('plan_id', sql.BigInt, planId)
        .input('updated_by', sql.Int, loadedBy)
        .query(`
          UPDATE do
          SET do.order_status = 'LOADED',
              do.updated_by = @updated_by,
              do.updated_at = GETDATE()
          FROM DELIVERY_ORDER do
          INNER JOIN DELIVERY_PLAN_ORDER dpo ON do.order_id = dpo.order_id
          WHERE dpo.plan_id = @plan_id
        `);

      await pool.query('COMMIT TRANSACTION');
      return loadingId;

    } catch (error) {
      await pool.query('ROLLBACK TRANSACTION');
      throw error;
    }
  }

  async completeLoading(loadingId: number, loadingLines: LoadingLineRequest[], notes?: string): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      await pool.query('BEGIN TRANSACTION');

      // Get plan ID
      const loadingCheck = await pool.request()
        .input('loading_id', sql.BigInt, loadingId)
        .query('SELECT plan_id FROM LOADING_TRANSACTION WHERE loading_id = @loading_id');

      if (loadingCheck.recordset.length === 0) {
        throw new Error('Loading transaction not found');
      }

      const planId = loadingCheck.recordset[0].plan_id;

      // Process loading lines (this would call the stored procedure)
      // For now, we'll update the status
      await this.repository.updateLoadingStatus(loadingId, 'COMPLETED', notes);

      // Update plan status
      await this.repository.updatePlanStatus(planId, 'LOADED', 0); // TODO: Get user from context

      await pool.query('COMMIT TRANSACTION');

    } catch (error) {
      await pool.query('ROLLBACK TRANSACTION');
      throw error;
    }
  }

  // Delivery Execution
  async recordDeliveryExecution(planId: number, orderId: number, deliveryTransactionId: number, actualDeliveryTime?: string): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      await pool.query('BEGIN TRANSACTION');

      // Validate delivery transaction exists and is linked to order
      const deliveryCheck = await pool.request()
        .input('delivery_id', sql.BigInt, deliveryTransactionId)
        .input('order_id', sql.BigInt, orderId)
        .query('SELECT delivery_id FROM DELIVERY_TRANSACTION WHERE delivery_id = @delivery_id AND order_id = @order_id');

      if (deliveryCheck.recordset.length === 0) {
        throw new Error('Delivery transaction not found or not linked to order');
      }

      // Update plan order status
      await pool.request()
        .input('plan_id', sql.BigInt, planId)
        .input('order_id', sql.BigInt, orderId)
        .input('actual_delivery_time', sql.Time, actualDeliveryTime ? new Date(actualDeliveryTime) : null)
        .query(`
          UPDATE DELIVERY_PLAN_ORDER
          SET delivery_status = 'DELIVERED',
              actual_delivery_time = @actual_delivery_time
          WHERE plan_id = @plan_id AND order_id = @order_id
        `);

      // Update order status and quantities
      await pool.request()
        .input('order_id', sql.BigInt, orderId)
        .query(`
          UPDATE DELIVERY_ORDER
          SET order_status = 'DELIVERED',
              total_delivered_qty = total_loaded_qty,
              updated_at = GETDATE()
          WHERE order_id = @order_id
        `);

      // Update plan delivered count
      await pool.request()
        .input('plan_id', sql.BigInt, planId)
        .query(`
          UPDATE DELIVERY_PLAN
          SET total_delivered_orders = total_delivered_orders + 1,
              updated_at = GETDATE()
          WHERE plan_id = @plan_id
        `);

      await pool.query('COMMIT TRANSACTION');

    } catch (error) {
      await pool.query('ROLLBACK TRANSACTION');
      throw error;
    }
  }

  // Reconciliation
  async createReconciliation(planId: number, reconciledBy: number, reconciliationLines: ReconciliationLineRequest[]): Promise<number> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      await pool.query('BEGIN TRANSACTION');

      // Validate plan is completed
      const planCheck = await pool.request()
        .input('plan_id', sql.BigInt, planId)
        .query('SELECT plan_status FROM DELIVERY_PLAN WHERE plan_id = @plan_id');

      if (planCheck.recordset.length === 0 || planCheck.recordset[0].plan_status !== 'COMPLETED') {
        throw new Error('Plan not found or not completed');
      }

      // Check if reconciliation already exists
      const existingReconciliation = await pool.request()
        .input('plan_id', sql.BigInt, planId)
        .query('SELECT reconciliation_id FROM DELIVERY_RECONCILIATION WHERE plan_id = @plan_id');

      if (existingReconciliation.recordset.length > 0) {
        throw new Error('Reconciliation already exists for this plan');
      }

      // Create reconciliation (this would call the stored procedure)
      const reconciliationId = await this.repository.createReconciliation({
        plan_id: planId,
        reconciled_by: reconciledBy
      });

      await pool.query('COMMIT TRANSACTION');
      return reconciliationId;

    } catch (error) {
      await pool.query('ROLLBACK TRANSACTION');
      throw error;
    }
  }

  // Dashboard and Reporting
  async getDashboardData(dateFrom?: string, dateTo?: string): Promise<DeliveryDashboardData> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getDashboardData(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined
    );
  }

  async getUserPendingTasks(userId: number): Promise<UserPendingTasks[]> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getUserPendingTasks(userId);
  }

  // Status Updates
  async updateOrderStatus(orderId: number, status: string, updatedBy: number): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    await this.repository.updateOrderStatus(orderId, status, updatedBy);
  }

  async updatePlanStatus(planId: number, status: string, updatedBy: number): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    await this.repository.updatePlanStatus(planId, status, updatedBy);
  }
}
