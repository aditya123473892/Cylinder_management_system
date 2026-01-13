export interface VehicleMaster {
  vehicle_id: number;
  vehicle_number: string;
  vehicle_type: string;
  max_cylinder_capacity: number;
  transporter_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateVehicleRequest {
  vehicle_number: string;
  vehicle_type: string;
  max_cylinder_capacity: number;
  transporter_id?: number | null;
}

export interface UpdateVehicleRequest {
  vehicle_number?: string;
  vehicle_type?: string;
  max_cylinder_capacity?: number;
  transporter_id?: number | null;
  is_active?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}
