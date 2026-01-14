import { RateContractRepository } from '../repositories/rateContractRepository';
import { RateContractMaster, CreateRateContractRequest, UpdateRateContractRequest } from '../types/rateContract';

export class RateContractService {
  private repository: RateContractRepository;

  constructor() {
    this.repository = new RateContractRepository();
  }

  async getAllRateContracts(): Promise<RateContractMaster[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching rate contracts:', error);
      throw new Error('Failed to fetch rate contracts');
    }
  }

  async getRateContractById(id: number): Promise<RateContractMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid rate contract ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching rate contract with id ${id}:`, error);
      throw new Error('Failed to fetch rate contract');
    }
  }

  async getActiveRateContracts(customerType: string, cylinderTypeId: number, effectiveDate: string): Promise<RateContractMaster[]> {
    try {
      if (!customerType || cylinderTypeId <= 0 || !effectiveDate) {
        throw new Error('Invalid parameters for rate contract lookup');
      }
      return await this.repository.findActiveContracts(customerType, cylinderTypeId, effectiveDate);
    } catch (error) {
      console.error('Error fetching active rate contracts:', error);
      throw new Error('Failed to fetch active rate contracts');
    }
  }

  async createRateContract(data: CreateRateContractRequest): Promise<RateContractMaster> {
    try {
      // Validate required fields
      if (!data.contract_name || data.contract_name.trim().length === 0) {
        throw new Error('Contract name is required');
      }
      if (!data.customer_type || !['DIRECT', 'SUB_DEALER', 'ALL'].includes(data.customer_type)) {
        throw new Error('Valid customer type is required (DIRECT, SUB_DEALER, or ALL)');
      }
      if (!data.cylinder_type_id || data.cylinder_type_id <= 0) {
        throw new Error('Valid cylinder type ID is required');
      }
      if (!data.rate_per_cylinder || data.rate_per_cylinder <= 0) {
        throw new Error('Rate per cylinder must be a positive number');
      }
      if (!data.valid_from || !data.valid_to) {
        throw new Error('Valid from and to dates are required');
      }

      // Validate lengths
      if (data.contract_name.length > 100) {
        throw new Error('Contract name cannot exceed 100 characters');
      }

      // Validate date range
      const validFrom = new Date(data.valid_from);
      const validTo = new Date(data.valid_to);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (validFrom >= validTo) {
        throw new Error('Valid to date must be after valid from date');
      }

      if (validTo < today) {
        throw new Error('Valid to date cannot be in the past');
      }

      return await this.repository.create(data);
    } catch (error) {
      console.error('Error creating rate contract:', error);
      throw error instanceof Error ? error : new Error('Failed to create rate contract');
    }
  }

  async updateRateContract(id: number, data: UpdateRateContractRequest): Promise<RateContractMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid rate contract ID');
      }

      // Check if contract exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Rate contract not found');
      }

      // Validate fields if provided
      if (data.contract_name !== undefined) {
        if (data.contract_name.trim().length === 0) {
          throw new Error('Contract name cannot be empty');
        }
        if (data.contract_name.length > 100) {
          throw new Error('Contract name cannot exceed 100 characters');
        }
      }

      if (data.customer_type !== undefined && !['DIRECT', 'SUB_DEALER', 'ALL'].includes(data.customer_type)) {
        throw new Error('Invalid customer type (must be DIRECT, SUB_DEALER, or ALL)');
      }

      if (data.cylinder_type_id !== undefined && data.cylinder_type_id <= 0) {
        throw new Error('Valid cylinder type ID is required');
      }

      if (data.rate_per_cylinder !== undefined && data.rate_per_cylinder <= 0) {
        throw new Error('Rate per cylinder must be a positive number');
      }

      // Validate date range if both dates are provided
      if (data.valid_from && data.valid_to) {
        const validFrom = new Date(data.valid_from);
        const validTo = new Date(data.valid_to);
        if (validFrom >= validTo) {
          throw new Error('Valid to date must be after valid from date');
        }
      } else if (data.valid_from || data.valid_to) {
        // If only one date is being updated, we need to check against existing dates
        const existing = await this.repository.findById(id);
        if (existing) {
          const validFrom = data.valid_from ? new Date(data.valid_from) : new Date(existing.valid_from);
          const validTo = data.valid_to ? new Date(data.valid_to) : new Date(existing.valid_to);
          if (validFrom >= validTo) {
            throw new Error('Valid to date must be after valid from date');
          }
        }
      }

      const updated = await this.repository.update(id, data);
      if (!updated) {
        throw new Error('Failed to update rate contract');
      }

      return updated;
    } catch (error) {
      console.error(`Error updating rate contract with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to update rate contract');
    }
  }

  async deleteRateContract(id: number): Promise<boolean> {
    try {
      if (id <= 0) {
        throw new Error('Invalid rate contract ID');
      }

      // Check if contract exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Rate contract not found');
      }

      return await this.repository.delete(id);
    } catch (error) {
      console.error(`Error deleting rate contract with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to delete rate contract');
    }
  }
}
