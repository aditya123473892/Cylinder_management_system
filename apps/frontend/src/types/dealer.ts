export interface DealerMaster {
  DealerId: number;
  DealerName: string;
  DealerType: string;
  ParentDealerId: number | null;
  LocationId: number;

  IsActive: boolean;
  AadhaarImage: string | null;
  PanImage: string | null;
  CreatedAt: string;
  CreatedBy: number | null;
}

export interface CreateDealerRequest {
  DealerName: string;
  DealerType: string;
  ParentDealerId?: number | null;
  LocationId: number;

  AadhaarImage?: string | null;
  PanImage?: string | null;
  IsActive?: boolean;
  CreatedBy?: number | null;
}

export interface UpdateDealerRequest {
  DealerName?: string;
  DealerType?: string;
  ParentDealerId?: number | null;
  LocationId?: number;

  AadhaarImage?: string | null;
  PanImage?: string | null;
  IsActive?: boolean;
  CreatedBy?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}
