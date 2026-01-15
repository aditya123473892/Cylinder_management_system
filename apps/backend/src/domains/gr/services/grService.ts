import { GrRepository } from '../repositories/grRepository';
import { GrWithDelivery, CreateGrRequest, ApproveGrRequest } from '../types/gr';

export class GrService {
  private repository: GrRepository;

  constructor() {
    this.repository = new GrRepository();
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

      return await this.repository.approve(id, data, approvedBy);
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

      return await this.repository.finalize(id, finalizedBy);
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
