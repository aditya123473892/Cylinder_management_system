import { VehicleRepository } from '../repositories/vehicleRepository';
import { VehicleMaster, CreateVehicleRequest, UpdateVehicleRequest } from '../types/vehicle';

export class VehicleService {
  private repository: VehicleRepository;

  constructor() {
    this.repository = new VehicleRepository();
  }

  async getAllVehicles(): Promise<VehicleMaster[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw new Error('Failed to fetch vehicles');
    }
  }

  async getVehicleById(id: number): Promise<VehicleMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid vehicle ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching vehicle with id ${id}:`, error);
      throw new Error('Failed to fetch vehicle');
    }
  }

  async createVehicle(data: CreateVehicleRequest): Promise<VehicleMaster> {
    try {
      // Validate required fields
      if (!data.vehicle_number || data.vehicle_number.trim().length === 0) {
        throw new Error('Vehicle number is required');
      }
      if (!data.vehicle_type || data.vehicle_type.trim().length === 0) {
        throw new Error('Vehicle type is required');
      }
      if (!data.capacity_tonnes || data.capacity_tonnes <= 0) {
        throw new Error('Capacity in tonnes must be a positive number');
      }

      // Validate lengths
      if (data.vehicle_number.length > 20) {
        throw new Error('Vehicle number cannot exceed 20 characters');
      }
      if (data.vehicle_type.length > 50) {
        throw new Error('Vehicle type cannot exceed 50 characters');
      }

      // Check if vehicle number already exists
      const vehicleNumberExists = await this.repository.vehicleNumberExists(data.vehicle_number);
      if (vehicleNumberExists) {
        throw new Error('Vehicle number already exists');
      }

      return await this.repository.create(data);
    } catch (error) {
      console.error('Error creating vehicle:', error);
      throw error instanceof Error ? error : new Error('Failed to create vehicle');
    }
  }

  async updateVehicle(id: number, data: UpdateVehicleRequest): Promise<VehicleMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid vehicle ID');
      }

      // Check if vehicle exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Vehicle not found');
      }

      // Validate fields if provided
      if (data.vehicle_number !== undefined) {
        if (data.vehicle_number.trim().length === 0) {
          throw new Error('Vehicle number cannot be empty');
        }
        if (data.vehicle_number.length > 20) {
          throw new Error('Vehicle number cannot exceed 20 characters');
        }
        // Check if vehicle number already exists (excluding current vehicle)
        const vehicleNumberExists = await this.repository.vehicleNumberExists(data.vehicle_number, id);
        if (vehicleNumberExists) {
          throw new Error('Vehicle number already exists');
        }
      }

      if (data.vehicle_type !== undefined) {
        if (data.vehicle_type.trim().length === 0) {
          throw new Error('Vehicle type cannot be empty');
        }
        if (data.vehicle_type.length > 50) {
          throw new Error('Vehicle type cannot exceed 50 characters');
        }
      }

      if (data.capacity_tonnes !== undefined && data.capacity_tonnes <= 0) {
        throw new Error('Capacity in tonnes must be a positive number');
      }

      const updated = await this.repository.update(id, data);
      if (!updated) {
        throw new Error('Failed to update vehicle');
      }

      return updated;
    } catch (error) {
      console.error(`Error updating vehicle with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to update vehicle');
    }
  }

  async deleteVehicle(id: number): Promise<boolean> {
    try {
      if (id <= 0) {
        throw new Error('Invalid vehicle ID');
      }

      // Check if vehicle exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Vehicle not found');
      }

      return await this.repository.delete(id);
    } catch (error) {
      console.error(`Error deleting vehicle with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to delete vehicle');
    }
  }
}
