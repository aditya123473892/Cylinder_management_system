export interface DeliveryTransaction {
  delivery_id: number;
  customer_id: number;
  customer_name: string;
  location_id?: number;
  location_name: string;
  vehicle_id: number;
  vehicle_number?: string;
  driver_id: number;
  driver_name?: string;
  rate_contract_id?: number;
  delivery_datetime: string;
  customer_type: string;
  from_location_id: number;
  from_location_name: string;
  to_location_id: number;
  to_location_name: string;
  selected_rate_contract_id: number;
  created_by: number;
  created_at: string;
  // Calculated fields from API
  total_delivered_qty?: number;
  total_returned_qty?: number;
  total_net_qty?: number;
  total_bill_amount?: number;
  // Line items
  lines?: DeliveryTransactionLine[];
}

export interface DeliveryTransactionLine {
  delivery_line_id: number;
  delivery_id: number;
  cylinder_type_id: number;
  cylinder_description: string;
  delivered_qty: number;
  returned_qty: number;
  net_qty: number;
  rate_applied: number;
  billable_qty: number;
  line_amount: number;
}

export interface CreateDeliveryTransactionRequest {
  customer_id: number;
  location_id: number;
  vehicle_id: number;
  driver_id: number;
  rate_contract_id: number;
  delivery_date: string;
  delivery_time: string;
  lines: CreateDeliveryLineRequest[];
}

export interface CreateDeliveryLineRequest {
  cylinder_type_id: number;
  delivered_qty: number;
  returned_qty: number;
}

export interface DeliveryTransactionWithLines extends DeliveryTransaction {
  lines: DeliveryTransactionLine[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}
