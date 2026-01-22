import { CustomerRepository } from '../repositories/customerRepository';
import { CustomerMaster, CreateCustomerRequest, UpdateCustomerRequest } from '../types/customer';

export class CustomerService {
  private repository: CustomerRepository;

  constructor() {
    this.repository = new CustomerRepository();
  }

  async getAllCustomers(): Promise<CustomerMaster[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw new Error('Failed to fetch customers');
    }
  }

  async getCustomerById(id: number): Promise<CustomerMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid customer ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching customer with id ${id}:`, error);
      throw new Error('Failed to fetch customer');
    }
  }

  async createCustomer(data: CreateCustomerRequest): Promise<CustomerMaster> {
    try {
      // Validate required fields
      if (!data.CustomerName || data.CustomerName.trim().length === 0) {
        throw new Error('Customer name is required');
      }
      if (!data.Location || data.Location.trim().length === 0) {
        throw new Error('Location is required');
      }

      // Validate lengths
      if (data.CustomerName.length > 200) {
        throw new Error('Customer name cannot exceed 200 characters');
      }

      // Validate location
      if (!data.Location || data.Location.trim().length === 0) {
        throw new Error('Location is required');
      }
      if (data.Location.length > 200) {
        throw new Error('Location cannot exceed 200 characters');
      }

      // Validate parent dealer if provided
      if (data.ParentDealerId !== undefined && data.ParentDealerId !== null) {
        if (data.ParentDealerId <= 0) {
          throw new Error('Invalid parent dealer ID');
        }
        // TODO: Check if parent dealer exists (would need dealer repository)
        // For now, just validate the ID is positive
      }

      return await this.repository.create(data);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error instanceof Error ? error : new Error('Failed to create customer');
    }
  }

  async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<CustomerMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid customer ID');
      }

      // Check if customer exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Customer not found');
      }

      // Validate fields if provided
      if (data.CustomerName !== undefined) {
        if (data.CustomerName.trim().length === 0) {
          throw new Error('Customer name cannot be empty');
        }
        if (data.CustomerName.length > 200) {
          throw new Error('Customer name cannot exceed 200 characters');
        }
      }

      if (data.Location !== undefined) {
        if (data.Location.trim().length === 0) {
          throw new Error('Location cannot be empty');
        }
        if (data.Location.length > 200) {
          throw new Error('Location cannot exceed 200 characters');
        }
      }

      // Validate parent dealer if provided
      if (data.ParentDealerId !== undefined && data.ParentDealerId !== null) {
        if (data.ParentDealerId <= 0) {
          throw new Error('Invalid parent dealer ID');
        }
        // TODO: Check if parent dealer exists (would need dealer repository)
        // For now, just validate the ID is positive
      }

      const updated = await this.repository.update(id, data);
      if (!updated) {
        throw new Error('Failed to update customer');
      }

      return updated;
    } catch (error) {
      console.error(`Error updating customer with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to update customer');
    }
  }

  async deleteCustomer(id: number): Promise<boolean> {
    try {
      if (id <= 0) {
        throw new Error('Invalid customer ID');
      }

      // Check if customer exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Customer not found');
      }

      // Check if customer has child customers
      const allCustomers = await this.repository.findAll();
      const hasChildren = allCustomers.some(customer => customer.ParentDealerId === id);
      if (hasChildren) {
        throw new Error('Cannot delete customer with child customers');
      }

      return await this.repository.delete(id);
    } catch (error) {
      console.error(`Error deleting customer with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to delete customer');
    }
  }
}
