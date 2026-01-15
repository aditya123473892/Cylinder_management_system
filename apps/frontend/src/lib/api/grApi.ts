import { GrWithDelivery, CreateGrRequest, ApproveGrRequest, ApiResponse } from '../../types/gr';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class GrApiService {
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

  async getAllGrs(): Promise<GrWithDelivery[]> {
    const response = await this.request<GrWithDelivery[]>('/api/gr');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch GRs');
    }
    return response.data;
  }

  async getGrById(id: number): Promise<GrWithDelivery> {
    const response = await this.request<GrWithDelivery>(`/api/gr/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch GR');
    }
    return response.data;
  }

  async createGr(data: CreateGrRequest): Promise<GrWithDelivery> {
    const response = await this.request<GrWithDelivery>('/api/gr', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create GR');
    }
    return response.data;
  }

  async approveGr(id: number, data: ApproveGrRequest): Promise<GrWithDelivery> {
    const response = await this.request<GrWithDelivery>(`/api/gr/${id}/approve`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to approve GR');
    }
    return response.data;
  }

  async finalizeGr(id: number): Promise<GrWithDelivery> {
    const response = await this.request<GrWithDelivery>(`/api/gr/${id}/finalize`, {
      method: 'PUT',
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to finalize GR');
    }
    return response.data;
  }

  async closeTrip(id: number): Promise<GrWithDelivery> {
    const response = await this.request<GrWithDelivery>(`/api/gr/${id}/close-trip`, {
      method: 'PUT',
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to close trip');
    }
    return response.data;
  }
}

export const grApi = new GrApiService();
