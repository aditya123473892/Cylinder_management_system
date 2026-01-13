import { CustomerMaster, CreateCustomerRequest, UpdateCustomerRequest, ApiResponse } from '../../types/customer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class CustomerApiService {
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

  async getAllCustomers(): Promise<CustomerMaster[]> {
    const response = await this.request<CustomerMaster[]>('/api/customers');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch customers');
    }
    return response.data;
  }

  async getCustomerById(id: number): Promise<CustomerMaster> {
    const response = await this.request<CustomerMaster>(`/api/customers/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch customer');
    }
    return response.data;
  }

  async createCustomer(data: CreateCustomerRequest): Promise<CustomerMaster> {
    const response = await this.request<CustomerMaster>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create customer');
    }
    return response.data;
  }

  async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<CustomerMaster> {
    const response = await this.request<CustomerMaster>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update customer');
    }
    return response.data;
  }

  async deleteCustomer(id: number): Promise<void> {
    const response = await this.request<void>(`/api/customers/${id}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete customer');
    }
  }
}

export const customerApi = new CustomerApiService();
