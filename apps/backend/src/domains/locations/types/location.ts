export interface LocationMaster {
  LocationId: number;
  LocationName: string;
  LocationType: string;
  Address: string | null;
  Image: string | null;
  Latitude: number | null;
  Longitude: number | null;
  IsActive: boolean;
  CreatedAt: string;
}

export interface CreateLocationRequest {
  LocationName: string;
  LocationType: string;
  Address?: string;
  Image?: string;
  Latitude?: number;
  Longitude?: number;
  IsActive?: boolean;
}

export interface UpdateLocationRequest {
  LocationName?: string;
  LocationType?: string;
  Address?: string | null;
  Image?: string | null;
  Latitude?: number | null;
  Longitude?: number | null;
  IsActive?: boolean;
}
