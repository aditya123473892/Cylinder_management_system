export interface CustomerMaster {
  CustomerId: number;
  CustomerName: string;
  CustomerType: string;
  ParentCustomerId: number | null;
  LocationId: number;
  RetentionDays: number;
  IsActive: boolean;
  CreatedAt: string;
  CreatedBy: number | null;
}

export interface CreateCustomerRequest {
  CustomerName: string;
  CustomerType: string;
  ParentCustomerId?: number | null;
  LocationId: number;
  RetentionDays: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
}

export interface UpdateCustomerRequest {
  CustomerName?: string;
  CustomerType?: string;
  ParentCustomerId?: number | null;
  LocationId?: number;
  RetentionDays?: number;
  IsActive?: boolean;
  CreatedBy?: number | null;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}
