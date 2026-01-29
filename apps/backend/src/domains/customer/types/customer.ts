export interface CustomerMaster {
  CustomerId: number;
  CustomerName: string;
  ParentDealerId: number | null;
  Location: string;
  IsActive: boolean;
  AadhaarImage: Buffer | null;
  PanImage: Buffer | null;
  GSTNumber: string | null;
  StateCode: string | null;
  BillingAddress: string | null;
  CreatedAt: string;
  CreatedBy: number | null;
}

export interface CreateCustomerRequest {
  CustomerName: string;
  ParentDealerId?: number | null;
  Location: string;
  AadhaarImage?: Buffer | null;
  PanImage?: Buffer | null;
  GSTNumber?: string | null;
  StateCode?: string | null;
  BillingAddress?: string | null;
  IsActive?: boolean;
  CreatedBy?: number | null;
}

export interface UpdateCustomerRequest {
  CustomerName?: string;
  ParentDealerId?: number | null;
  Location?: string;
  AadhaarImage?: Buffer | null;
  PanImage?: Buffer | null;
  GSTNumber?: string | null;
  StateCode?: string | null;
  BillingAddress?: string | null;
  IsActive?: boolean;
  CreatedBy?: number | null;
}
