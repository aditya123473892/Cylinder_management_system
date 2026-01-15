import { Request, Response } from 'express';
import { GrService } from '../services/grService';
import { CreateGrRequest, ApproveGrRequest } from '../types/gr';

export class GrController {
  private service: GrService;

  constructor() {
    this.service = new GrService();
  }

  async getAllGrs(req: Request, res: Response): Promise<void> {
    try {
      const grs = await this.service.getAllGrs();
      res.status(200).json({
        success: true,
        data: grs,
        message: 'GRs retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllGrs:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getGrById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid GR ID'
        });
        return;
      }

      const gr = await this.service.getGrById(id);
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
      console.error('Error in getGrById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createGr(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateGrRequest = req.body;
      const createdBy = (req as any).user?.userId;

      if (!createdBy) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const gr = await this.service.createGr(data, createdBy);
      res.status(201).json({
        success: true,
        data: gr,
        message: 'GR created successfully'
      });
    } catch (error) {
      console.error('Error in createGr:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('required') || error.message.includes('already exists'))
        ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async approveGr(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid GR ID'
        });
        return;
      }

      const data: ApproveGrRequest = req.body;
      const approvedBy = (req as any).user?.userId;

      if (!approvedBy) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const gr = await this.service.approveGr(id, data, approvedBy);
      res.status(200).json({
        success: true,
        data: gr,
        message: 'GR approved successfully'
      });
    } catch (error) {
      console.error('Error in approveGr:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('can only'))
        ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async finalizeGr(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid GR ID'
        });
        return;
      }

      const finalizedBy = (req as any).user?.userId;

      if (!finalizedBy) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const gr = await this.service.finalizeGr(id, finalizedBy);
      res.status(200).json({
        success: true,
        data: gr,
        message: 'GR finalized successfully'
      });
    } catch (error) {
      console.error('Error in finalizeGr:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('can only'))
        ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async closeTrip(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid GR ID'
        });
        return;
      }

      const closedBy = (req as any).user?.userId;

      if (!closedBy) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const gr = await this.service.closeTrip(id, closedBy);
      res.status(200).json({
        success: true,
        data: gr,
        message: 'Trip closed successfully'
      });
    } catch (error) {
      console.error('Error in closeTrip:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('cannot'))
        ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
