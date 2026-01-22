import { CylinderInventoryRepository } from '../repositories/cylinderInventoryRepository';
import {
  InventoryItem,
  InventorySummary,
  ValidationResult,
  CreateMovementRequest,
  InventoryQuery,
  CylinderStatus,
  LocationType,
  MovementType
} from '../types/cylinderInventory';

export class CylinderInventoryService {
  private repository: CylinderInventoryRepository;

  constructor() {
    this.repository = new CylinderInventoryRepository();
  }

  async getInventory(query: InventoryQuery = {}): Promise<InventoryItem[]> {
    try {
      return await this.repository.getInventory(query);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      throw new Error('Failed to fetch inventory data');
    }
  }

  async getInventorySummary(): Promise<InventorySummary[]> {
    try {
      return await this.repository.getInventorySummary();
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      throw new Error('Failed to fetch inventory summary');
    }
  }

  async moveCylinders(movement: CreateMovementRequest): Promise<void> {
    try {
      // Validate the movement
      const validation = await this.validateMovement(movement);
      if (!validation.isValid) {
        throw new Error(`Movement validation failed: ${validation.errors.join(', ')}`);
      }

      // Execute the movement in a transaction-like manner
      // Decrease from source location
      await this.repository.updateInventory(
        movement.cylinderTypeId,
        movement.fromLocation.type,
        movement.fromLocation.referenceId || null,
        movement.fromLocation.status,
        -movement.quantity, // Negative for decrease
        movement.movedBy
      );

      // Increase at destination location
      await this.repository.updateInventory(
        movement.cylinderTypeId,
        movement.toLocation.type,
        movement.toLocation.referenceId || null,
        movement.toLocation.status,
        movement.quantity, // Positive for increase
        movement.movedBy
      );

      // Log the movement
      await this.repository.logMovement(movement);

    } catch (error) {
      console.error('Error moving cylinders:', error);
      throw error instanceof Error ? error : new Error('Failed to move cylinders');
    }
  }

