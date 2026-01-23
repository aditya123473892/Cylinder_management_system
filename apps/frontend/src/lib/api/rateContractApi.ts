import { RateContractMaster, CreateRateContractRequest, UpdateRateContractRequest, ApiResponse } from '../../types/rateContract';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class RateContractApiService {
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

  async getAllRateContracts(): Promise<RateContractMaster[]> {
    const response = await this.request<RateContractMaster[]>('/api/rate-contracts');
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch rate contracts');
    }
    return response.data;
  }

  async getRateContractById(id: number): Promise<RateContractMaster> {
    const response = await this.request<RateContractMaster>(`/api/rate-contracts/${id}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch rate contract');
    }
    return response.data;
  }

  async getActiveRateContracts(customerId?: number, dealerId?: number, effectiveDate?: string): Promise<RateContractMaster[]> {
    const params = new URLSearchParams();
    if (customerId) params.append('customerId', customerId.toString());
    if (dealerId) params.append('dealerId', dealerId.toString());
    if (effectiveDate) params.append('effectiveDate', effectiveDate);

    const response = await this.request<RateContractMaster[]>(`/api/rate-contracts/active?${params}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch active rate contracts');
    }
    return response.data;
  }

  async getActiveRateForCylinder(customerId?: number, dealerId?: number, cylinderTypeId?: number, effectiveDate?: string): Promise<any> {
    const params = new URLSearchParams();
    if (customerId) params.append('customerId', customerId.toString());
    if (dealerId) params.append('dealerId', dealerId.toString());
    if (cylinderTypeId) params.append('cylinderTypeId', cylinderTypeId.toString());
    if (effectiveDate) params.append('effectiveDate', effectiveDate);

    const response = await this.request<any>(`/api/rate-contracts/active-rate?${params}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch active rate for cylinder');
    }
    return response.data;
  }

  async createRateContract(data: CreateRateContractRequest): Promise<RateContractMaster> {
    const response = await this.request<RateContractMaster>('/api/rate-contracts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create rate contract');
    }
    return response.data;
  }

  async updateRateContract(id: number, data: UpdateRateContractRequest): Promise<RateContractMaster> {
    const response = await this.request<RateContractMaster>(`/api/rate-contracts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to update rate contract');
    }
    return response.data;
  }

  async deleteRateContract(id: number): Promise<void> {
    const response = await this.request<void>(`/api/rate-contracts/${id}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to delete rate contract');
    }
  }
}

export const rateContractApi = new RateContractApiService();
