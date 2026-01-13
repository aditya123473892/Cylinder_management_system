import { Request, Response } from 'express';
import { CustomerService } from '../services/customerService';
import { CreateCustomerRequest, UpdateCustomerRequest } from '../types/customer';

export class CustomerController {
  private service: CustomerService;

  constructor() {
    this.service = new CustomerService();
  }

  async getAllCustomers(req: Request, res: Response): Promise<void> {
    try {
      const customers = await this.service.getAllCustomers();
      res.status(200).json({
        success: true,
        data: customers,
        message: 'Customers retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getAllCustomers:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async getCustomerById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid customer ID'
        });
        return;
      }

      const customer = await this.service.getCustomerById(id);
      if (!customer) {
        res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer retrieved successfully'
      });
    } catch (error) {
      console.error('Error in getCustomerById:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async createCustomer(req: Request, res: Response): Promise<void> {
    try {
      const data: CreateCustomerRequest = req.body;

      const customer = await this.service.createCustomer(data);
      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully'
      });
    } catch (error) {
      console.error('Error in createCustomer:', error);
      const statusCode = error instanceof Error && error.message.includes('required') ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async updateCustomer(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid customer ID'
        });
        return;
      }

      const data: UpdateCustomerRequest = req.body;
      const customer = await this.service.updateCustomer(id, data);

      if (!customer) {
        res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: customer,
        message: 'Customer updated successfully'
      });
    } catch (error) {
      console.error('Error in updateCustomer:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }

  async deleteCustomer(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid customer ID'
        });
        return;
      }

      const deleted = await this.service.deleteCustomer(id);
      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully'
      });
    } catch (error) {
      console.error('Error in deleteCustomer:', error);
      const statusCode = error instanceof Error &&
        (error.message.includes('not found') || error.message.includes('Invalid')) ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  }
}
