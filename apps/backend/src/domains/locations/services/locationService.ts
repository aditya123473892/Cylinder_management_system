import { LocationRepository } from '../repositories/locationRepository';
import { LocationMaster, CreateLocationRequest, UpdateLocationRequest } from '../types/location';

export class LocationService {
  private repository: LocationRepository;

  constructor() {
    this.repository = new LocationRepository();
  }

  async getAllLocations(): Promise<LocationMaster[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw new Error('Failed to fetch locations');
    }
  }

  async getLocationById(id: number): Promise<LocationMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid location ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching location with id ${id}:`, error);
      throw new Error('Failed to fetch location');
    }
  }

  async createLocation(data: CreateLocationRequest): Promise<LocationMaster> {
    try {
      // Validate required fields
      if (!data.LocationName || data.LocationName.trim().length === 0) {
        throw new Error('Location name is required');
      }
      if (!data.LocationType || data.LocationType.trim().length === 0) {
        throw new Error('Location type is required');
      }

      // Validate field lengths
      if (data.LocationName.length > 100) {
        throw new Error('Location name cannot exceed 100 characters');
      }
      if (data.LocationType.length > 30) {
        throw new Error('Location type cannot exceed 30 characters');
      }
      if (data.Address && data.Address.length > 500) {
        throw new Error('Address cannot exceed 500 characters');
      }
      if (data.Image && data.Image.length > 255) {
        throw new Error('Image path cannot exceed 255 characters');
      }
      if (data.Latitude !== undefined && (data.Latitude < -90 || data.Latitude > 90)) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (data.Longitude !== undefined && (data.Longitude < -180 || data.Longitude > 180)) {
        throw new Error('Longitude must be between -180 and 180');
      }

      return await this.repository.create(data);
    } catch (error) {
      console.error('Error creating location:', error);
      throw error instanceof Error ? error : new Error('Failed to create location');
    }
  }

  async updateLocation(id: number, data: UpdateLocationRequest): Promise<LocationMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid location ID');
      }

      // Check if location exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Location not found');
      }

      // Validate fields if provided
      if (data.LocationName !== undefined) {
        if (data.LocationName.trim().length === 0) {
          throw new Error('Location name cannot be empty');
        }
        if (data.LocationName.length > 100) {
          throw new Error('Location name cannot exceed 100 characters');
        }
      }
      if (data.LocationType !== undefined) {
        if (data.LocationType.trim().length === 0) {
          throw new Error('Location type cannot be empty');
        }
        if (data.LocationType.length > 30) {
          throw new Error('Location type cannot exceed 30 characters');
        }
      }
      if (data.Address !== undefined && data.Address !== null && data.Address.length > 500) {
        throw new Error('Address cannot exceed 500 characters');
      }
      if (data.Image !== undefined && data.Image !== null && data.Image.length > 255) {
        throw new Error('Image path cannot exceed 255 characters');
      }
      if (data.Latitude !== undefined && data.Latitude !== null && (data.Latitude < -90 || data.Latitude > 90)) {
        throw new Error('Latitude must be between -90 and 90');
      }
      if (data.Longitude !== undefined && data.Longitude !== null && (data.Longitude < -180 || data.Longitude > 180)) {
        throw new Error('Longitude must be between -180 and 180');
      }

      const updated = await this.repository.update(id, data);
      if (!updated) {
        throw new Error('Failed to update location');
      }

      return updated;
    } catch (error) {
      console.error(`Error updating location with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to update location');
    }
  }

  async deleteLocation(id: number): Promise<boolean> {
    try {
      if (id <= 0) {
        throw new Error('Invalid location ID');
      }

      // Check if location exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Location not found');
      }

      return await this.repository.delete(id);
    } catch (error) {
      console.error(`Error deleting location with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to delete location');
    }
  }
}
