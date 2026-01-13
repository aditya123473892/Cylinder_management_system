import { DriverRepository } from '../repositories/driverRepository';
import { DriverMaster, CreateDriverRequest, UpdateDriverRequest } from '../types/driver';

export class DriverService {
  private repository: DriverRepository;

  constructor() {
    this.repository = new DriverRepository();
  }

  async getAllDrivers(): Promise<DriverMaster[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching drivers:', error);
      throw new Error('Failed to fetch drivers');
    }
  }

  async getDriverById(id: number): Promise<DriverMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid driver ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching driver with id ${id}:`, error);
      throw new Error('Failed to fetch driver');
    }
  }

  async createDriver(data: CreateDriverRequest): Promise<DriverMaster> {
    try {
      // Validate required fields
      if (!data.driver_name || data.driver_name.trim().length === 0) {
        throw new Error('Driver name is required');
      }
      if (!data.mobile_number || data.mobile_number.trim().length === 0) {
        throw new Error('Mobile number is required');
      }
      if (!data.license_number || data.license_number.trim().length === 0) {
        throw new Error('License number is required');
      }
      if (!data.license_expiry_date) {
        throw new Error('License expiry date is required');
      }

      // Validate lengths
      if (data.driver_name.length > 100) {
        throw new Error('Driver name cannot exceed 100 characters');
      }
      if (data.mobile_number.length > 15) {
        throw new Error('Mobile number cannot exceed 15 characters');
      }
      if (data.license_number.length > 50) {
        throw new Error('License number cannot exceed 50 characters');
      }

      // Validate mobile number format (basic check)
      const mobileRegex = /^[0-9+\-\s()]+$/;
      if (!mobileRegex.test(data.mobile_number)) {
        throw new Error('Invalid mobile number format');
      }

      // Validate license expiry date is not in the past
      const expiryDate = new Date(data.license_expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate < today) {
        throw new Error('License expiry date cannot be in the past');
      }

      // Check if license number already exists
      const licenseExists = await this.repository.licenseNumberExists(data.license_number);
      if (licenseExists) {
        throw new Error('License number already exists');
      }

      // Check if mobile number already exists
      const mobileExists = await this.repository.mobileNumberExists(data.mobile_number);
      if (mobileExists) {
        throw new Error('Mobile number already exists');
      }

      return await this.repository.create(data);
    } catch (error) {
      console.error('Error creating driver:', error);
      throw error instanceof Error ? error : new Error('Failed to create driver');
    }
  }

  async updateDriver(id: number, data: UpdateDriverRequest): Promise<DriverMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid driver ID');
      }

      // Check if driver exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Driver not found');
      }

      // Validate fields if provided
      if (data.driver_name !== undefined) {
        if (data.driver_name.trim().length === 0) {
          throw new Error('Driver name cannot be empty');
        }
        if (data.driver_name.length > 100) {
          throw new Error('Driver name cannot exceed 100 characters');
        }
      }

      if (data.mobile_number !== undefined) {
        if (data.mobile_number.trim().length === 0) {
          throw new Error('Mobile number cannot be empty');
        }
        if (data.mobile_number.length > 15) {
          throw new Error('Mobile number cannot exceed 15 characters');
        }
        const mobileRegex = /^[0-9+\-\s()]+$/;
        if (!mobileRegex.test(data.mobile_number)) {
          throw new Error('Invalid mobile number format');
        }
        // Check if mobile number already exists (excluding current driver)
        const mobileExists = await this.repository.mobileNumberExists(data.mobile_number, id);
        if (mobileExists) {
          throw new Error('Mobile number already exists');
        }
      }

      if (data.license_number !== undefined) {
        if (data.license_number.trim().length === 0) {
          throw new Error('License number cannot be empty');
        }
        if (data.license_number.length > 50) {
          throw new Error('License number cannot exceed 50 characters');
        }
        // Check if license number already exists (excluding current driver)
        const licenseExists = await this.repository.licenseNumberExists(data.license_number, id);
        if (licenseExists) {
          throw new Error('License number already exists');
        }
      }

      if (data.license_expiry_date !== undefined) {
        const expiryDate = new Date(data.license_expiry_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (expiryDate < today) {
          throw new Error('License expiry date cannot be in the past');
        }
      }

      const updated = await this.repository.update(id, data);
      if (!updated) {
        throw new Error('Failed to update driver');
      }

      return updated;
    } catch (error) {
      console.error(`Error updating driver with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to update driver');
    }
  }

  async deleteDriver(id: number): Promise<boolean> {
    try {
      if (id <= 0) {
        throw new Error('Invalid driver ID');
      }

      // Check if driver exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Driver not found');
      }

      return await this.repository.delete(id);
    } catch (error) {
      console.error(`Error deleting driver with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to delete driver');
    }
  }
}
