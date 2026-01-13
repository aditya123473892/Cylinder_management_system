import { CylinderTypeMaster, CreateCylinderTypeRequest, UpdateCylinderTypeRequest, ApiResponse } from '../../types/cylinderType';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class CylinderTypeApiService {
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

  async getAllCylinderTypes(): Promise<CylinderTypeMaster[]> {
    const response = await this.request<CylinderTypeMaster[]>('/api/cylinder-types');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch cylinder types');
    }
    return response.data;
  }

  async getCylinderTypeById(id: number): Promise<CylinderTypeMaster> {
    const response = await this.request<CylinderTypeMaster>(`/api/cylinder-types/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch cylinder type');
    }
    return response.data;
  }

  async createCylinderType(data: CreateCylinderTypeRequest): Promise<CylinderTypeMaster> {
    const response = await this.request<CylinderTypeMaster>('/api/cylinder-types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create cylinder type');
    }
    return response.data;
  }

  async updateCylinderType(id: number, data: UpdateCylinderTypeRequest): Promise<CylinderTypeMaster> {
    const response = await this.request<CylinderTypeMaster>(`/api/cylinder-types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update cylinder type');
    }
    return response.data;
  }

  async deleteCylinderType(id: number): Promise<void> {
    const response = await this.request<void>(`/api/cylinder-types/${id}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete cylinder type');
    }
  }
}

export const cylinderTypeApi = new CylinderTypeApiService();
