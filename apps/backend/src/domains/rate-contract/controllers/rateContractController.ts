import { Request, Response } from 'express';
import { RateContractService } from '../services/rateContractService';
import { CreateRateContractRequest, UpdateRateContractRequest } from '../types/rateContract';

export class RateContractController {
  private service: RateContractService;

  constructor() {
    this.service = new RateContractService();
  }

  async getAllRateContracts(req: Request, res: Response): Promise<void> {
    try {
      const contracts = await this.service.getAllRateContracts();
      res.status(200).json({
        success: true,
        data: contracts,
        message: 'Rate contracts retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllRateContracts:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getRateContractById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid rate contract ID'
        });
        return;
      }

      const contract = await this.service.getRateContractById(id);
      if (!contract) {
        res.status(404).json({
          success: false,
          message: 'Rate contract not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: contract,
        message: 'Rate contract retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getRateContractById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getActiveRateContracts(req: Request, res: Response): Promise<void> {
    try {
      const { customerType, cylinderTypeId, effectiveDate } = req.query;

      if (!customerType || !cylinderTypeId || !effectiveDate) {
        res.status(400).json({
          success: false,
          message: 'customerType, cylinderTypeId, and effectiveDate are required'
        });
        return;
      }

      const contracts = await this.service.getActiveRateContracts(
        customerType as string,
        parseInt(cylinderTypeId as string),
        effectiveDate as string
      );

      res.status(200).json({
        success: true,
        data: contracts,
        message: 'Active rate contracts retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getActiveRateContracts:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createRateContract(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateRateContractRequest = req.body;
      const contract = await this.service.createRateContract(data);
      res.status(201).json({
        success: true,
        data: contract,
        message: 'Rate contract created successfully'
      });
    } catch (error) {
      console.error('Error in createRateContract:', error);
      const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async updateRateContract(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid rate contract ID'
        });
        return;
      }

      const data: UpdateRateContractRequest = req.body;
      const contract = await this.service.updateRateContract(id, data);

      if (!contract) {
        res.status(404).json({
          success: false,
          message: 'Rate contract not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: contract,
        message: 'Rate contract updated successfully'
      });
    } catch (error) {
      console.error('Error in updateRateContract:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async deleteRateContract(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid rate contract ID'
        });
        return;
      }

      await this.service.deleteRateContract(id);
      res.status(200).json({
        success: true,
        message: 'Rate contract deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteRateContract:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
