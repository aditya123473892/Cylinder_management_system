import { CylinderInventoryRepository } from '../repositories/cylinderInventoryRepository';
import {
  CylinderLocationInventory,
  CylinderMovementLog,
  CreateCylinderMovementRequest,
  CylinderInventorySummary,
  CylinderLocationSummary
} from '../types/cylinderInventory';

export class CylinderInventoryService {
  private repository: CylinderInventoryRepository;

  constructor() {
    this.repository = new CylinderInventoryRepository();
  }

  async getInventorySummary(): Promise<CylinderInventorySummary[]> {
    try {
      return await this.repository.getInventorySummary();
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      throw new Error('Failed to fetch cylinder inventory summary');
    }
  }

  async getLocationSummary(): Promise<CylinderLocationSummary[]> {
    try {
      return await this.repository.getLocationSummary();
    } catch (error) {
      console.error('Error fetching location summary:', error);
      throw new Error('Failed to fetch cylinder location summary');
    }
  }

  async getInventoryByLocation(
    locationType: string,
    locationReferenceId?: number
  ): Promise<CylinderLocationInventory[]> {
    try {
      // Validate location type
      const validLocationTypes = ['YARD', 'VEHICLE', 'CUSTOMER', 'PLANT', 'REFILLING'];
      if (!validLocationTypes.includes(locationType)) {
        throw new Error(`Invalid location type: ${locationType}`);
      }

      return await this.repository.getInventoryByLocation(locationType, locationReferenceId);
    } catch (error) {
      console.error(`Error fetching inventory for location ${locationType}:`, error);
      throw error instanceof Error ? error : new Error('Failed to fetch cylinder inventory');
    }
  }

  async recordMovement(
    movement: CreateCylinderMovementRequest,
    userId: number
  ): Promise<CylinderMovementLog> {
    try {
      // Validate required fields
      if (!movement.cylinder_type_id || movement.cylinder_type_id <= 0) {
        throw new Error('Valid cylinder type ID is required');
      }

      if (!movement.to_location_type) {
        throw new Error('Destination location type is required');
      }

      if (!movement.quantity || movement.quantity <= 0) {
        throw new Error('Quantity must be a positive number');
      }

      // Validate location types
      const validLocationTypes = ['YARD', 'VEHICLE', 'CUSTOMER', 'PLANT', 'REFILLING'];
      if (movement.from_location_type && !validLocationTypes.includes(movement.from_location_type)) {
        throw new Error(`Invalid source location type: ${movement.from_location_type}`);
      }
      if (!validLocationTypes.includes(movement.to_location_type)) {
        throw new Error(`Invalid destination location type: ${movement.to_location_type}`);
      }

      // Validate movement type
      const validMovementTypes = ['DELIVERY', 'RETURN', 'REFILLING', 'ADJUSTMENT', 'TRANSFER'];
      if (movement.movement_type && !validMovementTypes.includes(movement.movement_type)) {
        throw new Error(`Invalid movement type: ${movement.movement_type}`);
      }

      // If this is not an adjustment, validate that source has sufficient quantity
      if (movement.from_location_type && movement.movement_type !== 'ADJUSTMENT') {
        const sourceInventory = await this.repository.getInventoryByLocation(
          movement.from_location_type,
          movement.from_location_reference_id
        );

        const sourceCylinder = sourceInventory.find(
          item => item.cylinder_type_id === movement.cylinder_type_id
        );

        if (!sourceCylinder || sourceCylinder.quantity < movement.quantity) {
          throw new Error(`Insufficient quantity in source location. Available: ${sourceCylinder?.quantity || 0}`);
        }
      }

      // Record the movement in log
      const movementLog = await this.repository.recordMovement(movement, userId);

      // Update inventory quantities
      // Decrease from source location (if specified)
      if (movement.from_location_type) {
        await this.repository.updateInventoryQuantity(
          movement.cylinder_type_id,
          movement.from_location_type,
          movement.from_location_reference_id || null,
          -movement.quantity, // Negative for decrease
          userId
        );
      }

      // Increase in destination location
      await this.repository.updateInventoryQuantity(
        movement.cylinder_type_id,
        movement.to_location_type,
        movement.to_location_reference_id || null,
        movement.quantity, // Positive for increase
        userId
      );

      return movementLog;
    } catch (error) {
      console.error('Error recording cylinder movement:', error);
      throw error instanceof Error ? error : new Error('Failed to record cylinder movement');
    }
  }

  async recordDeliveryMovement(
    deliveryId: number,
    cylinderTypeId: number,
    quantity: number,
    vehicleId: number,
    userId: number
  ): Promise<CylinderMovementLog> {
    try {
      const movement: CreateCylinderMovementRequest = {
        cylinder_type_id: cylinderTypeId,
        from_location_type: 'YARD',
        to_location_type: 'VEHICLE',
        to_location_reference_id: vehicleId,
        quantity: quantity,
        movement_type: 'DELIVERY',
        reference_transaction_id: deliveryId
      };

      return await this.recordMovement(movement, userId);
    } catch (error) {
      console.error('Error recording delivery movement:', error);
      throw error instanceof Error ? error : new Error('Failed to record delivery cylinder movement');
    }
  }

