import { DeliveryTransaction, DeliveryTransactionWithLines, CreateDeliveryTransactionRequest, ApiResponse } from '../../types/deliveryTransaction';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class DeliveryTransactionApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options?.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        // Parse inventory error messages for better user experience
        let errorMessage = data.message || 'API request failed';

        // Parse delivery inventory errors: "Insufficient FILLED cylinders available in YARD for cylinder type 3. Available: 10, Required: 80"
        if (errorMessage.includes('Insufficient') && errorMessage.includes('cylinders available')) {
          const match = errorMessage.match(/Insufficient (\w+) cylinders available in (\w+) for cylinder type (\d+)\. Available: (\d+), Required: (\d+)/);
          if (match) {
            const [, status, location, cylinderTypeId, available, required] = match;
            errorMessage = `Not enough ${status.toLowerCase()} cylinders available in ${location}. You requested ${required} but only ${available} are available. Please check your inventory or reduce the delivery quantity.`;
          }
        }

        // Parse return validation errors: "Customer does not have enough EMPTY cylinders to return for cylinder type 2. Available: 0, Required: 3"
        if (errorMessage.includes('does not have enough') && errorMessage.includes('cylinders to return')) {
          const match = errorMessage.match(/Customer does not have enough (\w+) cylinders to return for cylinder type (\d+)\. Available: (\d+), Required: (\d+)/);
          if (match) {
            const [, status, cylinderTypeId, available, required] = match;
            errorMessage = `Customer doesn't have enough ${status.toLowerCase()} cylinders to return. You requested to return ${required} cylinders but they only have ${available} available. Please check the customer's current inventory or adjust the return quantity.`;
          }
        }

        throw new Error(errorMessage);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async getAllDeliveryTransactions(): Promise<DeliveryTransaction[]> {
    const response = await this.request<DeliveryTransaction[]>('/api/delivery-transactions');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch delivery transactions');
    }
    return response.data;
  }

  async getDeliveryTransactionById(id: number): Promise<DeliveryTransactionWithLines> {
    const response = await this.request<DeliveryTransactionWithLines>(`/api/delivery-transactions/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch delivery transaction');
    }
    return response.data;
  }

  async createDeliveryTransaction(data: CreateDeliveryTransactionRequest): Promise<DeliveryTransactionWithLines> {
    const response = await this.request<DeliveryTransactionWithLines>('/api/delivery-transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create delivery transaction');
    }
    return response.data;
  }
}

export const deliveryTransactionApi = new DeliveryTransactionApiService();
