import { GrRepository } from '../repositories/grRepository';
import { GrWithDelivery, CreateGrRequest, ApproveGrRequest } from '../types/gr';
import { CylinderInventoryService } from '../../cylinder-inventory/services/cylinderInventoryService';
import { DeliveryTransactionService } from '../../delivery/services/deliveryTransactionService';

export class GrService {
  private repository: GrRepository;
  private cylinderInventoryService: CylinderInventoryService;
  private deliveryService: DeliveryTransactionService;

  constructor() {
    this.repository = new GrRepository();
    this.cylinderInventoryService = new CylinderInventoryService();
    this.deliveryService = new DeliveryTransactionService();
  }

  async getAllGrs(): Promise<GrWithDelivery[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching GRs:', error);
      throw new Error('Failed to fetch GRs');
    }
  }

  async getGrById(id: number): Promise<GrWithDelivery | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid GR ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching GR with id ${id}:`, error);
      throw new Error('Failed to fetch GR');
    }
  }

  async createGr(data: CreateGrRequest, createdBy: number): Promise<GrWithDelivery> {
    try {
      // Validate required fields
      if (!data.delivery_id || data.delivery_id <= 0) {
        throw new Error('Valid delivery ID is required');
      }
      if (data.advance_amount < 0) {
        throw new Error('Advance amount cannot be negative');
      }

      // Check if GR already exists for this delivery
      const existingGr = await this.repository.findByDeliveryId(data.delivery_id);
      if (existingGr) {
        throw new Error('GR already exists for this delivery transaction');
      }

      return await this.repository.create(data, createdBy);
    } catch (error) {
      console.error('Error creating GR:', error);
      throw error instanceof Error ? error : new Error('Failed to create GR');
    }
  }

  async approveGr(id: number, data: ApproveGrRequest, approvedBy: number): Promise<GrWithDelivery> {
    try {
      if (id <= 0) {
        throw new Error('Invalid GR ID');
      }

      if (data.advance_amount !== undefined && data.advance_amount < 0) {
        throw new Error('Advance amount cannot be negative');
      }

      // Approve the GR first
      const approvedGr = await this.repository.approve(id, data, approvedBy);

      // Automatically update cylinder inventory: VEHICLE → CUSTOMER
      // This moves cylinders from vehicle to customer when GR is approved
      try {
        // Fetch the delivery transaction to get the lines
        const delivery = await this.deliveryService.getDeliveryTransactionById(approvedGr.delivery_id);
        if (delivery && delivery.lines) {
          for (const line of delivery.lines) {
            if (line.delivered_qty > 0) {
              await this.cylinderInventoryService.recordGrApprovalMovement(
                approvedGr.delivery_id,
                line.cylinder_type_id,
                line.delivered_qty,
                approvedBy
              );
            }
          }
        }
      } catch (inventoryError) {
        console.error('Error updating cylinder inventory for GR approval:', inventoryError);
        // Don't fail GR approval, but log the error
        // GR approval should still succeed even if inventory tracking fails
      }

      return approvedGr;
    } catch (error) {
      console.error('Error approving GR:', error);
      throw error instanceof Error ? error : new Error('Failed to approve GR');
    }
  }

  async finalizeGr(id: number, finalizedBy: number): Promise<GrWithDelivery> {
    try {
      if (id <= 0) {
        throw new Error('Invalid GR ID');
      }

      // Finalize the GR first
      const finalizedGr = await this.repository.finalize(id, finalizedBy);

      // Automatically handle cylinder returns: CUSTOMER → VEHICLE → YARD
      // This processes any returned cylinders when GR is finalized
      try {
        // Fetch the delivery transaction to get the lines with return quantities
        const delivery = await this.deliveryService.getDeliveryTransactionById(finalizedGr.delivery_id);
        if (delivery && delivery.lines) {
          for (const line of delivery.lines) {
            if (line.returned_qty > 0) {
              await this.cylinderInventoryService.recordReturnMovement(
                finalizedGr.delivery_id,
                line.cylinder_type_id,
                line.delivered_qty,
                line.returned_qty,
                finalizedBy
              );
            }
          }
        }
      } catch (inventoryError) {
        console.error('Error processing cylinder returns for GR finalization:', inventoryError);
        // Don't fail GR finalization, but log the error
        // GR finalization should still succeed even if return processing fails
      }

      return finalizedGr;
    } catch (error) {
      console.error('Error finalizing GR:', error);
      throw error instanceof Error ? error : new Error('Failed to finalize GR');
    }
  }

  async closeTrip(id: number, closedBy: number): Promise<GrWithDelivery> {
    try {
      if (id <= 0) {
        throw new Error('Invalid GR ID');
      }

      return await this.repository.closeTrip(id, closedBy);
    } catch (error) {
      console.error('Error closing trip:', error);
      throw error instanceof Error ? error : new Error('Failed to close trip');
    }
  }
}
