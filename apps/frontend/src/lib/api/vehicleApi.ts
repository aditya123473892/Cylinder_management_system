import { VehicleMaster, CreateVehicleRequest, UpdateVehicleRequest, ApiResponse } from '../../types/vehicle';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class VehicleApiService {
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

  async getAllVehicles(): Promise<VehicleMaster[]> {
    const response = await this.request<VehicleMaster[]>('/api/vehicles');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch vehicles');
    }
    return response.data;
  }

  async getVehicleById(id: number): Promise<VehicleMaster> {
    const response = await this.request<VehicleMaster>(`/api/vehicles/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch vehicle');
    }
    return response.data;
  }

  async createVehicle(data: CreateVehicleRequest): Promise<VehicleMaster> {
    const response = await this.request<VehicleMaster>('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create vehicle');
    }
    return response.data;
  }

  async updateVehicle(id: number, data: UpdateVehicleRequest): Promise<VehicleMaster> {
    const response = await this.request<VehicleMaster>(`/api/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update vehicle');
    }
    return response.data;
  }

  async deleteVehicle(id: number): Promise<void> {
    const response = await this.request<void>(`/api/vehicles/${id}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete vehicle');
    }
  }
}

export const vehicleApi = new VehicleApiService();
