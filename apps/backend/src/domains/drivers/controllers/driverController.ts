import { Request, Response } from 'express';
import { DriverService } from '../services/driverService';
import { CreateDriverRequest, UpdateDriverRequest } from '../types/driver';

export class DriverController {
  private service: DriverService;

  constructor() {
    this.service = new DriverService();
  }

  async getAllDrivers(req: Request, res: Response): Promise<void> {
    try {
      const drivers = await this.service.getAllDrivers();
      res.status(200).json({
        success: true,
        data: drivers,
        message: 'Drivers retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllDrivers:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getDriverById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid driver ID'
        });
        return;
      }

      const driver = await this.service.getDriverById(id);
      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: driver,
        message: 'Driver retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getDriverById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createDriver(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateDriverRequest = req.body;

      const driver = await this.service.createDriver(data);
      res.status(201).json({
        success: true,
        data: driver,
        message: 'Driver created successfully'
      });
    } catch (error) {
      console.error('Error in createDriver:', error);
      const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async updateDriver(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid driver ID'
        });
        return;
      }

      const data: UpdateDriverRequest = req.body;
      const driver = await this.service.updateDriver(id, data);

      if (!driver) {
        res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: driver,
        message: 'Driver updated successfully'
      });
    } catch (error) {
      console.error('Error in updateDriver:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async deleteDriver(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid driver ID'
        });
        return;
      }

      const deleted = await this.service.deleteDriver(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Driver not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Driver deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteDriver:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
