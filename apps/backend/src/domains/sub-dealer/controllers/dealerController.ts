import { Request, Response } from 'express';
import { DealerService } from '../services/dealerService';
import { CreateDealerRequest, UpdateDealerRequest } from '../types/dealer';

export class DealerController {
  private service: DealerService;

  constructor() {
    this.service = new DealerService();
  }

  async getAllDealers(req: Request, res: Response): Promise<void> {
    try {
      const dealers = await this.service.getAllDealers();
      // Convert binary images to base64 for frontend
      const dealersWithBase64 = dealers.map(dealer => ({
        ...dealer,
        AadhaarImage: dealer.AadhaarImage ? dealer.AadhaarImage.toString('base64') : null,
        PanImage: dealer.PanImage ? dealer.PanImage.toString('base64') : null,
      }));

      res.status(200).json({
        success: true,
        data: dealersWithBase64,
        message: 'Dealers retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllDealers:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getDealerById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid dealer ID'
        });
        return;
      }

      const dealer = await this.service.getDealerById(id);
      if (!dealer) {
        res.status(404).json({
          success: false,
          message: 'Dealer not found'
        });
        return;
      }

      // Convert binary images to base64 for frontend
      const dealerWithBase64 = {
        ...dealer,
        AadhaarImage: dealer.AadhaarImage ? dealer.AadhaarImage.toString('base64') : null,
        PanImage: dealer.PanImage ? dealer.PanImage.toString('base64') : null,
      };

      res.status(200).json({
        success: true,
        data: dealerWithBase64,
        message: 'Dealer retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getDealerById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createDealer(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateDealerRequest = req.body;

      // Convert base64 images to Buffer if provided
      if (data.AadhaarImage && typeof data.AadhaarImage === 'string') {
        // Remove data URL prefix if present
        const cleanBase64 = (data.AadhaarImage as string).replace(/^data:image\/[a-z]+;base64,/, '');
        data.AadhaarImage = Buffer.from(cleanBase64, 'base64');
      }
      if (data.PanImage && typeof data.PanImage === 'string') {
        // Remove data URL prefix if present
        const cleanBase64 = (data.PanImage as string).replace(/^data:image\/[a-z]+;base64,/, '');
        data.PanImage = Buffer.from(cleanBase64, 'base64');
      }

      const dealer = await this.service.createDealer(data);

      // Convert binary images to base64 for response
      const dealerWithBase64 = {
        ...dealer,
        AadhaarImage: dealer.AadhaarImage ? dealer.AadhaarImage.toString('base64') : null,
        PanImage: dealer.PanImage ? dealer.PanImage.toString('base64') : null,
      };

      res.status(201).json({
        success: true,
        data: dealerWithBase64,
        message: 'Dealer created successfully'
      });
    } catch (error) {
      console.error('Error in createDealer:', error);
      const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async updateDealer(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid dealer ID'
        });
        return;
      }

      const data: UpdateDealerRequest = req.body;

      // Convert base64 images to Buffer if provided
      if (data.AadhaarImage && typeof data.AadhaarImage === 'string') {
        // Remove data URL prefix if present
        const cleanBase64 = (data.AadhaarImage as string).replace(/^data:image\/[a-z]+;base64,/, '');
        data.AadhaarImage = Buffer.from(cleanBase64, 'base64');
      }
      if (data.PanImage && typeof data.PanImage === 'string') {
        // Remove data URL prefix if present
        const cleanBase64 = (data.PanImage as string).replace(/^data:image\/[a-z]+;base64,/, '');
        data.PanImage = Buffer.from(cleanBase64, 'base64');
      }

      const dealer = await this.service.updateDealer(id, data);

      if (!dealer) {
        res.status(404).json({
          success: false,
          message: 'Dealer not found'
        });
        return;
      }

      // Convert binary images to base64 for response
      const dealerWithBase64 = {
        ...dealer,
        AadhaarImage: dealer.AadhaarImage ? dealer.AadhaarImage.toString('base64') : null,
        PanImage: dealer.PanImage ? dealer.PanImage.toString('base64') : null,
      };

      res.status(200).json({
        success: true,
        data: dealerWithBase64,
        message: 'Dealer updated successfully'
      });
    } catch (error) {
      console.error('Error in updateDealer:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async deleteDealer(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid dealer ID'
        });
        return;
      }

      const deleted = await this.service.deleteDealer(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Dealer not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Dealer deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteDealer:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