  async recordGrApprovalMovement(
    deliveryId: number,
    cylinderTypeId: number,
    quantity: number,
    userId: number
  ): Promise<CylinderMovementLog> {
    try {
      const movement: CreateCylinderMovementRequest = {
        cylinder_type_id: cylinderTypeId,
        from_location_type: 'VEHICLE',
        to_location_type: 'CUSTOMER',
        quantity: quantity,
        movement_type: 'DELIVERY',
        reference_transaction_id: deliveryId
      };

      return await this.recordMovement(movement, userId);
    } catch (error) {
      console.error('Error recording GR approval movement:', error);
      throw error instanceof Error ? error : new Error('Failed to record GR approval cylinder movement');
    }
  }

  async recordReturnMovement(
    deliveryId: number,
    cylinderTypeId: number,
    deliveredQuantity: number,
    returnedQuantity: number,
    userId: number
  ): Promise<void> {
    try {
      if (returnedQuantity > 0) {
        // Move returned cylinders from CUSTOMER back to VEHICLE
        const returnMovement: CreateCylinderMovementRequest = {
          cylinder_type_id: cylinderTypeId,
          from_location_type: 'CUSTOMER',
          to_location_type: 'VEHICLE',
          quantity: returnedQuantity,
          movement_type: 'RETURN',
          reference_transaction_id: deliveryId
        };

        await this.recordMovement(returnMovement, userId);

        // Move remaining cylinders from VEHICLE back to YARD
        const netDelivered = deliveredQuantity - returnedQuantity;
        if (netDelivered > 0) {
          const yardMovement: CreateCylinderMovementRequest = {
            cylinder_type_id: cylinderTypeId,
            from_location_type: 'VEHICLE',
            to_location_type: 'YARD',
            quantity: netDelivered,
            movement_type: 'RETURN',
            reference_transaction_id: deliveryId
          };

          await this.recordMovement(yardMovement, userId);
        }
      } else {
        // No returns - move all delivered cylinders from VEHICLE to YARD
        const yardMovement: CreateCylinderMovementRequest = {
          cylinder_type_id: cylinderTypeId,
          from_location_type: 'VEHICLE',
          to_location_type: 'YARD',
          quantity: deliveredQuantity,
          movement_type: 'RETURN',
          reference_transaction_id: deliveryId
        };

        await this.recordMovement(yardMovement, userId);
      }
    } catch (error) {
      console.error('Error recording return movement:', error);
      throw error instanceof Error ? error : new Error('Failed to record cylinder return movement');
    }
  }

  async getMovementLogs(
    limit: number = 100,
    offset: number = 0
  ): Promise<CylinderMovementLog[]> {
    try {
      if (limit <= 0 || limit > 1000) {
        throw new Error('Limit must be between 1 and 1000');
      }
      if (offset < 0) {
        throw new Error('Offset must be non-negative');
      }

      return await this.repository.getMovementLogs(limit, offset);
    } catch (error) {
      console.error('Error fetching movement logs:', error);
      throw error instanceof Error ? error : new Error('Failed to fetch cylinder movement logs');
    }
  }

  async getMovementsByCylinderType(cylinderTypeId: number): Promise<CylinderMovementLog[]> {
    try {
      if (!cylinderTypeId || cylinderTypeId <= 0) {
        throw new Error('Valid cylinder type ID is required');
      }

      return await this.repository.getMovementsByCylinderType(cylinderTypeId);
    } catch (error) {
      console.error(`Error fetching movements for cylinder type ${cylinderTypeId}:`, error);
      throw error instanceof Error ? error : new Error('Failed to fetch cylinder movements');
    }
  }

  async getMovementsByTransaction(transactionId: number): Promise<CylinderMovementLog[]> {
    try {
      if (!transactionId || transactionId <= 0) {
        throw new Error('Valid transaction ID is required');
      }

      return await this.repository.getMovementsByTransaction(transactionId);
    } catch (error) {
      console.error(`Error fetching movements for transaction ${transactionId}:`, error);
      throw error instanceof Error ? error : new Error('Failed to fetch transaction cylinder movements');
    }
  }

  async initializeInventory(inventoryData: Array<{cylinder_type_id: number, quantity: number}>, userId: number): Promise<void> {
    try {
      // Validate input
      if (!inventoryData || inventoryData.length === 0) {
        throw new Error('Inventory data is required');
      }

      // Clear existing YARD inventory first (optional - for clean initialization)
      // You might want to keep this commented out to avoid accidental data loss

      // Insert new inventory records for YARD location
      for (const item of inventoryData) {
        if (item.quantity > 0) {
          await this.repository.updateInventoryQuantity(
            item.cylinder_type_id,
            'YARD',
            null, // No specific reference for YARD
            item.quantity,
            userId
          );
        }
      }
    } catch (error) {
      console.error('Error initializing cylinder inventory:', error);
      throw error instanceof Error ? error : new Error('Failed to initialize cylinder inventory');
    }
  }
}
