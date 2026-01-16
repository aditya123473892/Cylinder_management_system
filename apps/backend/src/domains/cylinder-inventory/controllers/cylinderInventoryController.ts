import { Request, Response } from 'express';
import { CylinderInventoryService } from '../services/cylinderInventoryService';
import { CreateCylinderMovementRequest } from '../types/cylinderInventory';

export class CylinderInventoryController {
  private service: CylinderInventoryService;

  constructor() {
    this.service = new CylinderInventoryService();
  }

  async getInventorySummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await this.service.getInventorySummary();
      res.status(200).json({
        success: true,
        data: summary,
        message: 'Cylinder inventory summary retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getInventorySummary:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getLocationSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await this.service.getLocationSummary();
      res.status(200).json({
        success: true,
        data: summary,
        message: 'Cylinder location summary retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getLocationSummary:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getInventoryByLocation(req: Request, res: Response): Promise<void> {
    try {
      const { locationType, locationReferenceId } = req.query;

      if (!locationType || typeof locationType !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Location type is required'
        });
        return;
      }

      const referenceId = locationReferenceId ?
        parseInt(locationReferenceId as string) : undefined;

      if (referenceId !== undefined && isNaN(referenceId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid location reference ID'
        });
        return;
      }

      const inventory = await this.service.getInventoryByLocation(locationType, referenceId);
      res.status(200).json({
        success: true,
        data: inventory,
        message: 'Cylinder inventory retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getInventoryByLocation:', error);
      const statusCode = error instanceof Error &&
        error.message.includes('Invalid') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async recordMovement(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCylinderMovementRequest = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      const movementLog = await this.service.recordMovement(data, userId);
      res.status(201).json({
        success: true,
        data: movementLog,
        message: 'Cylinder movement recorded successfully'
      });
    } catch (error) {
      console.error('Error in recordMovement:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('required') ||
         error.message.includes('Invalid') ||
         error.message.includes('Insufficient')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async recordDeliveryMovement(req: Request, res: Response): Promise<void> {
    try {
      const { deliveryId, cylinderTypeId, vehicleId, quantity } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      if (!deliveryId || !cylinderTypeId || !vehicleId || quantity === undefined) {
        res.status(400).json({
          success: false,
          message: 'Delivery ID, cylinder type ID, vehicle ID, and quantity are required'
        });
        return;
      }

      const deliveryIdNum = parseInt(deliveryId);
      const cylinderTypeIdNum = parseInt(cylinderTypeId);
      const vehicleIdNum = parseInt(vehicleId);
      const quantityNum = parseInt(quantity);

      if (isNaN(deliveryIdNum) || isNaN(cylinderTypeIdNum) || isNaN(vehicleIdNum) || isNaN(quantityNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid numeric values provided'
        });
        return;
      }

      const movementLog = await this.service.recordDeliveryMovement(
        deliveryIdNum, cylinderTypeIdNum, quantityNum, vehicleIdNum, userId
      );
      res.status(201).json({
        success: true,
        data: movementLog,
        message: 'Delivery cylinder movement recorded successfully'
      });
    } catch (error) {
      console.error('Error in recordDeliveryMovement:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('required') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async recordGrApprovalMovement(req: Request, res: Response): Promise<void> {
    try {
      const { deliveryId, cylinderTypeId, quantity } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      if (!deliveryId || !cylinderTypeId || quantity === undefined) {
        res.status(400).json({
          success: false,
          message: 'Delivery ID, cylinder type ID, and quantity are required'
        });
        return;
      }

      const deliveryIdNum = parseInt(deliveryId);
      const cylinderTypeIdNum = parseInt(cylinderTypeId);
      const quantityNum = parseInt(quantity);

      if (isNaN(deliveryIdNum) || isNaN(cylinderTypeIdNum) || isNaN(quantityNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid numeric values provided'
        });
        return;
      }

      const movementLog = await this.service.recordGrApprovalMovement(
        deliveryIdNum, cylinderTypeIdNum, quantityNum, userId
      );
      res.status(201).json({
        success: true,
        data: movementLog,
        message: 'GR approval cylinder movement recorded successfully'
      });
    } catch (error) {
      console.error('Error in recordGrApprovalMovement:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('required') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async recordReturnMovement(req: Request, res: Response): Promise<void> {
    try {
      const { deliveryId, cylinderTypeId, deliveredQuantity, returnedQuantity } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      if (!deliveryId || !cylinderTypeId || deliveredQuantity === undefined || returnedQuantity === undefined) {
        res.status(400).json({
          success: false,
          message: 'Delivery ID, cylinder type ID, delivered quantity, and returned quantity are required'
        });
        return;
      }

      const deliveryIdNum = parseInt(deliveryId);
      const cylinderTypeIdNum = parseInt(cylinderTypeId);
      const deliveredNum = parseInt(deliveredQuantity);
      const returnedNum = parseInt(returnedQuantity);

      if (isNaN(deliveryIdNum) || isNaN(cylinderTypeIdNum) || isNaN(deliveredNum) || isNaN(returnedNum)) {
        res.status(400).json({
          success: false,
          message: 'Invalid numeric values provided'
        });
        return;
      }

      await this.service.recordReturnMovement(
        deliveryIdNum, cylinderTypeIdNum, deliveredNum, returnedNum, userId
      );
      res.status(200).json({
        success: true,
        message: 'Cylinder return movement recorded successfully'
      });
    } catch (error) {
      console.error('Error in recordReturnMovement:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('required') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getMovementLogs(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      if (isNaN(limit) || isNaN(offset)) {
        res.status(400).json({
          success: false,
          message: 'Invalid limit or offset values'
        });
        return;
      }

      const logs = await this.service.getMovementLogs(limit, offset);
      res.status(200).json({
        success: true,
        data: logs,
        message: 'Cylinder movement logs retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getMovementLogs:', error);
      const statusCode = error instanceof Error &&
        error.message.includes('must be') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getMovementsByCylinderType(req: Request, res: Response): Promise<void> {
    try {
      const cylinderTypeId = parseInt(req.params.cylinderTypeId);

      if (isNaN(cylinderTypeId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid cylinder type ID'
        });
        return;
      }

      const movements = await this.service.getMovementsByCylinderType(cylinderTypeId);
      res.status(200).json({
        success: true,
        data: movements,
        message: 'Cylinder movements retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getMovementsByCylinderType:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('required') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getMovementsByTransaction(req: Request, res: Response): Promise<void> {
    try {
      const transactionId = parseInt(req.params.transactionId);

      if (isNaN(transactionId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid transaction ID'
        });
        return;
      }

      const movements = await this.service.getMovementsByTransaction(transactionId);
      res.status(200).json({
        success: true,
        data: movements,
        message: 'Transaction cylinder movements retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getMovementsByTransaction:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('required') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async initializeInventory(req: Request, res: Response): Promise<void> {
    try {
      const { inventoryData } = req.body;
      const userId = (req as any).user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User authentication required'
        });
        return;
      }

      if (!inventoryData || !Array.isArray(inventoryData)) {
        res.status(400).json({
          success: false,
          message: 'Inventory data array is required'
        });
        return;
      }

      // Validate inventory data
      for (const item of inventoryData) {
        if (!item.cylinder_type_id || !item.quantity) {
          res.status(400).json({
            success: false,
            message: 'Each inventory item must have cylinder_type_id and quantity'
          });
          return;
        }

        const cylinderTypeId = parseInt(item.cylinder_type_id);
        const quantity = parseInt(item.quantity);

        if (isNaN(cylinderTypeId) || isNaN(quantity) || quantity < 0) {
          res.status(400).json({
            success: false,
            message: 'Invalid cylinder_type_id or quantity values'
          });
          return;
        }
      }

      await this.service.initializeInventory(inventoryData, userId);
      res.status(201).json({
        success: true,
        message: 'Cylinder inventory initialized successfully'
      });
    } catch (error) {
      console.error('Error in initializeInventory:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('required') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
