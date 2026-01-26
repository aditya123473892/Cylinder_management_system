import { DeliveryOrder, DeliveryOrderLine } from './deliveryOrder';

// Cylinder Exchange Tracking Types
export interface OrderExchangeTracking {
  exchange_id: number;
  order_id: number;
  delivery_transaction_id?: number;
  filled_delivered: number;
  empty_collected: number;
  expected_empty: number;
  variance_qty: number; // empty_collected - expected_empty
  variance_type: 'SHORTAGE' | 'EXCESS' | 'MATCH';
  variance_reason?: string;
  customer_acknowledged: boolean;
  acknowledged_by?: number;
  acknowledged_at?: Date;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DailyReconciliation {
  reconciliation_id: number;
  plan_id: number;
  reconciliation_date: Date;
  reconciliation_time: Date;
  total_orders: number;
  total_exchanges: number;
  total_shortages: number;
  total_excess: number;
  total_damage: number;
  shortage_value: number;
  excess_value: number;
  damage_value: number;
  net_variance_value: number;
  reconciled_by: number;
  approved_by?: number;
  approved_at?: Date;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';
  reconciliation_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ExchangeVarianceDetail {
  variance_detail_id: number;
  reconciliation_id: number;
  customer_id: number;
  customer_name: string;
  cylinder_type_id: number;
  cylinder_description: string;
  variance_type: 'SHORTAGE' | 'EXCESS' | 'DAMAGE';
  variance_quantity: number;
  unit_value: number;
  total_value: number;
  variance_reason?: string;
  resolution_status: 'PENDING' | 'RESOLVED' | 'ESCALATED';
  resolution_notes?: string;
  created_at: Date;
}

export interface VehicleEndOfDayInventory {
  inventory_id: number;
  plan_id: number;
  cylinder_type_id: number;
  cylinder_description: string;
  expected_remaining: number;
  actual_remaining: number;
  variance: number; // actual_remaining - expected_remaining
  variance_reason?: string;
  counted_by: number;
  counted_at: Date;
  created_at: Date;
}

// Extended interfaces with related data
export interface OrderExchangeTrackingWithOrder extends OrderExchangeTracking {
  order: DeliveryOrder;
  order_lines: DeliveryOrderLine[];
}

export interface DailyReconciliationWithDetails extends DailyReconciliation {
  variance_details: ExchangeVarianceDetail[];
  vehicle_inventory: VehicleEndOfDayInventory[];
}

// Request/Response interfaces
export interface RecordExchangeRequest {
  order_id: number;
  delivery_transaction_id?: number;
  filled_delivered: number;
  empty_collected: number;
  expected_empty: number;
  variance_reason?: string;
  customer_acknowledged: boolean;
  acknowledged_by?: number;
  notes?: string;
}

export interface CreateDailyReconciliationRequest {
  plan_id: number;
  reconciled_by: number;
  reconciliation_notes?: string;
}

export interface UpdateVarianceResolutionRequest {
  variance_detail_id: number;
  resolution_status: 'PENDING' | 'RESOLVED' | 'ESCALATED';
  resolution_notes?: string;
}

export interface CountVehicleInventoryRequest {
  plan_id: number;
  inventory_items: Array<{
    cylinder_type_id: number;
    actual_remaining: number;
    variance_reason?: string;
    counted_by: number;
  }>;
}

// Exchange summary interfaces
export interface ExchangeSummary {
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
}

export interface ExchangeVarianceSummary {
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
}

// Filter interfaces for API calls
export interface ExchangeTrackingFilters {
  plan_id?: number;
  order_id?: number;
  variance_type?: string;
  date_from?: string;
  date_to?: string;
  customer_id?: number;
}

export interface DailyReconciliationFilters {
  plan_id?: number;
  date_from?: string;
  date_to?: string;
  status?: string;
  reconciled_by?: number;
}

// Status and variance reason options for UI
export const VARIANCE_TYPES = [
  { value: 'SHORTAGE', label: 'Shortage', color: 'red' },
  { value: 'EXCESS', label: 'Excess', color: 'green' },
  { value: 'MATCH', label: 'Match', color: 'blue' },
  { value: 'DAMAGE', label: 'Damage', color: 'orange' }
] as const;

export const VARIANCE_REASONS = [
  { value: 'STOCK_SHORTAGE', label: 'Stock Shortage' },
  { value: 'CUSTOMER_REJECTED', label: 'Customer Rejected' },
  { value: 'DAMAGE', label: 'Damage' },
  { value: 'WRONG_TYPE', label: 'Wrong Type' },
  { value: 'CUSTOMER_NOT_AVAILABLE', label: 'Customer Not Available' },
  { value: 'PARTIAL_DELIVERY', label: 'Partial Delivery' },
  { value: 'OTHER', label: 'Other' }
] as const;

export const RESOLUTION_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'yellow' },
  { value: 'RESOLVED', label: 'Resolved', color: 'green' },
  { value: 'ESCALATED', label: 'Escalated', color: 'red' }
] as const;

export const RECONCILIATION_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'yellow' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'blue' },
  { value: 'COMPLETED', label: 'Completed', color: 'green' },
  { value: 'APPROVED', label: 'Approved', color: 'purple' }
] as const;