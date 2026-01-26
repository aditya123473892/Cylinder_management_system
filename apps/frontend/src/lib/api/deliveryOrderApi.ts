import {
  DeliveryOrder,
  DeliveryOrderWithLines,
  DeliveryPlan,
  DeliveryDashboardData,
  UserPendingTasks,
  CreateDeliveryOrderRequest,
  CreateDeliveryPlanRequest,
  LoadingLineRequest,
  ReconciliationLineRequest,
  DeliveryOrderFilters,
  DeliveryPlanFilters
} from '../../types/deliveryOrder';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class DeliveryOrderApiService {
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

  // Delivery Order API functions
  async createOrder(orderData: CreateDeliveryOrderRequest): Promise<{ order_id: number }> {
    const response = await this.request<{ order_id: number }>('/api/delivery-orders/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create delivery order');
    }
    return response.data;
  }

  async getOrders(filters?: DeliveryOrderFilters): Promise<DeliveryOrder[]> {
    const params = new URLSearchParams();
    if (filters?.customer_id) params.append('customer_id', filters.customer_id.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);

    const response = await this.request<DeliveryOrder[]>(`/api/delivery-orders/orders?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch delivery orders');
    }
    return response.data;
  }

  async getOrderById(orderId: number): Promise<DeliveryOrderWithLines> {
    const response = await this.request<DeliveryOrderWithLines>(`/api/delivery-orders/orders/${orderId}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch delivery order');
    }
    return response.data;
  }

  async updateOrderStatus(orderId: number, status: string, updatedBy: number): Promise<void> {
    const response = await this.request<void>(`/api/delivery-orders/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, updated_by: updatedBy }),
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to update order status');
    }
  }

  // Delivery Planning API functions
  async createPlan(planData: CreateDeliveryPlanRequest): Promise<{ plan_id: number }> {
    const response = await this.request<{ plan_id: number }>('/api/delivery-orders/plans', {
      method: 'POST',
      body: JSON.stringify(planData),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create delivery plan');
    }
    return response.data;
  }

  async getPlans(filters?: DeliveryPlanFilters): Promise<DeliveryPlan[]> {
    const params = new URLSearchParams();
    if (filters?.date_from) params.append('date_from', filters.date_from);
    if (filters?.date_to) params.append('date_to', filters.date_to);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.vehicle_id) params.append('vehicle_id', filters.vehicle_id.toString());

    const response = await this.request<DeliveryPlan[]>(`/api/delivery-orders/plans?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch delivery plans');
    }
    return response.data;
  }

  async updatePlanStatus(planId: number, status: string, updatedBy: number): Promise<void> {
    const response = await this.request<void>(`/api/delivery-orders/plans/${planId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, updated_by: updatedBy }),
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to update plan status');
    }
  }

  // Loading Process API functions
  async startLoading(planId: number, loadedBy: number, supervisorId?: number): Promise<{ loading_id: number }> {
    const response = await this.request<{ loading_id: number }>('/api/delivery-orders/loading/start', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        loaded_by: loadedBy,
        supervisor_id: supervisorId
      }),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to start loading');
    }
    return response.data;
  }

  async completeLoading(loadingId: number, loadingLines: LoadingLineRequest[], notes?: string): Promise<void> {
    const response = await this.request<void>('/api/delivery-orders/loading/complete', {
      method: 'POST',
      body: JSON.stringify({
        loading_id: loadingId,
        loading_lines: loadingLines,
        notes
      }),
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to complete loading');
    }
  }

  // Delivery Execution API functions
  async recordExecution(planId: number, orderId: number, deliveryTransactionId: number, actualDeliveryTime?: string): Promise<void> {
    const response = await this.request<void>('/api/delivery-orders/execution/record', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        order_id: orderId,
        delivery_transaction_id: deliveryTransactionId,
        actual_delivery_time: actualDeliveryTime
      }),
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to record delivery execution');
    }
  }

  // Reconciliation API functions
  async createReconciliation(planId: number, reconciledBy: number, reconciliationLines: ReconciliationLineRequest[]): Promise<{ reconciliation_id: number }> {
    const response = await this.request<{ reconciliation_id: number }>('/api/delivery-orders/reconciliation', {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        reconciled_by: reconciledBy,
        reconciliation_lines: reconciliationLines
      }),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to create reconciliation');
    }
    return response.data;
  }

  // Dashboard and Reporting API functions
  async getDashboardData(dateFrom?: string, dateTo?: string): Promise<DeliveryDashboardData> {
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    const response = await this.request<DeliveryDashboardData>(`/api/delivery-orders/dashboard?${params.toString()}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch dashboard data');
    }
    return response.data;
  }

  async getUserPendingTasks(userId: number): Promise<UserPendingTasks[]> {
    const response = await this.request<UserPendingTasks[]>(`/api/delivery-orders/tasks/${userId}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to fetch user pending tasks');
    }
    return response.data;
  }
}

export const deliveryOrderApi = new DeliveryOrderApiService();
