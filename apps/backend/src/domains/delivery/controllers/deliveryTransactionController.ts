import { Request, Response } from 'express';
import { DeliveryTransactionService } from '../services/deliveryTransactionService';
import { CreateDeliveryTransactionRequest } from '../types/deliveryTransaction';

export class DeliveryTransactionController {
  private service: DeliveryTransactionService;

  constructor() {
    this.service = new DeliveryTransactionService();
  }

  async getAllDeliveryTransactions(req: Request, res: Response): Promise<void> {
    try {
      const transactions = await this.service.getAllDeliveryTransactions();
      res.status(200).json({
        success: true,
        data: transactions,
        message: 'Delivery transactions retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllDeliveryTransactions:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getDeliveryTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid delivery transaction ID'
        });
        return;
      }

      const transaction = await this.service.getDeliveryTransactionById(id);
      if (!transaction) {
        res.status(404).json({
          success: false,
          message: 'Delivery transaction not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: transaction,
        message: 'Delivery transaction retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getDeliveryTransactionById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createDeliveryTransaction(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateDeliveryTransactionRequest = req.body;
      const createdBy = (req as any).user?.userId; // From auth middleware

      if (!createdBy) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const transaction = await this.service.createDeliveryTransaction(data, createdBy);
      res.status(201).json({
        success: true,
        data: transaction,
        message: 'Delivery transaction created successfully'
      });
    } catch (error) {
      console.error('Error in createDeliveryTransaction:', error);
      const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
