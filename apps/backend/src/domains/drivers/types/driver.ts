export interface DriverMaster {
  driver_id: number;
  driver_name: string;
  mobile_number: string;
  license_number: string;
  license_expiry_date: string;
  is_active: boolean;
  created_at: string;
  AadhaarImage: Buffer | null;
  PanImage: Buffer | null;
  CreatedBy: number | null;
}

export interface CreateDriverRequest {
  driver_name: string;
  mobile_number: string;
  license_number: string;
  license_expiry_date: string;
  AadhaarImage?: Buffer | null;
  PanImage?: Buffer | null;
  CreatedBy?: number | null;
}

export interface UpdateDriverRequest {
  driver_name?: string;
  mobile_number?: string;
  license_number?: string;
  license_expiry_date?: string;
  is_active?: boolean;
  AadhaarImage?: Buffer | null;
  PanImage?: Buffer | null;
  CreatedBy?: number | null;
}