  async validateMovement(movement: CreateMovementRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate quantity
      if (movement.quantity <= 0) {
        errors.push('Movement quantity must be greater than 0');
      }

      // Validate movement type and status consistency
      const validation = this.validateMovementTypeAndStatus(movement);
      if (!validation.isValid) {
        errors.push(...validation.errors);
      }

      // Check inventory availability at source
      if (movement.fromLocation.type !== 'REFILLING') { // Allow creating from refilling
        const hasAvailable = await this.repository.validateInventoryAvailability(
          movement.cylinderTypeId,
          movement.fromLocation.type,
          movement.fromLocation.referenceId || null,
          movement.fromLocation.status,
          movement.quantity
        );

        if (!hasAvailable) {
          errors.push(`Insufficient ${movement.fromLocation.status.toLowerCase()} cylinders available at source location`);
        }
      }

      // Business rule validations
      const businessValidation = this.validateBusinessRules(movement);
      errors.push(...businessValidation.errors);
      warnings.push(...businessValidation.warnings);

    } catch (error) {
      errors.push('Error validating movement');
      console.error('Movement validation error:', error);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private validateMovementTypeAndStatus(movement: CreateMovementRequest): ValidationResult {
    const errors: string[] = [];

    switch (movement.movementType) {
      case 'DELIVERY_FILLED':
        if (movement.fromLocation.status !== 'FILLED' || movement.toLocation.status !== 'FILLED') {
          errors.push('DELIVERY_FILLED requires FILLED status at both locations');
        }
        if (movement.fromLocation.type !== 'YARD' && movement.fromLocation.type !== 'VEHICLE') {
          errors.push('DELIVERY_FILLED source must be YARD or VEHICLE');
        }
        if (movement.toLocation.type !== 'CUSTOMER' && movement.toLocation.type !== 'VEHICLE') {
          errors.push('DELIVERY_FILLED destination must be CUSTOMER or VEHICLE');
        }
        break;

      case 'RETURN_EMPTY':
        if (movement.fromLocation.status !== 'FILLED' || movement.toLocation.status !== 'EMPTY') {
          errors.push('RETURN_EMPTY requires FILLED→EMPTY status change');
        }
        if (movement.fromLocation.type !== 'CUSTOMER' && movement.fromLocation.type !== 'VEHICLE') {
          errors.push('RETURN_EMPTY source must be CUSTOMER or VEHICLE');
        }
        if (movement.toLocation.type !== 'PLANT' && movement.toLocation.type !== 'VEHICLE') {
          errors.push('RETURN_EMPTY destination must be PLANT or VEHICLE');
        }
        break;

      case 'REFILLING_OUT':
        if (movement.fromLocation.status !== 'EMPTY' || movement.toLocation.status !== 'FILLED') {
          errors.push('REFILLING_OUT requires EMPTY→FILLED status change');
        }
        if (movement.fromLocation.type !== 'PLANT' && movement.fromLocation.type !== 'REFILLING') {
          errors.push('REFILLING_OUT source must be PLANT or REFILLING');
        }
        if (movement.toLocation.type !== 'YARD') {
          errors.push('REFILLING_OUT destination must be YARD');
        }
        break;

      case 'RETURN_FILLED':
        if (movement.fromLocation.status !== 'FILLED' || movement.toLocation.status !== 'FILLED') {
          errors.push('RETURN_FILLED requires FILLED status at both locations');
        }
        break;

      // Add more validations for other movement types as needed
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  private validateBusinessRules(movement: CreateMovementRequest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Prevent impossible movements
    if (movement.fromLocation.type === movement.toLocation.type &&
        movement.fromLocation.referenceId === movement.toLocation.referenceId &&
        movement.fromLocation.status === movement.toLocation.status) {
      errors.push('Cannot move cylinders to the same location with same status');
    }

    // Warn about unusual movements
    if (movement.movementType === 'DELIVERY_FILLED' && movement.toLocation.type === 'VEHICLE') {
      warnings.push('Delivering filled cylinders to vehicle - ensure proper tracking');
    }

    if (movement.movementType === 'RETURN_EMPTY' && movement.fromLocation.type === 'VEHICLE') {
      warnings.push('Returning empty cylinders from vehicle - verify quantities');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async getAvailableQuantity(
    cylinderTypeId: number,
    locationType: LocationType,
    locationReferenceId?: number,
    cylinderStatus: CylinderStatus = 'FILLED'
  ): Promise<number> {
    try {
      const inventory = await this.repository.getInventory({
        cylinderTypeId,
        locationType,
        referenceId: locationReferenceId,
        cylinderStatus
      });

      return inventory.length > 0 ? inventory[0].quantity : 0;
    } catch (error) {
      console.error('Error getting available quantity:', error);
      return 0;
    }
  }

  async getCylinderMovements(
    cylinderTypeId?: number,
    referenceTransactionId?: number,
    limit: number = 50
  ): Promise<any[]> {
    try {
      return await this.repository.getCylinderMovements(cylinderTypeId, referenceTransactionId, limit);
    } catch (error) {
      console.error('Error fetching cylinder movements:', error);
      throw new Error('Failed to fetch cylinder movements');
    }
  }

  // Utility method for delivery transactions
  async processDeliveryMovements(
    cylinderTypeId: number,
    deliveredQty: number,
    returnedQty: number,
    customerId: number,
    transactionId: number,
    movedBy: number
  ): Promise<void> {
    const movements: CreateMovementRequest[] = [];

    // Process deliveries: YARD FILLED → CUSTOMER FILLED
    if (deliveredQty > 0) {
      movements.push({
        cylinderTypeId,
        quantity: deliveredQty,
        fromLocation: { type: 'YARD', status: 'FILLED' },
        toLocation: { type: 'CUSTOMER', referenceId: customerId, status: 'FILLED' },
        movementType: 'DELIVERY_FILLED',
        referenceTransactionId: transactionId,
        movedBy
      });
    }

    // Process returns: CUSTOMER FILLED → PLANT EMPTY (returned cylinders are considered empty)
    if (returnedQty > 0) {
      movements.push({
        cylinderTypeId,
        quantity: returnedQty,
        fromLocation: { type: 'CUSTOMER', referenceId: customerId, status: 'FILLED' },
        toLocation: { type: 'PLANT', status: 'EMPTY' },
        movementType: 'RETURN_EMPTY',
        referenceTransactionId: transactionId,
        movedBy
      });
    }

    // Execute all movements
    for (const movement of movements) {
      await this.moveCylinders(movement);
    }
  }
}
