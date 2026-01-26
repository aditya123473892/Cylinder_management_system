// Frontend types for Delivery Orders domain
export interface DeliveryOrder {
  order_id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_type: string;
  location_id: number;
  location_name: string;
  rate_contract_id: number;
  order_date: string;
  requested_delivery_date: string;
  requested_delivery_time?: string;
  priority: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
  order_status: 'PENDING' | 'CONFIRMED' | 'ASSIGNED' | 'LOADED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  special_instructions?: string;
  total_ordered_qty: number;
  total_planned_qty: number;
  total_loaded_qty: number;
  total_delivered_qty: number;
  created_by: number;
  created_at: string;
  updated_by?: number;
  updated_at: string;
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
  plan_date: string;
  vehicle_id: number;
  driver_id: number;
  plan_status: 'DRAFT' | 'CONFIRMED' | 'LOADING' | 'LOADED' | 'DISPATCHED' | 'COMPLETED';
  planned_departure_time?: string;
  actual_departure_time?: string;
  planned_return_time?: string;
  actual_return_time?: string;
  total_planned_orders: number;
  total_loaded_orders: number;
  total_delivered_orders: number;
  notes?: string;
  created_by: number;
  created_at: string;
  updated_by?: number;
  updated_at: string;
}

export interface DeliveryPlanOrder {
  plan_order_id: number;
  plan_id: number;
  order_id: number;
  sequence_number: number;
  planned_delivery_time?: string;
  actual_delivery_time?: string;
  delivery_status: 'PLANNED' | 'LOADED' | 'DELIVERED' | 'PARTIAL' | 'CANCELLED';
  notes?: string;
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
  cylinder_description?: string;
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
  created_date: string;
}

// Filter interfaces for API calls
export interface DeliveryOrderFilters {
  customer_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
}

export interface DeliveryPlanFilters {
  date_from?: string;
  date_to?: string;
  status?: string;
  vehicle_id?: number;
}

// Status and priority options for UI
export const ORDER_PRIORITIES = [
  { value: 'URGENT', label: 'Urgent', color: 'red' },
  { value: 'HIGH', label: 'High', color: 'orange' },
  { value: 'NORMAL', label: 'Normal', color: 'blue' },
  { value: 'LOW', label: 'Low', color: 'gray' }
] as const;

export const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'yellow' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'blue' },
  { value: 'ASSIGNED', label: 'Assigned', color: 'purple' },
  { value: 'LOADED', label: 'Loaded', color: 'indigo' },
  { value: 'IN_TRANSIT', label: 'In Transit', color: 'orange' },
  { value: 'DELIVERED', label: 'Delivered', color: 'green' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'red' }
] as const;

export const PLAN_STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: 'gray' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'blue' },
  { value: 'LOADING', label: 'Loading', color: 'yellow' },
  { value: 'LOADED', label: 'Loaded', color: 'indigo' },
  { value: 'DISPATCHED', label: 'Dispatched', color: 'orange' },
  { value: 'COMPLETED', label: 'Completed', color: 'green' }
] as const;

export const DELIVERY_STATUSES = [
  { value: 'PLANNED', label: 'Planned', color: 'blue' },
  { value: 'LOADED', label: 'Loaded', color: 'indigo' },
  { value: 'DELIVERED', label: 'Delivered', color: 'green' },
  { value: 'PARTIAL', label: 'Partial', color: 'yellow' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'red' }
] as const;
