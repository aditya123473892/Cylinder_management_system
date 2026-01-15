export interface Gr {
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

export interface GrWithDelivery extends Gr {
  delivery_info: {
    customer_name: string;
    vehicle_number: string;
    driver_name: string;
    delivery_datetime: Date;
  };
}

export interface CreateGrRequest {
  delivery_id: number;
  advance_amount: number;
}

export interface ApproveGrRequest {
  advance_amount?: number;
}

export interface FinalizeGrRequest {
  // GR finalization doesn't require additional data
}

export interface CloseTripRequest {
  // Trip closure doesn't require additional data
}
