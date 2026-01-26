export interface DeliveryOrder {
  order_id: number;
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
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  order_status: 'PENDING' | 'CONFIRMED' | 'ASSIGNED' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  special_instructions?: string;
  total_ordered_qty: number;
  total_planned_qty: number;
  total_loaded_qty: number;
  total_delivered_qty: number;
  created_by: number;
  created_at: Date;
  updated_by?: number;
  updated_at: Date;
}

export interface DeliveryOrderLine {
  order_line_id: number;
  order_id: number;
  cylinder_type_id: number;
  cylinder_description: string;
  ordered_qty: number;
  planned_qty: number;
  loaded_qty: number;
  delivered_qty: number;
  rate_applied: number;
  line_amount: number;
}

export interface DeliveryPlan {
  plan_id: number;
  plan_date: Date;
  vehicle_id: number;
  driver_id: number;
  plan_status: 'DRAFT' | 'CONFIRMED' | 'LOADING' | 'LOADED' | 'DISPATCHED' | 'COMPLETED';
  planned_departure_time?: Date;
  actual_departure_time?: Date;
  planned_return_time?: Date;
  actual_return_time?: Date;
  total_planned_orders: number;
  total_loaded_orders: number;
  total_delivered_orders: number;
  notes?: string;
  created_by: number;
  created_at: Date;
  updated_by?: number;
  updated_at: Date;
}

export interface DeliveryPlanOrder {
  plan_order_id: number;
  plan_id: number;
  order_id: number;
  sequence_number: number;
  planned_delivery_time?: Date;
  actual_delivery_time?: Date;
  delivery_status: 'PLANNED' | 'LOADED' | 'DELIVERED' | 'PARTIAL' | 'CANCELLED';
  notes?: string;
}

export interface LoadingTransaction {
  loading_id: number;
  plan_id: number;
  loading_date: Date;
  loading_time: Date;
  loading_status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  loaded_by: number;
  supervisor_id?: number;
  total_loaded_qty: number;
  total_variances: number;
  loading_notes?: string;
  created_at: Date;
  completed_at?: Date;
}

export interface LoadingTransactionLine {
  loading_line_id: number;
  loading_id: number;
  order_id: number;
  cylinder_type_id: number;
  planned_qty: number;
  loaded_qty: number;
  variance_qty: number;
  variance_reason?: string;
  batch_number?: string;
  serial_numbers?: string;
}

export interface DeliveryReconciliation {
  reconciliation_id: number;
  plan_id: number;
  reconciliation_date: Date;
  reconciliation_status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';
  total_orders: number;
  total_delivered_orders: number;
  total_partial_deliveries: number;
  total_cancelled_orders: number;
  total_variances: number;
  inventory_adjustments: number;
  reconciled_by: number;
  approved_by?: number;
  approved_at?: Date;
  reconciliation_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface DeliveryReconciliationLine {
  reconciliation_line_id: number;
  reconciliation_id: number;
  order_id: number;
  cylinder_type_id: number;
  planned_qty: number;
  loaded_qty: number;
  delivered_qty: number;
  returned_qty: number;
  variance_qty: number;
  variance_reason?: string;
  inventory_adjustment: number;
  adjustment_reason?: string;
  resolution_status: 'PENDING' | 'RESOLVED' | 'ESCALATED';
  resolution_notes?: string;
}

// Request/Response interfaces
export interface CreateDeliveryOrderRequest {
  order_number: string;
  customer_id: number;
  location_id: number;
  rate_contract_id: number;
  order_date: string;
  requested_delivery_date: string;
  requested_delivery_time?: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  special_instructions?: string;
  created_by: number;
  lines: CreateDeliveryOrderLineRequest[];
}

export interface CreateDeliveryOrderLineRequest {
  cylinder_type_id: number;
  ordered_qty: number;
  rate_applied: number;
  cylinder_description?: string; // Added for internal use
}

export interface CreateDeliveryPlanRequest {
  plan_date: string;
  vehicle_id: number;
  driver_id: number;
  planned_departure_time?: string;
  planned_return_time?: string;
  notes?: string;
  created_by: number;
  orders: CreateDeliveryPlanOrderRequest[];
}

export interface CreateDeliveryPlanOrderRequest {
  order_id: number;
  sequence_number: number;
  planned_delivery_time?: string;
}

export interface LoadingLineRequest {
  order_id: number;
  cylinder_type_id: number;
  planned_qty: number;
  loaded_qty: number;
  variance_reason?: string;
  batch_number?: string;
  serial_numbers?: string;
}

export interface ReconciliationLineRequest {
  order_id: number;
  cylinder_type_id: number;
  planned_qty: number;
  loaded_qty: number;
  delivered_qty: number;
  returned_qty: number;
  variance_reason?: string;
  inventory_adjustment: number;
  adjustment_reason?: string;
  resolution_status: 'PENDING' | 'RESOLVED' | 'ESCALATED';
  resolution_notes?: string;
}

// Extended interfaces with related data
export interface DeliveryOrderWithLines extends DeliveryOrder {
  lines: DeliveryOrderLine[];
}

export interface DeliveryPlanWithOrders extends DeliveryPlan {
  orders: DeliveryPlanOrder[];
}

export interface DeliveryDashboardData {
  total_orders: number;
  pending_orders: number;
  assigned_orders: number;
  delivered_orders: number;
  total_ordered_qty: number;
  total_delivered_qty: number;
  total_plans: number;
  draft_plans: number;
  confirmed_plans: number;
  completed_plans: number;
  total_planned_orders: number;
  total_delivered_orders: number;
  total_reconciliations: number;
  total_variances: number;
  total_adjustments: number;
  approved_reconciliations: number;
}

export interface UserPendingTasks {
  task_type: 'ORDER_APPROVAL' | 'PLAN_CONFIRMATION' | 'RECONCILIATION';
  reference_id: number;
  reference_number: string;
  description: string;
  created_date: Date;
}
