import { RateContractRepository } from '../repositories/rateContractRepository';
import { RateContractMaster, CreateRateContractRequest, UpdateRateContractRequest, RateContractDetail } from '../types/rateContract';

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

  async getActiveRateContracts(customerId?: number, dealerId?: number, effectiveDate?: string): Promise<RateContractMaster[]> {
    try {
      return await this.repository.findActiveContracts(customerId, dealerId, effectiveDate);
    } catch (error) {
      console.error('Error fetching active rate contracts:', error);
      throw new Error('Failed to fetch active rate contracts');
    }
  }

  async getActiveRateForCylinder(customerId?: number, dealerId?: number, cylinderTypeId?: number, effectiveDate?: string): Promise<RateContractDetail | null> {
    try {
      if (!cylinderTypeId || cylinderTypeId <= 0) {
        throw new Error('Valid cylinder type ID is required');
      }
      return await this.repository.findActiveContractForCylinder(customerId, dealerId, cylinderTypeId, effectiveDate);
    } catch (error) {
      console.error('Error fetching active rate for cylinder:', error);
      throw new Error('Failed to fetch active rate for cylinder');
    }
  }

  async createRateContract(data: CreateRateContractRequest): Promise<RateContractMaster> {
    try {
      // Validate required fields
      if (!data.contract_name || data.contract_name.trim().length === 0) {
        throw new Error('Contract name is required');
      }

      // Must have either customer_id or dealer_id, but not both
      if ((!data.customer_id && !data.dealer_id) || (data.customer_id && data.dealer_id)) {
        throw new Error('Must specify either a customer or dealer, but not both');
      }

      if (data.customer_id && data.customer_id <= 0) {
        throw new Error('Valid customer ID is required');
      }

      if (data.dealer_id && data.dealer_id <= 0) {
        throw new Error('Valid dealer ID is required');
      }

      // Check if entity already has a contract (one contract per entity rule)
      const existingContracts = await this.repository.findActiveContracts(
        data.customer_id || undefined,
        data.dealer_id || undefined
      );

      if (existingContracts.length > 0) {
        throw new Error('This customer/dealer already has an active rate contract. Only one contract per entity is allowed.');
      }

      // Validate rates
      if (!data.rates || !Array.isArray(data.rates) || data.rates.length === 0) {
        throw new Error('At least one rate must be specified');
      }

      // Validate each rate
      for (const rate of data.rates) {
        if (!rate.cylinder_type_id || rate.cylinder_type_id <= 0) {
          throw new Error('Valid cylinder type ID is required for each rate');
        }
        if (!rate.rate_per_cylinder || rate.rate_per_cylinder <= 0) {
          throw new Error('Rate per cylinder must be a positive number');
        }
      }

      // Check for duplicate cylinder types
      const cylinderTypeIds = data.rates.map(r => r.cylinder_type_id);
      if (new Set(cylinderTypeIds).size !== cylinderTypeIds.length) {
        throw new Error('Duplicate cylinder types are not allowed in the same contract');
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

      // Validate customer/dealer assignment
      if (data.customer_id !== undefined && data.dealer_id !== undefined) {
        if ((!data.customer_id && !data.dealer_id) || (data.customer_id && data.dealer_id)) {
          throw new Error('Must specify either a customer or dealer, but not both');
        }
      }

      if (data.customer_id !== undefined && data.customer_id <= 0) {
        throw new Error('Valid customer ID is required');
      }

      if (data.dealer_id !== undefined && data.dealer_id <= 0) {
        throw new Error('Valid dealer ID is required');
      }

      // Validate rates if provided
      if (data.rates !== undefined) {
        if (!Array.isArray(data.rates) || data.rates.length === 0) {
          throw new Error('At least one rate must be specified');
        }

        // Validate each rate
        for (const rate of data.rates) {
          if (!rate.cylinder_type_id || rate.cylinder_type_id <= 0) {
            throw new Error('Valid cylinder type ID is required for each rate');
          }
          if (!rate.rate_per_cylinder || rate.rate_per_cylinder <= 0) {
            throw new Error('Rate per cylinder must be a positive number');
          }
        }

        // Check for duplicate cylinder types
        const cylinderTypeIds = data.rates.map(r => r.cylinder_type_id);
        if (new Set(cylinderTypeIds).size !== cylinderTypeIds.length) {
          throw new Error('Duplicate cylinder types are not allowed in the same contract');
        }
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
