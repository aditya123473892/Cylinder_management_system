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
        throw new Error(data.message || 'API request failed');
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
