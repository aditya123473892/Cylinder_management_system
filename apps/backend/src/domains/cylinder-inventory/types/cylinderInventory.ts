export interface CylinderLocationInventory {
  inventory_id: number;
  cylinder_type_id: number;
  location_type: 'YARD' | 'VEHICLE' | 'CUSTOMER' | 'PLANT' | 'REFILLING';
  location_reference_id?: number;
  location_reference_name?: string;
  quantity: number;
  last_updated: Date;
  updated_by: number;
  cylinder_type?: {
    CylinderTypeId: number;
    Capacity: string;
  };
}

export interface CylinderMovementLog {
  movement_id: number;
  cylinder_type_id: number;
  from_location_type?: 'YARD' | 'VEHICLE' | 'CUSTOMER' | 'PLANT' | 'REFILLING';
  from_location_reference_id?: number;
  to_location_type: 'YARD' | 'VEHICLE' | 'CUSTOMER' | 'PLANT' | 'REFILLING';
  to_location_reference_id?: number;
  quantity: number;
  movement_type?: 'DELIVERY' | 'RETURN' | 'REFILLING' | 'ADJUSTMENT' | 'TRANSFER';
  reference_transaction_id?: number;
  moved_by: number;
  movement_date: Date;
  notes?: string;
  cylinder_type?: {
    CylinderTypeId: number;
    Capacity: string;
  };
  moved_by_user?: {
    UserId: number;
    UserName: string;
  };
}

export interface CreateCylinderMovementRequest {
  cylinder_type_id: number;
  from_location_type?: 'YARD' | 'VEHICLE' | 'CUSTOMER' | 'PLANT' | 'REFILLING';
  from_location_reference_id?: number;
  to_location_type: 'YARD' | 'VEHICLE' | 'CUSTOMER' | 'PLANT' | 'REFILLING';
  to_location_reference_id?: number;
  quantity: number;
  movement_type?: 'DELIVERY' | 'RETURN' | 'REFILLING' | 'ADJUSTMENT' | 'TRANSFER';
  reference_transaction_id?: number;
  notes?: string;
}

export interface CylinderInventorySummary {
  cylinder_type_id: number;
  cylinder_capacity: string;
  locations: {
    location_type: string;
    location_reference_name?: string;
    quantity: number;
  }[];
  total_quantity: number;
}

export interface CylinderLocationSummary {
  location_type: string;
  location_reference_name?: string;
  cylinder_types: {
    cylinder_type_id: number;
    cylinder_capacity: string;
    quantity: number;
  }[];
  total_cylinders: number;
}
