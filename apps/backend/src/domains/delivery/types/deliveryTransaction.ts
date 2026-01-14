export interface DeliveryTransaction {
  delivery_id: number;
  customer_id: number;
  customer_type: string;
  from_location_id: number;
  from_location_name: string;
  to_location_id: number;
  to_location_name: string;
  vehicle_id: number;
  driver_id: number;
  selected_rate_contract_id: number;
  delivery_datetime: Date;
  created_by: number;
  created_at: Date;
}

export interface DeliveryTransactionLine {
  delivery_line_id: number;
  delivery_id: number;
  cylinder_type_id: number;
  cylinder_description: string;
  delivered_qty: number;
  returned_qty: number;
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
