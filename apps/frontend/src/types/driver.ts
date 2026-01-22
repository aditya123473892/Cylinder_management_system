export interface DriverMaster {
  driver_id: number;
  driver_name: string;
  mobile_number: string;
  license_number: string;
  license_expiry_date: string;
  is_active: boolean;
  created_at: string;
  AadhaarImage: string | null;
  PanImage: string | null;
  CreatedBy: number | null;
}

export interface CreateDriverRequest {
  driver_name: string;
  mobile_number: string;
  license_number: string;
  license_expiry_date: string;
  AadhaarImage?: string | null;
  PanImage?: string | null;
  CreatedBy?: number | null;
}

export interface UpdateDriverRequest {
  driver_name?: string;
  mobile_number?: string;
  license_number?: string;
  license_expiry_date?: string;
  is_active?: boolean;
  AadhaarImage?: string | null;
  PanImage?: string | null;
  CreatedBy?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}
