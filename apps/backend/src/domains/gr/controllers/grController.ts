import { Request, Response } from 'express';
import { GRService } from '../services/grService';
import { CreateGRRequest, ApproveGRRequest } from '../types/gr';

export class GRController {
  private service: GRService;

  constructor() {
    this.service = new GRService();
  }

  async getAllGRs(req: Request, res: Response): Promise<void> {
    try {
      const grs = await this.service.getAllGRs();
      res.status(200).json({
        success: true,
        data: grs,
        message: 'GRs retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllGRs:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getGRById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid GR ID'
        });
        return;
      }

      const gr = await this.service.getGRById(id);
      if (!gr) {
        res.status(404).json({
          success: false,
          message: 'GR not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: gr,
        message: 'GR retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getGRById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getApprovedGRs(req: Request, res: Response): Promise<void> {
    try {
      const grs = await this.service.getApprovedGRs();
      res.status(200).json({
        success: true,
        data: grs,
        message: 'Approved GRs retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getApprovedGRs:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getGRPreview(req: Request, res: Response): Promise<void> {
    try {
      const deliveryId = parseInt(req.params.deliveryId);
      if (isNaN(deliveryId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid delivery ID'
        });
        return;
      }

      const preview = await this.service.getGRPreview(deliveryId);
      if (!preview) {
        res.status(404).json({
          success: false,
          message: 'Delivery transaction not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: preview,
        message: 'GR preview retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getGRPreview:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createGR(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateGRRequest = req.body;
      const createdBy = (req as any).user?.userId; // From auth middleware

      if (!createdBy) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const gr = await this.service.createGR(data, createdBy);
      res.status(201).json({
        success: true,
        data: gr,
        message: 'GR created successfully'
      });
    } catch (error) {
      console.error('Error in createGR:', error);
      const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async approveGR(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid GR ID'
        });
        return;
      }

      const data: ApproveGRRequest = req.body;
      const approvedBy = (req as any).user?.userId; // From auth middleware

      if (!approvedBy) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const gr = await this.service.approveGR(id, data, approvedBy);
      res.status(200).json({
        success: true,
        data: gr,
        message: 'GR approved successfully'
      });
    } catch (error) {
      console.error('Error in approveGR:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('already approved')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async finalizeGR(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid GR ID'
        });
        return;
      }

      const finalizedBy = (req as any).user?.userId; // From auth middleware

      if (!finalizedBy) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const gr = await this.service.finalizeGR(id, finalizedBy);
      res.status(200).json({
        success: true,
        data: gr,
        message: 'GR finalized successfully'
      });
    } catch (error) {
      console.error('Error in finalizeGR:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('not in approved status')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async checkGRExists(req: Request, res: Response): Promise<void> {
    try {
      const deliveryId = parseInt(req.params.deliveryId);
      if (isNaN(deliveryId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid delivery ID'
        });
        return;
      }

      const exists = await this.service.checkGRExists(deliveryId);
      res.status(200).json({
        success: true,
        data: { exists },
        message: 'GR existence checked successfully'
      });
    } catch (error) {
      console.error('Error in checkGRExists:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
