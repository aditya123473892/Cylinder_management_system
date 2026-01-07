export interface CylinderTypeMaster {
  CylinderTypeId: number;
  Capacity: string;
  IsActive: boolean;
  HeightCM: number | null;
  ManufacturingDate: string | null;
}

export interface CreateCylinderTypeRequest {
  Capacity: string;
  IsActive?: boolean;
  HeightCM?: number;
  ManufacturingDate?: string;
}

export interface UpdateCylinderTypeRequest {
  Capacity?: string;
  IsActive?: boolean;
  HeightCM?: number | null;
  ManufacturingDate?: string | null;
}