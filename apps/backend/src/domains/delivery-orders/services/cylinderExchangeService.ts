import { CylinderExchangeRepository } from '../repositories/cylinderExchangeRepository';
import sql from 'mssql';
import { connectDB } from '../../../shared/config/database';
import {
  OrderExchangeTracking,
  DailyReconciliation,
  ExchangeVarianceDetail,
  VehicleEndOfDayInventory,
  RecordExchangeRequest,
  CreateDailyReconciliationRequest,
  UpdateVarianceResolutionRequest,
  CountVehicleInventoryRequest,
  ExchangeTrackingFilters,
  DailyReconciliationFilters,
  ExchangeSummary,
  ExchangeVarianceSummary,
  OrderExchangeTrackingWithOrder,
  DailyReconciliationWithDetails
} from '../types/cylinderExchange';

export class CylinderExchangeService {
  private repository: CylinderExchangeRepository;

  constructor() {
    this.repository = new CylinderExchangeRepository(connectDB as any);
  }

  // Initialize with pool
  async initialize(pool: sql.ConnectionPool) {
    this.repository = new CylinderExchangeRepository(pool);
  }

  // Order Exchange Tracking
  async recordExchange(exchangeData: RecordExchangeRequest): Promise<number> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      // Calculate variance
      const varianceQty = exchangeData.empty_collected - exchangeData.expected_empty;
      const varianceType = varianceQty === 0 ? 'MATCH' : (varianceQty < 0 ? 'SHORTAGE' : 'EXCESS');

