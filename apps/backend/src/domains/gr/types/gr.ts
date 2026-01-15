export interface GR {
  gr_id: number;
  delivery_id: number;
  gr_number: string;
  gr_status: 'PENDING' | 'APPROVED' | 'FINALIZED';
  advance_amount: number;
  approved_by?: number;
  approved_at?: Date;
  finalized_by?: number;
  finalized_at?: Date;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface GRWithDeliveryDetails extends GR {
  delivery_transaction?: {
    delivery_id: number;
    customer_name: string;
    customer_type: string;
    from_location_name: string;
    to_location_name: string;
    vehicle_number?: string;
    driver_name?: string;
    delivery_datetime: string;
    total_delivered_qty?: number;
    total_bill_amount?: number;
  };
}

export interface CreateGRRequest {
  delivery_id: number;
  advance_amount?: number;
}

export interface ApproveGRRequest {
  advance_amount: number;
}

export interface GRPreviewData {
  gr_id?: number;
  delivery_id: number;
  gr_number?: string;
  gr_status?: 'PENDING' | 'APPROVED' | 'FINALIZED';
  advance_amount: number;
  delivery_details: {
    delivery_id: number;
    customer_name: string;
    customer_type: string;
    from_location_name: string;
    to_location_name: string;
    vehicle_number?: string;
    driver_name?: string;
    delivery_datetime: string;
    total_delivered_qty?: number;
    total_bill_amount?: number;
    lines?: Array<{
      cylinder_description: string;
      delivered_qty: number;
      returned_qty: number;
      net_qty: number;
      rate_applied: number;
      line_amount: number;
    }>;
  };
}
