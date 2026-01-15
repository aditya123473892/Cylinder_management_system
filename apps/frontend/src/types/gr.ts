export interface Gr {
  gr_id: number;
  delivery_id: number;
  gr_number: string;
  gr_status: 'PENDING' | 'APPROVED' | 'FINALIZED';
  advance_amount: number;
  approved_by?: number;
  approved_at?: string;
  finalized_by?: number;
  finalized_at?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface GrWithDelivery extends Gr {
  delivery_info: {
    customer_name: string;
    vehicle_number: string;
    driver_name: string;
    delivery_datetime: string;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}
