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

      // BUSINESS RULE: Empty cylinders should not be stored with customers
      if (movement.toLocation.type === 'CUSTOMER' && movement.toLocation.status === 'EMPTY') {
        errors.push('Business rule violation: Empty cylinders cannot be stored with customers. Empty cylinders should be moved to YARD or PLANT for refilling.');
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
      // For YARD location, referenceId should be undefined/null
      const queryReferenceId = (locationType === 'YARD' || locationType === 'PLANT' || locationType === 'REFILLING') 
        ? undefined 
        : locationReferenceId;

      const inventory = await this.repository.getInventory({
        cylinderTypeId,
        locationType,
        referenceId: queryReferenceId,
        cylinderStatus
      });

      const quantity = inventory.length > 0 ? inventory[0].quantity : 0;

      return quantity;
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

  async initializeInventory(
    locationType: string,
    referenceId: number | null,
    cylinders: Array<{
      cylinderTypeId: number;
      quantity: number;
      cylinderStatus: 'FILLED' | 'EMPTY';
    }>,
    updatedBy: number
  ): Promise<any> {
    try {
      // SAFEGUARD: Prevent phantom cylinder generation
      if (locationType === 'YARD' && !referenceId) {
        // Check for suspicious patterns that indicate phantom cylinder generation
        for (const cylinder of cylinders) {
          if (cylinder.quantity === 100) {
            console.warn(`⚠️  SUSPICIOUS: Attempting to initialize exactly 100 cylinders for type ${cylinder.cylinderTypeId} in YARD`);
            console.warn('This pattern indicates phantom cylinder generation. Please verify physical inventory before proceeding.');
            
            // Log this suspicious activity
            await this.repository.logMovement({
              cylinderTypeId: cylinder.cylinderTypeId,
              fromLocation: { type: 'SYSTEM' as LocationType, status: 'FILLED' as CylinderStatus },
              toLocation: { type: 'SYSTEM' as LocationType, status: 'FILLED' as CylinderStatus },
              quantity: cylinder.quantity,
              movementType: 'SUSPICIOUS_INITIALIZATION' as MovementType,
              referenceTransactionId: undefined,
              movedBy: updatedBy,
              notes: `SUSPICIOUS: Attempted phantom cylinder initialization - ${cylinder.quantity} units for cylinder type ${cylinder.cylinderTypeId}`
            });
          }
          
          // Additional safeguard: Prevent large bulk additions without verification
          if (cylinder.quantity > 50) {
            console.warn(`⚠️  SAFEGUARD: Large quantity initialization detected - ${cylinder.quantity} cylinders`);
            console.warn('Physical inventory verification required for quantities > 50');
            
            // In a production system, you might want to throw an error here
            // For now, we'll log it and continue with admin oversight
            await this.repository.logMovement({
              cylinderTypeId: cylinder.cylinderTypeId,
              fromLocation: { type: 'SYSTEM' as LocationType, status: 'FILLED' as CylinderStatus },
              toLocation: { type: 'SYSTEM' as LocationType, status: 'FILLED' as CylinderStatus },
              quantity: cylinder.quantity,
              movementType: 'LARGE_INITIALIZATION' as MovementType,
              referenceTransactionId: undefined,
              movedBy: updatedBy,
              notes: `SAFEGUARD: Large quantity initialization - ${cylinder.quantity} cylinders for type ${cylinder.cylinderTypeId}. Physical verification required.`
            });
          }
        }
      }

      const results = [];

      for (const cylinder of cylinders) {
        // Add cylinders to the specified location
        await this.repository.updateInventory(
          cylinder.cylinderTypeId,
          locationType as LocationType,
          referenceId,
          cylinder.cylinderStatus,
          cylinder.quantity, // Positive quantity for initialization
          updatedBy
        );

        results.push({
          cylinderTypeId: cylinder.cylinderTypeId,
          quantity: cylinder.quantity,
          status: cylinder.cylinderStatus,
          locationType,
          referenceId
        });
      }

      return {
        initializedCylinders: results,
        totalQuantity: cylinders.reduce((sum, c) => sum + c.quantity, 0),
        locationType,
        referenceId
      };
    } catch (error) {
      console.error('Error initializing inventory:', error);
      throw error instanceof Error ? error : new Error('Failed to initialize inventory');
    }
  }

  async createMovement(data: {
    cylinderTypeId: number;
    fromLocationType?: string;
    fromLocationReferenceId?: number;
    toLocationType: string;
    toLocationReferenceId?: number;
    quantity: number;
    cylinderStatus: 'FILLED' | 'EMPTY';
    movementType?: string;
    referenceTransactionId?: number;
    notes?: string;
    movedBy: number;
  }): Promise<any> {
    try {
      // Create movement record
      const movementId = await this.repository.createMovement({
        cylinderTypeId: data.cylinderTypeId,
        fromLocationType: data.fromLocationType,
        fromLocationReferenceId: data.fromLocationReferenceId,
        toLocationType: data.toLocationType,
        toLocationReferenceId: data.toLocationReferenceId,
        quantity: data.quantity,
        cylinderStatus: data.cylinderStatus,
        movementType: data.movementType,
        referenceTransactionId: data.referenceTransactionId,
        movedBy: data.movedBy,
        notes: data.notes
      });

      // Update inventory quantities
      // Decrease quantity from source location
      if (data.fromLocationType) {
        await this.repository.updateInventory(
          data.cylinderTypeId,
          data.fromLocationType as any,
          data.fromLocationReferenceId || null,
          data.cylinderStatus,
          -data.quantity, // Negative to decrease
          data.movedBy
        );
      }

      // Increase quantity at destination location
      await this.repository.updateInventory(
        data.cylinderTypeId,
        data.toLocationType as any,
        data.toLocationReferenceId || null,
        data.cylinderStatus,
        data.quantity, // Positive to increase
        data.movedBy
      );

      return {
        movementId,
        cylinderTypeId: data.cylinderTypeId,
        fromLocationType: data.fromLocationType,
        toLocationType: data.toLocationType,
        quantity: data.quantity,
        cylinderStatus: data.cylinderStatus,
        movementType: data.movementType,
        movedBy: data.movedBy,
        message: 'Movement processed successfully'
      };
    } catch (error) {
      console.error('Error creating movement:', error);
      throw error instanceof Error ? error : new Error('Failed to create movement');
    }
  }
}
