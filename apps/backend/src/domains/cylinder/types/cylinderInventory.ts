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
  referenceId?: number;    // customer_id, vehicle_id, etc.
  referenceName?: string;  // customer name, vehicle number, etc.
  status: CylinderStatus;
}

export interface CylinderMovement {
  cylinderTypeId: number;
  quantity: number;
  fromLocation: InventoryLocation;
  toLocation: InventoryLocation;
  movementType: MovementType;
  referenceTransactionId?: number;
  movedBy: number;
  notes?: string;
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
  lastUpdated: Date;
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

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CreateMovementRequest {
  cylinderTypeId: number;
  quantity: number;
  fromLocation: InventoryLocation;
  toLocation: InventoryLocation;
  movementType: MovementType;
  referenceTransactionId?: number;
  movedBy: number;
  notes?: string;
}

export interface InventoryQuery {
  locationType?: LocationType;
  referenceId?: number;
  cylinderStatus?: CylinderStatus;
  cylinderTypeId?: number;
}
