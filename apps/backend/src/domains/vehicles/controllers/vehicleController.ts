import { Request, Response } from 'express';
import { VehicleService } from '../services/vehicleService';
import { CreateVehicleRequest, UpdateVehicleRequest } from '../types/vehicle';

export class VehicleController {
  private service: VehicleService;

  constructor() {
    this.service = new VehicleService();
  }

  async getAllVehicles(req: Request, res: Response): Promise<void> {
    try {
      const vehicles = await this.service.getAllVehicles();
      res.status(200).json({
        success: true,
        data: vehicles,
        message: 'Vehicles retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllVehicles:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getVehicleById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid vehicle ID'
        });
        return;
      }

      const vehicle = await this.service.getVehicleById(id);
      if (!vehicle) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Vehicle retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getVehicleById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createVehicle(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateVehicleRequest = req.body;

      const vehicle = await this.service.createVehicle(data);
      res.status(201).json({
        success: true,
        data: vehicle,
        message: 'Vehicle created successfully'
      });
    } catch (error) {
      console.error('Error in createVehicle:', error);
      const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async updateVehicle(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid vehicle ID'
        });
        return;
      }

      const data: UpdateVehicleRequest = req.body;
      const vehicle = await this.service.updateVehicle(id, data);

      if (!vehicle) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: vehicle,
        message: 'Vehicle updated successfully'
      });
    } catch (error) {
      console.error('Error in updateVehicle:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async deleteVehicle(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid vehicle ID'
        });
        return;
      }

      const deleted = await this.service.deleteVehicle(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Vehicle not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Vehicle deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteVehicle:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
