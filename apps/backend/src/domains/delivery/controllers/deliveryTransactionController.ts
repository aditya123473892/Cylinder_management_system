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
      let statusCode = 500;
      let errorType = 'INTERNAL_ERROR';

      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('not found')) {
          statusCode = 404;
          errorType = 'NOT_FOUND_ERROR';
        }
      }

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        errorType
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
          message: 'User authentication required',
          errorType: 'AUTHENTICATION_ERROR'
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

      // Determine appropriate status code and error type based on error message
      let statusCode = 500;
      let errorType = 'INTERNAL_ERROR';

      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        // Validation errors (client-side issues)
        if (errorMessage.includes('required') ||
            errorMessage.includes('invalid') ||
            errorMessage.includes('cannot be negative') ||
            errorMessage.includes('must be greater than') ||
            errorMessage.includes('does not have enough') ||
            errorMessage.includes('insufficient') ||
            errorMessage.includes('available') ||
            errorMessage.includes('future')) {
          statusCode = 400;
          errorType = 'VALIDATION_ERROR';
        }
        // Authentication/Authorization errors
        else if (errorMessage.includes('authentication') ||
                 errorMessage.includes('authorization') ||
                 errorMessage.includes('permission')) {
          statusCode = 401;
          errorType = 'AUTHENTICATION_ERROR';
        }
        // Not found errors
        else if (errorMessage.includes('not found')) {
          statusCode = 404;
          errorType = 'NOT_FOUND_ERROR';
        }
      }

      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
        errorType
      });
    }
  }
}
