import { GRRepository } from '../repositories/grRepository';
import { GR, GRWithDeliveryDetails, CreateGRRequest, ApproveGRRequest, GRPreviewData } from '../types/gr';

export class GRService {
  private repository: GRRepository;

  constructor() {
    this.repository = new GRRepository();
  }

  async getAllGRs(): Promise<GRWithDeliveryDetails[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching GRs:', error);
      throw new Error('Failed to fetch GRs');
    }
  }

  async getGRById(id: number): Promise<GRWithDeliveryDetails | null> {
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

  async getApprovedGRs(): Promise<GRWithDeliveryDetails[]> {
    try {
      return await this.repository.findApproved();
    } catch (error) {
      console.error('Error fetching approved GRs:', error);
      throw new Error('Failed to fetch approved GRs');
    }
  }

  async getGRPreview(deliveryId: number): Promise<GRPreviewData | null> {
    try {
      if (deliveryId <= 0) {
        throw new Error('Invalid delivery ID');
      }
      return await this.repository.getGRPreviewData(deliveryId);
    } catch (error) {
      console.error(`Error fetching GR preview for delivery ${deliveryId}:`, error);
      throw new Error('Failed to fetch GR preview data');
    }
  }

  async createGR(data: CreateGRRequest, createdBy: number): Promise<GR> {
    try {
      // Validate required fields
      if (!data.delivery_id || data.delivery_id <= 0) {
        throw new Error('Valid delivery ID is required');
      }

      // Validate advance amount
      if (data.advance_amount !== undefined && data.advance_amount < 0) {
        throw new Error('Advance amount cannot be negative');
      }

      return await this.repository.create(data, createdBy);
    } catch (error) {
      console.error('Error creating GR:', error);
      throw error instanceof Error ? error : new Error('Failed to create GR');
    }
  }

  async approveGR(id: number, data: ApproveGRRequest, approvedBy: number): Promise<GR> {
    try {
      if (id <= 0) {
        throw new Error('Invalid GR ID');
      }

      // Validate advance amount
      if (data.advance_amount < 0) {
        throw new Error('Advance amount cannot be negative');
      }

      return await this.repository.approve(id, data.advance_amount, approvedBy);
    } catch (error) {
      console.error(`Error approving GR ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to approve GR');
    }
  }

  async finalizeGR(id: number, finalizedBy: number): Promise<GR> {
    try {
      if (id <= 0) {
        throw new Error('Invalid GR ID');
      }

      return await this.repository.finalize(id, finalizedBy);
    } catch (error) {
      console.error(`Error finalizing GR ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to finalize GR');
    }
  }

  async checkGRExists(deliveryId: number): Promise<boolean> {
    try {
      const gr = await this.repository.findByDeliveryId(deliveryId);
      return gr !== null;
    } catch (error) {
      console.error(`Error checking GR existence for delivery ${deliveryId}:`, error);
      return false;
    }
  }
}
