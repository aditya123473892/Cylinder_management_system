export interface DriverMaster {
  driver_id: number;
  driver_name: string;
  mobile_number: string;
  license_number: string;
  license_expiry_date: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateDriverRequest {
  driver_name: string;
  mobile_number: string;
  license_number: string;
  license_expiry_date: string;
}

export interface UpdateDriverRequest {
  driver_name?: string;
  mobile_number?: string;
  license_number?: string;
  license_expiry_date?: string;
  is_active?: boolean;
}
