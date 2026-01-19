import { Request, Response } from 'express';
import { CylinderInventoryService } from '../services/cylinderInventoryService';
import { InventoryQuery, CylinderStatus, LocationType } from '../types/cylinderInventory';

export class CylinderInventoryController {
  private inventoryService: CylinderInventoryService;

  constructor() {
    this.inventoryService = new CylinderInventoryService();
  }

  async getInventory(req: Request, res: Response): Promise<Response> {
    try {
      const query: InventoryQuery = {
        locationType: req.query.locationType as LocationType,
        referenceId: req.query.referenceId ? parseInt(req.query.referenceId as string) : undefined,
        cylinderStatus: req.query.cylinderStatus as CylinderStatus,
        cylinderTypeId: req.query.cylinderTypeId ? parseInt(req.query.cylinderTypeId as string) : undefined
      };

      const inventory = await this.inventoryService.getInventory(query);
      return res.json({
        success: true,
        data: inventory
      });
    } catch (error) {
      console.error('Error fetching inventory:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory data'
      });
    }
  }

  async getInventorySummary(req: Request, res: Response): Promise<Response> {
    try {
      const summary = await this.inventoryService.getInventorySummary();
      return res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching inventory summary:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory summary'
      });
    }
  }

  async getAvailableQuantity(req: Request, res: Response): Promise<Response> {
    try {
      const { cylinderTypeId, locationType, referenceId, cylinderStatus } = req.params;

      if (!cylinderTypeId || !locationType) {
        return res.status(400).json({
          success: false,
          message: 'Cylinder type ID and location type are required'
        });
      }

      const quantity = await this.inventoryService.getAvailableQuantity(
        parseInt(cylinderTypeId),
        locationType as LocationType,
        referenceId ? parseInt(referenceId) : undefined,
        (cylinderStatus as CylinderStatus) || 'FILLED'
      );

      return res.json({
        success: true,
        data: { quantity }
      });
    } catch (error) {
      console.error('Error fetching available quantity:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch available quantity'
      });
    }
  }

  async getCylinderMovements(req: Request, res: Response): Promise<Response> {
    try {
      const { cylinderTypeId, referenceTransactionId, limit } = req.query;

      const movements = await this.inventoryService.getCylinderMovements(
        cylinderTypeId ? parseInt(cylinderTypeId as string) : undefined,
        referenceTransactionId ? parseInt(referenceTransactionId as string) : undefined,
        limit ? parseInt(limit as string) : 50
      );

      return res.json({
        success: true,
        data: movements
      });
    } catch (error) {
      console.error('Error fetching cylinder movements:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch cylinder movements'
      });
    }
  }

  async getInventoryDashboard(req: Request, res: Response): Promise<Response> {
    try {
      const [inventory, summary, recentMovements] = await Promise.all([
        this.inventoryService.getInventory({}),
        this.inventoryService.getInventorySummary(),
        this.inventoryService.getCylinderMovements(undefined, undefined, 10)
      ]);

      // Group inventory by location for dashboard
      const dashboardData = {
        totalCylinders: summary.reduce((sum, item) => sum + item.totalQuantity, 0),
        byLocation: {
          yard: { filled: 0, empty: 0, total: 0 },
          plant: { filled: 0, empty: 0, total: 0 },
          customers: { filled: 0, empty: 0, total: 0 },
          vehicles: { filled: 0, empty: 0, total: 0 }
        },
        recentMovements,
        alerts: [] as Array<{ type: string; message: string }>
      };

      // Aggregate data by location
      summary.forEach(item => {
        item.locations.YARD && Object.assign(dashboardData.byLocation.yard, item.locations.YARD);
        item.locations.PLANT && Object.assign(dashboardData.byLocation.plant, item.locations.PLANT);
        item.locations.CUSTOMER && (
          dashboardData.byLocation.customers.filled += item.locations.CUSTOMER.filled,
          dashboardData.byLocation.customers.empty += item.locations.CUSTOMER.empty,
          dashboardData.byLocation.customers.total += item.locations.CUSTOMER.total
        );
        item.locations.VEHICLE && Object.assign(dashboardData.byLocation.vehicles, item.locations.VEHICLE);
      });

      // Generate alerts for low inventory
      if (dashboardData.byLocation.yard.filled < 50) {
        dashboardData.alerts.push({
          type: 'warning',
          message: `Low filled cylinders in yard: ${dashboardData.byLocation.yard.filled} remaining`
        });
      }

      if (dashboardData.byLocation.plant.empty > 100) {
        dashboardData.alerts.push({
          type: 'info',
          message: `High empty cylinders at plant: ${dashboardData.byLocation.plant.empty} awaiting refill`
        });
      }

      return res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Error fetching inventory dashboard:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory dashboard'
      });
    }
  }
}
