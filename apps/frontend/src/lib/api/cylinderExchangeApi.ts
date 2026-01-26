import {
  OrderExchangeTracking,
  DailyReconciliation,
  ExchangeVarianceDetail,
  VehicleEndOfDayInventory,
  RecordExchangeRequest,
  CreateDailyReconciliationRequest,
  UpdateVarianceResolutionRequest,
  CountVehicleInventoryRequest,
  ExchangeTrackingFilters,
  DailyReconciliationFilters,
  ExchangeSummary,
  ExchangeVarianceSummary,
  OrderExchangeTrackingWithOrder,
  DailyReconciliationWithDetails
} from '../../types/cylinderExchange';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class CylinderExchangeApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<{ success: boolean; data?: T; message?: string }> {
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

  // Order Exchange Tracking API functions
  async recordExchange(exchangeData: RecordExchangeRequest): Promise<{ exchange_id: number }> {
    const response = await this.request<{ exchange_id: number }>('/api/exchange/record', {
      method: 'POST',
      body: JSON.stringify(exchangeData),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to record exchange');
    }
    return response.data;
  }

  async getExchangeTracking(filters?: ExchangeTrackingFilters): Promise<OrderExchangeTracking[]> {
    const params = new URLSearchParams();
    if (filters?.plan_id) params.append('plan_id', filters.plan_id.toString());
    if (filters?.order_id) params.append('order_id', filters.order_id.toString());
    if (filters?.variance_type) params.append('variance_type', filters.variance_type);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.customer_id) params.append('customer_id', filters.customer_id.toString());

    const response = await this.request<OrderExchangeTracking[]>(`/api/exchange/tracking?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch exchange tracking');
    }
    return response.data;
  }

  async getExchangeTrackingWithOrder(exchangeId: number): Promise<OrderExchangeTrackingWithOrder> {
    const response = await this.request<OrderExchangeTrackingWithOrder>(`/api/exchange/tracking/${exchangeId}/with-order`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch exchange tracking with order');
    }
    return response.data;
  }

  async updateExchangeAcknowledgment(exchangeId: number, acknowledgedBy: number): Promise<void> {
    const response = await this.request<void>(`/api/exchange/tracking/${exchangeId}/acknowledge`, {
      method: 'PUT',
      body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to update exchange acknowledgment');
    }
  }

  // Daily Reconciliation API functions
  async createDailyReconciliation(reconciliationData: CreateDailyReconciliationRequest): Promise<{ reconciliation_id: number }> {
    const response = await this.request<{ reconciliation_id: number }>('/api/exchange/reconciliation', {
      method: 'POST',
      body: JSON.stringify(reconciliationData),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create daily reconciliation');
    }
    return response.data;
  }

  async getDailyReconciliations(filters?: DailyReconciliationFilters): Promise<DailyReconciliation[]> {
    const params = new URLSearchParams();
    if (filters?.plan_id) params.append('plan_id', filters.plan_id.toString());
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.reconciled_by) params.append('reconciled_by', filters.reconciled_by.toString());

    const response = await this.request<DailyReconciliation[]>(`/api/exchange/reconciliation?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch daily reconciliations');
    }
    return response.data;
  }

  async getDailyReconciliationWithDetails(reconciliationId: number): Promise<DailyReconciliationWithDetails> {
    const response = await this.request<DailyReconciliationWithDetails>(`/api/exchange/reconciliation/${reconciliationId}/with-details`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch daily reconciliation with details');
    }
    return response.data;
  }

  async updateVarianceResolution(resolutionData: UpdateVarianceResolutionRequest): Promise<void> {
    const response = await this.request<void>('/api/exchange/variance-resolution', {
      method: 'PUT',
      body: JSON.stringify(resolutionData),
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to update variance resolution');
    }
  }

  // Vehicle Inventory API functions
  async countVehicleInventory(inventoryData: CountVehicleInventoryRequest): Promise<void> {
    const response = await this.request<void>('/api/exchange/vehicle-inventory', {
      method: 'POST',
      body: JSON.stringify(inventoryData),
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to count vehicle inventory');
    }
  }

  async getVehicleInventory(planId: number): Promise<VehicleEndOfDayInventory[]> {
    const response = await this.request<VehicleEndOfDayInventory[]>(`/api/exchange/vehicle-inventory/${planId}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch vehicle inventory');
    }
    return response.data;
  }

  // Summary and Reporting API functions
  async getExchangeSummary(planId: number): Promise<ExchangeSummary> {
    const response = await this.request<ExchangeSummary>(`/api/exchange/summary/${planId}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch exchange summary');
    }
    return response.data;
  }

  async getExchangeVarianceSummary(planId: number): Promise<ExchangeVarianceSummary[]> {
    const response = await this.request<ExchangeVarianceSummary[]>(`/api/exchange/variance-summary/${planId}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch exchange variance summary');
    }
    return response.data;
  }

  async approveReconciliation(reconciliationId: number, approvedBy: number): Promise<void> {
    const response = await this.request<void>(`/api/exchange/reconciliation/${reconciliationId}/approve`, {
      method: 'PUT',
      body: JSON.stringify({ approved_by: approvedBy }),
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to approve reconciliation');
    }
  }

  async updateReconciliationStatus(reconciliationId: number, status: string, updatedBy: number): Promise<void> {
    const response = await this.request<void>(`/api/exchange/reconciliation/${reconciliationId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, updated_by: updatedBy }),
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to update reconciliation status');
    }
  }
}

export const cylinderExchangeApi = new CylinderExchangeApiService();