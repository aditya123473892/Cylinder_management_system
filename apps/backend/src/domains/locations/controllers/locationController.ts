import { Request, Response } from 'express';
import { LocationService } from '../services/locationService';
import { CreateLocationRequest, UpdateLocationRequest } from '../types/location';

export class LocationController {
  private service: LocationService;

  constructor() {
    this.service = new LocationService();
  }

  async getAllLocations(req: Request, res: Response): Promise<void> {
    try {
      const locations = await this.service.getAllLocations();
      res.status(200).json({
        success: true,
        data: locations,
        message: 'Locations retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllLocations:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getLocationById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid location ID'
        });
        return;
      }

      const location = await this.service.getLocationById(id);
      if (!location) {
        res.status(404).json({
          success: false,
          message: 'Location not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: location,
        message: 'Location retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getLocationById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createLocation(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateLocationRequest = req.body;

      const location = await this.service.createLocation(data);
      res.status(201).json({
        success: true,
        data: location,
        message: 'Location created successfully'
      });
    } catch (error) {
      console.error('Error in createLocation:', error);
      const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid location ID'
        });
        return;
      }

      const data: UpdateLocationRequest = req.body;
      const location = await this.service.updateLocation(id, data);

      if (!location) {
        res.status(404).json({
          success: false,
          message: 'Location not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: location,
        message: 'Location updated successfully'
      });
    } catch (error) {
      console.error('Error in updateLocation:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid location ID'
        });
        return;
      }

      const deleted = await this.service.deleteLocation(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Location not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Location deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteLocation:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}