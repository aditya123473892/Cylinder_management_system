export interface LocationMaster {
  LocationId: number;
  LocationName: string;
  LocationType: string;
  CustomerId: number | null;
  Address: string | null;
  City: string | null;
  State: string | null;
  IsActive: boolean;
  CreatedAt: string;
}

export interface CreateLocationRequest {
  LocationName: string;
  LocationType: string;
  CustomerId?: number;
  Address?: string;
  City?: string;
  State?: string;
  IsActive?: boolean;
}

export interface UpdateLocationRequest {
  LocationName?: string;
  LocationType?: string;
  CustomerId?: number | null;
  Address?: string | null;
  City?: string | null;
  State?: string | null;
  IsActive?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
}