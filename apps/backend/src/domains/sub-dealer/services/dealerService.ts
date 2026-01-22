import { DealerRepository } from '../repositories/dealerRepository';
import { DealerMaster, CreateDealerRequest, UpdateDealerRequest } from '../types/dealer';

export class DealerService {
  private repository: DealerRepository;

  constructor() {
    this.repository = new DealerRepository();
  }

  async getAllDealers(): Promise<DealerMaster[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching dealers:', error);
      throw new Error('Failed to fetch dealers');
    }
  }

  async getDealerById(id: number): Promise<DealerMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid dealer ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching dealer with id ${id}:`, error);
      throw new Error('Failed to fetch dealer');
    }
  }

  async createDealer(data: CreateDealerRequest): Promise<DealerMaster> {
    try {
      // Validate required fields
      if (!data.DealerName || data.DealerName.trim().length === 0) {
        throw new Error('Dealer name is required');
      }
      if (!data.DealerType || data.DealerType.trim().length === 0) {
        throw new Error('Dealer type is required');
      }
      if (!data.LocationId || data.LocationId <= 0) {
        throw new Error('Valid location ID is required');
      }

      // Validate lengths
      if (data.DealerName.length > 200) {
        throw new Error('Dealer name cannot exceed 200 characters');
      }
      if (data.DealerType.length > 20) {
        throw new Error('Dealer type cannot exceed 20 characters');
      }

      // Validate parent dealer if provided
      if (data.ParentDealerId !== undefined && data.ParentDealerId !== null) {
        if (data.ParentDealerId <= 0) {
          throw new Error('Invalid parent dealer ID');
        }
        // Check if parent dealer exists
        const parentExists = await this.repository.exists(data.ParentDealerId);
        if (!parentExists) {
          throw new Error('Parent dealer does not exist');
        }
      }

      return await this.repository.create(data);
    } catch (error) {
      console.error('Error creating dealer:', error);
      throw error instanceof Error ? error : new Error('Failed to create dealer');
    }
  }

  async updateDealer(id: number, data: UpdateDealerRequest): Promise<DealerMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid dealer ID');
      }

      // Check if dealer exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Dealer not found');
      }

      // Validate fields if provided
      if (data.DealerName !== undefined) {
        if (data.DealerName.trim().length === 0) {
          throw new Error('Dealer name cannot be empty');
        }
        if (data.DealerName.length > 200) {
          throw new Error('Dealer name cannot exceed 200 characters');
        }
      }

      if (data.DealerType !== undefined) {
        if (data.DealerType.trim().length === 0) {
          throw new Error('Dealer type cannot be empty');
        }
        if (data.DealerType.length > 20) {
          throw new Error('Dealer type cannot exceed 20 characters');
        }
      }

      if (data.LocationId !== undefined && data.LocationId <= 0) {
        throw new Error('Invalid location ID');
      }

      // Validate parent dealer if provided
      if (data.ParentDealerId !== undefined && data.ParentDealerId !== null) {
        if (data.ParentDealerId <= 0) {
          throw new Error('Invalid parent dealer ID');
        }
        // Check if parent dealer exists
        const parentExists = await this.repository.exists(data.ParentDealerId);
        if (!parentExists) {
          throw new Error('Parent dealer does not exist');
        }
      }

      const updated = await this.repository.update(id, data);
      if (!updated) {
        throw new Error('Failed to update dealer');
      }

      return updated;
    } catch (error) {
      console.error(`Error updating dealer with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to update dealer');
    }
  }

  async deleteDealer(id: number): Promise<boolean> {
    try {
      if (id <= 0) {
        throw new Error('Invalid dealer ID');
      }

      // Check if dealer exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Dealer not found');
      }

      // Check if dealer has child dealers
      const allDealers = await this.repository.findAll();
      const hasChildren = allDealers.some(dealer => dealer.ParentDealerId === id);
      if (hasChildren) {
        throw new Error('Cannot delete dealer with child dealers');
      }

      return await this.repository.delete(id);
    } catch (error) {
      console.error(`Error deleting dealer with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to delete dealer');
    }
  }
}
