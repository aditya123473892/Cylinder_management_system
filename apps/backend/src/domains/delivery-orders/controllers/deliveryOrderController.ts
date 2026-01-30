import { Request, Response } from 'express';
import { DeliveryOrderService } from '../services/deliveryOrderService';

export class DeliveryOrderController {
  private service: DeliveryOrderService;

  constructor() {
    this.service = new DeliveryOrderService();
  }

  // Delivery Order Management
  async createDeliveryOrder(req: Request, res: Response) {
    try {
      const orderId = await this.service.createDeliveryOrder(req.body);
      res.status(201).json({
        success: true,
        message: 'Delivery order created successfully',
        data: { order_id: orderId }
      });
    } catch (error) {
      console.error('Error creating delivery order:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getDeliveryOrders(req: Request, res: Response) {
    try {
      const { customer_id, status, date_from, date_to } = req.query;
      const orders = await this.service.getDeliveryOrders({
        customer_id: customer_id ? parseInt(customer_id as string) : undefined,
        status: status as string,
        date_from: date_from as string,
        date_to: date_to as string
      });
      res.json({
        success: true,
        data: orders
      });
    } catch (error) {
      console.error('Error getting delivery orders:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getDeliveryOrderById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await this.service.getDeliveryOrderWithLines(parseInt(id));

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Delivery order not found'
        });
      }

      res.json({
        success: true,
        data: order
      });
    } catch (error) {
      console.error('Error getting delivery order:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delivery Planning
  async createDeliveryPlan(req: Request, res: Response) {
    try {
      const planId = await this.service.createDeliveryPlan(req.body);
      res.status(201).json({
        success: true,
        message: 'Delivery plan created successfully',
        data: { plan_id: planId }
      });
    } catch (error) {
      console.error('Error creating delivery plan:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getDeliveryPlans(req: Request, res: Response) {
    try {
      const { date_from, date_to, status, vehicle_id } = req.query;
      const plans = await this.service.getDeliveryPlans({
        date_from: date_from as string,
        date_to: date_to as string,
        status: status as string,
        vehicle_id: vehicle_id ? parseInt(vehicle_id as string) : undefined
      });
      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error('Error getting delivery plans:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Loading Process
  async startLoading(req: Request, res: Response) {
    try {
      const { plan_id, loaded_by, supervisor_id } = req.body;
      const loadingId = await this.service.startLoading(plan_id, loaded_by, supervisor_id);
      res.status(201).json({
        success: true,
        message: 'Loading process started successfully',
        data: { loading_id: loadingId }
      });
    } catch (error) {
      console.error('Error starting loading:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async completeLoading(req: Request, res: Response) {
    try {
      const { loading_id, loading_lines, notes } = req.body;
      await this.service.completeLoading(loading_id, loading_lines, notes);
      res.json({
        success: true,
        message: 'Loading completed successfully'
      });
    } catch (error) {
      console.error('Error completing loading:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // Delivery Execution
  async recordDeliveryExecution(req: Request, res: Response) {
    try {
      const { plan_id, order_id, delivery_transaction_id, actual_delivery_time } = req.body;
      await this.service.recordDeliveryExecution(plan_id, order_id, delivery_transaction_id, actual_delivery_time);
      res.json({
        success: true,
        message: 'Delivery execution recorded successfully'
      });
    } catch (error) {
      console.error('Error recording delivery execution:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // Reconciliation
  async createReconciliation(req: Request, res: Response) {
    try {
      const { plan_id, reconciled_by, reconciliation_lines } = req.body;
      const reconciliationId = await this.service.createReconciliation(plan_id, reconciled_by, reconciliation_lines);
      res.status(201).json({
        success: true,
        message: 'Reconciliation created successfully',
        data: { reconciliation_id: reconciliationId }
      });
    } catch (error) {
      console.error('Error creating reconciliation:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  // Dashboard and Reporting
  async getDashboardData(req: Request, res: Response) {
    try {
      const { date_from, date_to } = req.query;
      const dashboardData = await this.service.getDashboardData(
        date_from as string,
        date_to as string
      );
      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Error getting dashboard data:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  async getUserPendingTasks(req: Request, res: Response) {
    try {
      const { user_id } = req.params;
      const tasks = await this.service.getUserPendingTasks(parseInt(user_id));
      res.json({
        success: true,
        data: tasks
      });
    } catch (error) {
      console.error('Error getting user pending tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Status Updates
  async updateOrderStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, updated_by } = req.body;
      await this.service.updateOrderStatus(parseInt(id), status, updated_by);
      res.json({
        success: true,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async updatePlanStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status, updated_by } = req.body;
      await this.service.updatePlanStatus(parseInt(id), status, updated_by);
      res.json({
        success: true,
        message: 'Plan status updated successfully'
      });
    } catch (error) {
      console.error('Error updating plan status:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getOrderVehicleInfo(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const vehicleInfo = await this.service.getOrderVehicleInfo(parseInt(id));

      if (!vehicleInfo) {
        return res.status(404).json({
          success: false,
          message: 'Vehicle information not found for this order'
        });
      }

      res.json({
        success: true,
        data: vehicleInfo
      });
    } catch (error) {
      console.error('Error getting order vehicle info:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
