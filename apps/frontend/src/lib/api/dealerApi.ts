import { DealerMaster, CreateDealerRequest, UpdateDealerRequest, ApiResponse } from '../../types/dealer';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class DealerApiService {
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

  async getAllDealers(): Promise<DealerMaster[]> {
    const response = await this.request<DealerMaster[]>('/api/dealers');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch dealers');
    }
    return response.data;
  }

  async getDealerById(id: number): Promise<DealerMaster> {
    const response = await this.request<DealerMaster>(`/api/dealers/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch dealer');
    }
    return response.data;
  }

  async createDealer(data: CreateDealerRequest): Promise<DealerMaster> {
    const response = await this.request<DealerMaster>('/api/dealers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create dealer');
    }
    return response.data;
  }

  async updateDealer(id: number, data: UpdateDealerRequest): Promise<DealerMaster> {
    const response = await this.request<DealerMaster>(`/api/dealers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update dealer');
    }
    return response.data;
  }

  async deleteDealer(id: number): Promise<void> {
    const response = await this.request<void>(`/api/dealers/${id}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete dealer');
    }
  }
}

export const dealerApi = new DealerApiService();
