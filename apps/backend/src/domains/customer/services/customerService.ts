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
      if (!data.CustomerType || data.CustomerType.trim().length === 0) {
        throw new Error('Customer type is required');
      }
      if (!data.LocationId || data.LocationId <= 0) {
        throw new Error('Valid location ID is required');
      }
      if (data.RetentionDays < 0) {
        throw new Error('Retention days must be non-negative');
      }

      // Validate lengths
      if (data.CustomerName.length > 200) {
        throw new Error('Customer name cannot exceed 200 characters');
      }
      if (data.CustomerType.length > 20) {
        throw new Error('Customer type cannot exceed 20 characters');
      }

      // Validate parent customer if provided
      if (data.ParentCustomerId !== undefined && data.ParentCustomerId !== null) {
        if (data.ParentCustomerId <= 0) {
          throw new Error('Invalid parent customer ID');
        }
        // Check if parent customer exists
        const parentExists = await this.repository.exists(data.ParentCustomerId);
        if (!parentExists) {
          throw new Error('Parent customer does not exist');
        }
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

      if (data.CustomerType !== undefined) {
        if (data.CustomerType.trim().length === 0) {
          throw new Error('Customer type cannot be empty');
        }
        if (data.CustomerType.length > 20) {
          throw new Error('Customer type cannot exceed 20 characters');
        }
      }

      if (data.LocationId !== undefined && data.LocationId <= 0) {
        throw new Error('Invalid location ID');
      }

      if (data.RetentionDays !== undefined && data.RetentionDays < 0) {
        throw new Error('Retention days must be non-negative');
      }

      // Validate parent customer if provided
      if (data.ParentCustomerId !== undefined && data.ParentCustomerId !== null) {
        if (data.ParentCustomerId <= 0) {
          throw new Error('Invalid parent customer ID');
        }
        // Check if parent customer exists
        const parentExists = await this.repository.exists(data.ParentCustomerId);
        if (!parentExists) {
          throw new Error('Parent customer does not exist');
        }
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
      const hasChildren = allCustomers.some(customer => customer.ParentCustomerId === id);
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
