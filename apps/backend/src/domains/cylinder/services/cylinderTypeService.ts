import { CylinderTypeRepository } from '../repositories/cylinderTypeRepository';
import { CylinderTypeMaster, CreateCylinderTypeRequest, UpdateCylinderTypeRequest } from '../types/cylinderType';

export class CylinderTypeService {
  private repository: CylinderTypeRepository;

  constructor() {
    this.repository = new CylinderTypeRepository();
  }

  async getAllCylinderTypes(): Promise<CylinderTypeMaster[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching cylinder types:', error);
      throw new Error('Failed to fetch cylinder types');
    }
  }

  async getCylinderTypeById(id: number): Promise<CylinderTypeMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid cylinder type ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching cylinder type with id ${id}:`, error);
      throw new Error('Failed to fetch cylinder type');
    }
  }

  async createCylinderType(data: CreateCylinderTypeRequest): Promise<CylinderTypeMaster> {
    try {
      // Validate required fields
      if (!data.Capacity || data.Capacity.trim().length === 0) {
        throw new Error('Capacity is required');
      }

      // Validate capacity format (should be a valid capacity value)
      if (data.Capacity.length > 20) {
        throw new Error('Capacity cannot exceed 20 characters');
      }

      // Validate HeightCM if provided
      if (data.HeightCM !== undefined && (data.HeightCM <= 0 || data.HeightCM > 999.99)) {
        throw new Error('HeightCM must be a positive number less than 1000');
      }

      // Validate ManufacturingDate if provided
      if (data.ManufacturingDate) {
        const date = new Date(data.ManufacturingDate);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid manufacturing date format');
        }
      }

      return await this.repository.create(data);
    } catch (error) {
      console.error('Error creating cylinder type:', error);
      throw error instanceof Error ? error : new Error('Failed to create cylinder type');
    }
  }

  async updateCylinderType(id: number, data: UpdateCylinderTypeRequest): Promise<CylinderTypeMaster | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid cylinder type ID');
      }

      // Check if cylinder type exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Cylinder type not found');
      }

      // Validate fields if provided
      if (data.Capacity !== undefined) {
        if (data.Capacity.trim().length === 0) {
          throw new Error('Capacity cannot be empty');
        }
        if (data.Capacity.length > 20) {
          throw new Error('Capacity cannot exceed 20 characters');
        }
      }

      if (data.HeightCM !== undefined && data.HeightCM !== null && (data.HeightCM <= 0 || data.HeightCM > 999.99)) {
        throw new Error('HeightCM must be a positive number less than 1000');
      }

      if (data.ManufacturingDate !== undefined && data.ManufacturingDate !== null) {
        const date = new Date(data.ManufacturingDate);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid manufacturing date format');
        }
      }

      const updated = await this.repository.update(id, data);
      if (!updated) {
        throw new Error('Failed to update cylinder type');
      }

      return updated;
    } catch (error) {
      console.error(`Error updating cylinder type with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to update cylinder type');
    }
  }

  async deleteCylinderType(id: number): Promise<boolean> {
    try {
      if (id <= 0) {
        throw new Error('Invalid cylinder type ID');
      }

      // Check if cylinder type exists
      const exists = await this.repository.exists(id);
      if (!exists) {
        throw new Error('Cylinder type not found');
      }

      return await this.repository.delete(id);
    } catch (error) {
      console.error(`Error deleting cylinder type with id ${id}:`, error);
      throw error instanceof Error ? error : new Error('Failed to delete cylinder type');
    }
  }
}