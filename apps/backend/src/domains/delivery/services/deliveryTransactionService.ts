import { DeliveryTransactionRepository } from '../repositories/deliveryTransactionRepository';
import { DeliveryTransactionWithLines, CreateDeliveryTransactionRequest } from '../types/deliveryTransaction';
import { RateContractService } from '../../rate-contract/services/rateContractService';
import { CylinderInventoryService } from '../../cylinder/services/cylinderInventoryService';

export class DeliveryTransactionService {
  private repository: DeliveryTransactionRepository;
  private rateContractService: RateContractService;
  private inventoryService: CylinderInventoryService;

  constructor() {
    this.repository = new DeliveryTransactionRepository();
    this.rateContractService = new RateContractService();
    this.inventoryService = new CylinderInventoryService();
  }

  async getAllDeliveryTransactions(): Promise<any[]> {
    try {
      return await this.repository.findAll();
    } catch (error) {
      console.error('Error fetching delivery transactions:', error);
      throw new Error('Failed to fetch delivery transactions');
    }
  }

  async getDeliveryTransactionById(id: number): Promise<DeliveryTransactionWithLines | null> {
    try {
      if (id <= 0) {
        throw new Error('Invalid delivery transaction ID');
      }
      return await this.repository.findById(id);
    } catch (error) {
      console.error(`Error fetching delivery transaction with id ${id}:`, error);
      throw new Error('Failed to fetch delivery transaction');
    }
  }

  async createDeliveryTransaction(data: CreateDeliveryTransactionRequest, createdBy: number): Promise<DeliveryTransactionWithLines> {
    try {
      // Validate required fields
      if (!data.customer_id || data.customer_id <= 0) {
        throw new Error('Valid customer ID is required');
      }
      if (!data.location_id || data.location_id <= 0) {
        throw new Error('Valid location ID is required');
      }
      if (!data.vehicle_id || data.vehicle_id <= 0) {
        throw new Error('Valid vehicle ID is required');
      }
      if (!data.driver_id || data.driver_id <= 0) {
        throw new Error('Valid driver ID is required');
      }
      if (!data.rate_contract_id || data.rate_contract_id <= 0) {
        throw new Error('Valid rate contract ID is required');
      }
      if (!data.delivery_date) {
        throw new Error('Delivery date is required');
      }
      if (!data.delivery_time) {
        throw new Error('Delivery time is required');
      }
      if (!data.lines || data.lines.length === 0) {
        throw new Error('At least one delivery line is required');
      }

      // Validate delivery lines
      for (const line of data.lines) {
        if (!line.cylinder_type_id || line.cylinder_type_id <= 0) {
          throw new Error('Valid cylinder type ID is required for each line');
        }
        if (line.delivered_qty < 0) {
          throw new Error('Delivered quantity cannot be negative');
        }
        if (line.returned_qty < 0) {
          throw new Error('Returned quantity cannot be negative');
        }
        if (line.delivered_qty === 0 && line.returned_qty === 0) {
          throw new Error('Either delivered or returned quantity must be greater than 0');
        }
      }

      // Validate that delivery date is not in the future
      const deliveryDateTime = new Date(`${data.delivery_date}T${data.delivery_time}`);
      const now = new Date();
      if (deliveryDateTime > now) {
        throw new Error('Delivery date and time cannot be in the future');
      }

      // Validate inventory availability for deliveries
      for (const line of data.lines) {
        if (line.delivered_qty > 0) {
          const available = await this.inventoryService.getAvailableQuantity(
            line.cylinder_type_id,
            'YARD',
            undefined,
            'FILLED'
          );
          if (available < line.delivered_qty) {
            throw new Error(`Insufficient FILLED cylinders available in YARD for cylinder type ${line.cylinder_type_id}. Available: ${available}, Required: ${line.delivered_qty}`);
          }
        }

        // Validate return availability (customer must have empty cylinders to return)
        if (line.returned_qty > 0) {
          const availableEmpty = await this.inventoryService.getAvailableQuantity(
            line.cylinder_type_id,
            'CUSTOMER',
            data.customer_id,
            'EMPTY'
          );
          if (availableEmpty < line.returned_qty) {
            throw new Error(`Customer does not have enough EMPTY cylinders to return for cylinder type ${line.cylinder_type_id}. Available: ${availableEmpty}, Required: ${line.returned_qty}`);
          }
        }
      }

      // Create delivery transaction
      const delivery = await this.repository.createWithTransaction(data, createdBy);

      // Process inventory movements for each line
      for (const line of data.lines) {
        await this.inventoryService.processDeliveryMovements(
          line.cylinder_type_id,
          line.delivered_qty,
          line.returned_qty,
          data.customer_id,
          delivery.delivery_id,
          createdBy
        );
      }

      return delivery;
    } catch (error) {
      console.error('Error creating delivery transaction:', error);
      throw error instanceof Error ? error : new Error('Failed to create delivery transaction');
    }
  }
}
