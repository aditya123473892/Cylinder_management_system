export interface DealerMaster {
  DealerId: number;
  DealerName: string;
  DealerType: string;
  ParentDealerId: number | null;
  LocationId: number;
  IsActive: boolean;
  AadhaarImage: Buffer | null;
  PanImage: Buffer | null;
  CreatedAt: string;
  CreatedBy: number | null;
}

export interface CreateDealerRequest {
  DealerName: string;
  DealerType: string;
  ParentDealerId?: number | null;
  LocationId: number;
  AadhaarImage?: Buffer | null;
  PanImage?: Buffer | null;
  IsActive?: boolean;
  CreatedBy?: number | null;
}

export interface UpdateDealerRequest {
  DealerName?: string;
  DealerType?: string;
  ParentDealerId?: number | null;
  LocationId?: number;
  AadhaarImage?: Buffer | null;
  PanImage?: Buffer | null;
  IsActive?: boolean;
  CreatedBy?: number | null;
}
