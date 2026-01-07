import { Request, Response } from 'express';
import { CylinderTypeService } from '../services/cylinderTypeService';
import { CreateCylinderTypeRequest, UpdateCylinderTypeRequest } from '../types/cylinderType';

export class CylinderTypeController {
  private service: CylinderTypeService;

  constructor() {
    this.service = new CylinderTypeService();
  }

  async getAllCylinderTypes(req: Request, res: Response): Promise<void> {
    try {
      const cylinderTypes = await this.service.getAllCylinderTypes();
      res.status(200).json({
        success: true,
        data: cylinderTypes,
        message: 'Cylinder types retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllCylinderTypes:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getCylinderTypeById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cylinder type ID'
        });
        return;
      }

      const cylinderType = await this.service.getCylinderTypeById(id);
      if (!cylinderType) {
        res.status(404).json({
          success: false,
          message: 'Cylinder type not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: cylinderType,
        message: 'Cylinder type retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getCylinderTypeById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createCylinderType(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCylinderTypeRequest = req.body;

      const cylinderType = await this.service.createCylinderType(data);
      res.status(201).json({
        success: true,
        data: cylinderType,
        message: 'Cylinder type created successfully'
      });
    } catch (error) {
      console.error('Error in createCylinderType:', error);
      const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async updateCylinderType(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cylinder type ID'
        });
        return;
      }

      const data: UpdateCylinderTypeRequest = req.body;
      const cylinderType = await this.service.updateCylinderType(id, data);

      if (!cylinderType) {
        res.status(404).json({
          success: false,
          message: 'Cylinder type not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: cylinderType,
        message: 'Cylinder type updated successfully'
      });
    } catch (error) {
      console.error('Error in updateCylinderType:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async deleteCylinderType(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cylinder type ID'
        });
        return;
      }

      const deleted = await this.service.deleteCylinderType(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Cylinder type not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Cylinder type deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteCylinderType:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}