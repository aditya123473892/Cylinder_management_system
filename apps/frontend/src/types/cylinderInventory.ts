export type CylinderStatus = 'FILLED' | 'EMPTY';

export type LocationType = 'YARD' | 'VEHICLE' | 'CUSTOMER' | 'PLANT' | 'REFILLING';

export type MovementType =
  | 'DELIVERY_FILLED'     // Filled cylinders delivered to customer
  | 'DELIVERY_EMPTY'      // Empty cylinders delivered (rare, for exchanges)
  | 'RETURN_FILLED'       // Filled cylinders returned (damaged/unused)
  | 'RETURN_EMPTY'        // Empty cylinders returned by customer
  | 'REFILLING_IN'        // Empty cylinders entering refilling
  | 'REFILLING_OUT'       // Filled cylinders exiting refilling
  | 'ADJUSTMENT'          // Manual inventory adjustments
  | 'TRANSFER';           // Movement between internal locations

export interface InventoryLocation {
  type: LocationType;
  referenceId?: number;
  referenceName?: string;
  status: CylinderStatus;
}

export interface InventoryItem {
  inventoryId: number;
  cylinderTypeId: number;
  cylinderTypeName: string;
  locationType: LocationType;
  locationReferenceId?: number;
  locationReferenceName?: string;
  cylinderStatus: CylinderStatus;
  quantity: number;
  lastUpdated: string;
  updatedBy: number;
}

export interface InventorySummary {
  cylinderTypeId: number;
  cylinderTypeName: string;
  totalQuantity: number;
  locations: {
    [locationType: string]: {
      filled: number;
      empty: number;
      total: number;
    };
  };
}

export interface InventoryDashboard {
  totalCylinders: number;
  byLocation: {
    yard: { filled: number; empty: number; total: number };
    plant: { filled: number; empty: number; total: number };
    customers: { filled: number; empty: number; total: number };
    vehicles: { filled: number; empty: number; total: number };
  };
  recentMovements: CylinderMovement[];
  alerts: Array<{ type: string; message: string }>;
}

export interface CylinderMovement {
  movement_id: number;
  cylinder_type_id: number;
  from_location_type?: string;
  from_location_reference_id?: number;
  from_cylinder_status?: string;
  to_location_type: string;
  to_location_reference_id?: number;
  to_cylinder_status?: string;
  quantity: number;
  movement_type?: string;
  reference_transaction_id?: number;
  moved_by: number;
  movement_date: string;
  notes?: string;
  cylinder_type_name: string;
  moved_by_name: string;
}

export interface InventoryQuery {
  locationType?: LocationType;
  referenceId?: number;
  cylinderStatus?: CylinderStatus;
  cylinderTypeId?: number;
}
