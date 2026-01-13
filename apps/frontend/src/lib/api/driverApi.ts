import { DriverMaster, CreateDriverRequest, UpdateDriverRequest, ApiResponse } from '../../types/driver';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class DriverApiService {
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

  async getAllDrivers(): Promise<DriverMaster[]> {
    const response = await this.request<DriverMaster[]>('/api/drivers');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch drivers');
    }
    return response.data;
  }

  async getDriverById(id: number): Promise<DriverMaster> {
    const response = await this.request<DriverMaster>(`/api/drivers/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch driver');
    }
    return response.data;
  }

  async createDriver(data: CreateDriverRequest): Promise<DriverMaster> {
    const response = await this.request<DriverMaster>('/api/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create driver');
    }
    return response.data;
  }

  async updateDriver(id: number, data: UpdateDriverRequest): Promise<DriverMaster> {
    const response = await this.request<DriverMaster>(`/api/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update driver');
    }
    return response.data;
  }

  async deleteDriver(id: number): Promise<void> {
    const response = await this.request<void>(`/api/drivers/${id}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete driver');
    }
  }
}

export const driverApi = new DriverApiService();
