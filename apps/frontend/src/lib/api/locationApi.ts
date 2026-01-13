import { LocationMaster, CreateLocationRequest, UpdateLocationRequest, ApiResponse } from '../../types/location';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class LocationApiService {
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

  async getAllLocations(): Promise<LocationMaster[]> {
    const response = await this.request<LocationMaster[]>('/api/locations');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch locations');
    }
    return response.data;
  }

  async getLocationById(id: number): Promise<LocationMaster> {
    const response = await this.request<LocationMaster>(`/api/locations/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch location');
    }
    return response.data;
  }

  async createLocation(data: CreateLocationRequest): Promise<LocationMaster> {
    const response = await this.request<LocationMaster>('/api/locations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create location');
    }
    return response.data;
  }

  async updateLocation(id: number, data: UpdateLocationRequest): Promise<LocationMaster> {
    const response = await this.request<LocationMaster>(`/api/locations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update location');
    }
    return response.data;
  }

  async deleteLocation(id: number): Promise<void> {
    const response = await this.request<void>(`/api/locations/${id}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete location');
    }
  }
}

export const locationApi = new LocationApiService();
