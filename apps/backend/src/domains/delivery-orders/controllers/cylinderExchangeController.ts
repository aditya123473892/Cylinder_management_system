import { Request, Response } from 'express';
import { CylinderExchangeService } from '../services/cylinderExchangeService';
import { 
  RecordExchangeRequest,
  CreateDailyReconciliationRequest,
  UpdateVarianceResolutionRequest,
  CountVehicleInventoryRequest,
  ExchangeTrackingFilters,
  DailyReconciliationFilters
} from '../types/cylinderExchange';

export class CylinderExchangeController {
  private service: CylinderExchangeService;

  constructor() {
    this.service = new CylinderExchangeService();
  }

  // Order Exchange Tracking
  async recordExchange(req: Request, res: Response): Promise<void> {
    try {
      const exchangeData: RecordExchangeRequest = req.body;
      const exchangeId = await this.service.recordExchange(exchangeData);
      
      res.status(201).json({
        success: true,
        message: 'Exchange recorded successfully',
        data: { exchange_id: exchangeId }
      });
    } catch (error) {
      console.error('Error recording exchange:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record exchange',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getExchangeTracking(req: Request, res: Response): Promise<void> {
    try {
      const filters: ExchangeTrackingFilters = {
        plan_id: req.query.plan_id ? parseInt(req.query.plan_id as string) : undefined,
        order_id: req.query.order_id ? parseInt(req.query.order_id as string) : undefined,
        variance_type: req.query.variance_type as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        customer_id: req.query.customer_id ? parseInt(req.query.customer_id as string) : undefined
      };

      const exchangeTracking = await this.service.getExchangeTracking(filters);
      
      res.status(200).json({
        success: true,
        data: exchangeTracking
      });
    } catch (error) {
      console.error('Error fetching exchange tracking:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch exchange tracking',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getExchangeTrackingWithOrder(req: Request, res: Response): Promise<void> {
    try {
      const exchangeId = parseInt(req.params.exchangeId);
      const exchangeData = await this.service.getExchangeTrackingWithOrder(exchangeId);
      
      if (!exchangeData) {
        res.status(404).json({
          success: false,
          message: 'Exchange not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: exchangeData
      });
    } catch (error) {
      console.error('Error fetching exchange tracking with order:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch exchange tracking with order',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateExchangeAcknowledgment(req: Request, res: Response): Promise<void> {
    try {
      const exchangeId = parseInt(req.params.exchangeId);
      const { acknowledged_by } = req.body;

      if (!acknowledged_by) {
        res.status(400).json({
          success: false,
          message: 'acknowledged_by is required'
        });
        return;
      }

      await this.service.updateExchangeAcknowledgment(exchangeId, acknowledged_by);
      
      res.status(200).json({
        success: true,
        message: 'Exchange acknowledgment updated successfully'
      });
    } catch (error) {
      console.error('Error updating exchange acknowledgment:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update exchange acknowledgment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Daily Reconciliation
  async createDailyReconciliation(req: Request, res: Response): Promise<void> {
    try {
      const reconciliationData: CreateDailyReconciliationRequest = req.body;
      const reconciliationId = await this.service.createDailyReconciliation(reconciliationData);
      
      res.status(201).json({
        success: true,
        message: 'Daily reconciliation created successfully',
        data: { reconciliation_id: reconciliationId }
      });
    } catch (error) {
      console.error('Error creating daily reconciliation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create daily reconciliation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getDailyReconciliations(req: Request, res: Response): Promise<void> {
    try {
      const filters: DailyReconciliationFilters = {
        plan_id: req.query.plan_id ? parseInt(req.query.plan_id as string) : undefined,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        status: req.query.status as string,
        reconciled_by: req.query.reconciled_by ? parseInt(req.query.reconciled_by as string) : undefined
      };

      const reconciliations = await this.service.getDailyReconciliations(filters);
      
      res.status(200).json({
        success: true,
        data: reconciliations
      });
    } catch (error) {
      console.error('Error fetching daily reconciliations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch daily reconciliations',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getDailyReconciliationWithDetails(req: Request, res: Response): Promise<void> {
    try {
      const reconciliationId = parseInt(req.params.reconciliationId);
      const reconciliationData = await this.service.getDailyReconciliationWithDetails(reconciliationId);
      
      if (!reconciliationData) {
        res.status(404).json({
          success: false,
          message: 'Reconciliation not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: reconciliationData
      });
    } catch (error) {
      console.error('Error fetching daily reconciliation with details:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch daily reconciliation with details',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateVarianceResolution(req: Request, res: Response): Promise<void> {
    try {
      const resolutionData: UpdateVarianceResolutionRequest = req.body;

      await this.service.updateVarianceResolution(resolutionData);
      
      res.status(200).json({
        success: true,
        message: 'Variance resolution updated successfully'
      });
    } catch (error) {
      console.error('Error updating variance resolution:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update variance resolution',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Vehicle Inventory
  async countVehicleInventory(req: Request, res: Response): Promise<void> {
    try {
      const inventoryData: CountVehicleInventoryRequest = req.body;

      await this.service.countVehicleInventory(inventoryData);
      
      res.status(200).json({
        success: true,
        message: 'Vehicle inventory counted successfully'
      });
    } catch (error) {
      console.error('Error counting vehicle inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to count vehicle inventory',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getVehicleInventory(req: Request, res: Response): Promise<void> {
    try {
      const planId = parseInt(req.params.planId);
      const inventory = await this.service.getVehicleInventory(planId);
      
      res.status(200).json({
        success: true,
        data: inventory
      });
    } catch (error) {
      console.error('Error fetching vehicle inventory:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch vehicle inventory',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Summary and Reporting
  async getExchangeSummary(req: Request, res: Response): Promise<void> {
    try {
      const planId = parseInt(req.params.planId);
      const summary = await this.service.getExchangeSummary(planId);
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching exchange summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch exchange summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async getExchangeVarianceSummary(req: Request, res: Response): Promise<void> {
    try {
      const planId = parseInt(req.params.planId);
      const varianceSummary = await this.service.getExchangeVarianceSummary(planId);
      
      res.status(200).json({
        success: true,
        data: varianceSummary
      });
    } catch (error) {
      console.error('Error fetching exchange variance summary:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch exchange variance summary',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Approval and Status Updates
  async approveReconciliation(req: Request, res: Response): Promise<void> {
    try {
      const reconciliationId = parseInt(req.params.reconciliationId);
      const { approved_by } = req.body;

      if (!approved_by) {
        res.status(400).json({
          success: false,
          message: 'approved_by is required'
        });
        return;
      }

      await this.service.approveReconciliation(reconciliationId, approved_by);
      
      res.status(200).json({
        success: true,
        message: 'Reconciliation approved successfully'
      });
    } catch (error) {
      console.error('Error approving reconciliation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to approve reconciliation',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async updateReconciliationStatus(req: Request, res: Response): Promise<void> {
    try {
      const reconciliationId = parseInt(req.params.reconciliationId);
      const { status, updated_by } = req.body;

      if (!status || !updated_by) {
        res.status(400).json({
          success: false,
          message: 'status and updated_by are required'
        });
        return;
      }

      await this.service.updateReconciliationStatus(reconciliationId, status, updated_by);
      
      res.status(200).json({
        success: true,
        message: 'Reconciliation status updated successfully'
      });
    } catch (error) {
      console.error('Error updating reconciliation status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update reconciliation status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}