      return await this.repository.recordExchange({
        order_id: exchangeData.order_id,
        delivery_transaction_id: exchangeData.delivery_transaction_id,
        filled_delivered: exchangeData.filled_delivered,
        empty_collected: exchangeData.empty_collected,
        expected_empty: exchangeData.expected_empty,
        variance_qty: varianceQty,
        variance_type: varianceType,
        variance_reason: exchangeData.variance_reason,
        customer_acknowledged: exchangeData.customer_acknowledged,
        acknowledged_by: exchangeData.acknowledged_by,
        notes: exchangeData.notes
      });

    } catch (error) {
      console.error('Error recording exchange:', error);
      throw error;
    }
  }

  async getExchangeTracking(filters?: ExchangeTrackingFilters): Promise<OrderExchangeTracking[]> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getExchangeTracking({
      plan_id: filters?.plan_id,
      order_id: filters?.order_id,
      variance_type: filters?.variance_type,
      date_from: filters?.date_from ? new Date(filters.date_from) : undefined,
      date_to: filters?.date_to ? new Date(filters.date_to) : undefined,
      customer_id: filters?.customer_id
    });
  }

  async getExchangeTrackingWithOrder(exchangeId: number): Promise<OrderExchangeTrackingWithOrder | null> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getExchangeTrackingWithOrder(exchangeId);
  }

  async updateExchangeAcknowledgment(exchangeId: number, acknowledgedBy: number): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    await this.repository.updateExchangeAcknowledgment(exchangeId, acknowledgedBy);
  }

  // Daily Reconciliation
  async createDailyReconciliation(reconciliationData: CreateDailyReconciliationRequest): Promise<number> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      const reconciliationId = await this.repository.createDailyReconciliation({
        plan_id: reconciliationData.plan_id,
        reconciliation_date: new Date(),
        reconciliation_time: new Date(),
        reconciled_by: reconciliationData.reconciled_by,
        reconciliation_notes: reconciliationData.reconciliation_notes
      });

      // Create variance details based on exchange tracking
      await this.createVarianceDetails(reconciliationId, reconciliationData.plan_id);

      return reconciliationId;

    } catch (error) {
      console.error('Error creating daily reconciliation:', error);
      throw error;
    }
  }

  async createVarianceDetails(reconciliationId: number, planId: number): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      // Get exchange tracking data for the plan
      const exchangeTracking = await this.repository.getExchangeTracking({ plan_id: planId });

      // Group by order to create variance details
      const varianceMap = new Map<string, any>();

      for (const exchange of exchangeTracking) {
        const key = `${exchange.order_id}`;
        
        if (!varianceMap.has(key)) {
          varianceMap.set(key, {
            customer_id: 0, // Will be populated from order data
            customer_name: '', // Will be populated from order data
            shortages: 0,
            excess: 0,
            damage: 0,
            shortage_value: 0,
            excess_value: 0,
            damage_value: 0
          });
        }

        const varianceData = varianceMap.get(key);
        if (exchange.variance_type === 'SHORTAGE') {
          varianceData.shortages += Math.abs(exchange.variance_qty);
          // Note: We'll need to fetch order details to calculate values
        } else if (exchange.variance_type === 'EXCESS') {
          varianceData.excess += exchange.variance_qty;
          // Note: We'll need to fetch order details to calculate values
        }
      }

      // Create variance details records
      for (const [key, data] of varianceMap.entries()) {
        if (data.shortages > 0 || data.excess > 0) {
          await this.createVarianceDetail(reconciliationId, {
            customer_id: data.customer_id,
            customer_name: data.customer_name,
            cylinder_type_id: 0, // TODO: Get from order lines
            cylinder_description: 'Mixed Cylinders', // TODO: Get from order lines
            variance_type: data.shortages > 0 ? 'SHORTAGE' : 'EXCESS',
            variance_quantity: data.shortages > 0 ? data.shortages : data.excess,
            unit_value: 0, // TODO: Calculate average unit value
            total_value: data.shortages > 0 ? data.shortage_value : data.excess_value,
            variance_reason: 'Daily Reconciliation',
            resolution_status: 'PENDING',
            resolution_notes: ''
          });
        }
      }

    } catch (error) {
      console.error('Error creating variance details:', error);
      throw error;
    }
  }

  async createVarianceDetail(reconciliationId: number, varianceData: {
    customer_id: number;
    customer_name: string;
    cylinder_type_id: number;
    cylinder_description: string;
    variance_type: string;
    variance_quantity: number;
    unit_value: number;
    total_value: number;
    variance_reason?: string;
    resolution_status: string;
    resolution_notes?: string;
  }): Promise<number> {
    const pool = await connectDB();
    await this.initialize(pool);

    const request = pool.request();
    const result = await request
      .input('reconciliation_id', sql.BigInt, reconciliationId)
      .input('customer_id', sql.Int, varianceData.customer_id)
      .input('customer_name', sql.VarChar, varianceData.customer_name)
      .input('cylinder_type_id', sql.Int, varianceData.cylinder_type_id)
      .input('cylinder_description', sql.VarChar, varianceData.cylinder_description)
      .input('variance_type', sql.VarChar, varianceData.variance_type)
      .input('variance_quantity', sql.Int, varianceData.variance_quantity)
      .input('unit_value', sql.Decimal(10, 2), varianceData.unit_value)
      .input('total_value', sql.Decimal(12, 2), varianceData.total_value)
      .input('variance_reason', sql.VarChar, varianceData.variance_reason)
      .input('resolution_status', sql.VarChar, varianceData.resolution_status)
      .input('resolution_notes', sql.VarChar, varianceData.resolution_notes)
      .query(`
        DECLARE @OutputTable TABLE (variance_detail_id BIGINT);
        
        INSERT INTO EXCHANGE_VARIANCE_DETAIL (
          reconciliation_id, customer_id, customer_name, cylinder_type_id, cylinder_description,
          variance_type, variance_quantity, unit_value, total_value, variance_reason,
          resolution_status, resolution_notes
        )
        OUTPUT INSERTED.variance_detail_id INTO @OutputTable(variance_detail_id)
        VALUES (
          @reconciliation_id, @customer_id, @customer_name, @cylinder_type_id, @cylinder_description,
          @variance_type, @variance_quantity, @unit_value, @total_value, @variance_reason,
          @resolution_status, @resolution_notes
        );
        
        SELECT variance_detail_id FROM @OutputTable;
      `);

    return result.recordset[0].variance_detail_id;
  }

  async getDailyReconciliations(filters?: DailyReconciliationFilters): Promise<DailyReconciliation[]> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getDailyReconciliations({
      plan_id: filters?.plan_id,
      date_from: filters?.date_from ? new Date(filters.date_from) : undefined,
      date_to: filters?.date_to ? new Date(filters.date_to) : undefined,
      status: filters?.status,
      reconciled_by: filters?.reconciled_by
    });
  }

  async getDailyReconciliationWithDetails(reconciliationId: number): Promise<DailyReconciliationWithDetails | null> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getDailyReconciliationWithDetails(reconciliationId);
  }

  async updateVarianceResolution(resolutionData: UpdateVarianceResolutionRequest): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    await this.repository.updateVarianceResolution(resolutionData.variance_detail_id, resolutionData.resolution_status, resolutionData.resolution_notes);
  }

  // Vehicle Inventory
  async countVehicleInventory(inventoryData: CountVehicleInventoryRequest): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    try {
      // Calculate expected remaining based on deliveries
      const planId = inventoryData.plan_id;
      const exchangeTracking = await this.repository.getExchangeTracking({ plan_id: planId });

      const inventoryItems = inventoryData.inventory_items.map(item => {
        const expectedRemaining = this.calculateExpectedRemaining(item.cylinder_type_id, exchangeTracking);
        const variance = item.actual_remaining - expectedRemaining;

        return {
          plan_id: planId,
          cylinder_type_id: item.cylinder_type_id,
          cylinder_description: `Cylinder Type ${item.cylinder_type_id}`,
          expected_remaining: expectedRemaining,
          actual_remaining: item.actual_remaining,
          variance: variance,
          variance_reason: item.variance_reason,
          counted_by: item.counted_by
        };
      });

      await this.repository.countVehicleInventory(inventoryItems);

    } catch (error) {
      console.error('Error counting vehicle inventory:', error);
      throw error;
    }
  }

  private calculateExpectedRemaining(cylinderTypeId: number, exchangeTracking: OrderExchangeTracking[]): number {
    // Calculate expected remaining based on initial load minus delivered
    // This is a simplified calculation - in reality, you'd track initial load
    let expectedRemaining = 0;

    for (const exchange of exchangeTracking) {
      // Simplified calculation since order_lines is not available
      expectedRemaining += exchange.filled_delivered - exchange.empty_collected;
    }

    return expectedRemaining;
  }

  async getVehicleInventory(planId: number): Promise<VehicleEndOfDayInventory[]> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getVehicleInventory(planId);
  }

  // Summary and Reporting
  async getExchangeSummary(planId: number): Promise<ExchangeSummary> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getExchangeSummary(planId);
  }

  async getExchangeVarianceSummary(planId: number): Promise<ExchangeVarianceSummary[]> {
    const pool = await connectDB();
    await this.initialize(pool);

    return await this.repository.getExchangeVarianceSummary(planId);
  }

  // Approval and Status Updates
  async approveReconciliation(reconciliationId: number, approvedBy: number): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    await this.repository.approveReconciliation(reconciliationId, approvedBy);
  }

  async updateReconciliationStatus(reconciliationId: number, status: string, updatedBy: number): Promise<void> {
    const pool = await connectDB();
    await this.initialize(pool);

    await this.repository.updateReconciliationStatus(reconciliationId, status, updatedBy);
  }
}