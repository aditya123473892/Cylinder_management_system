import { InventoryItem, InventorySummary, InventoryDashboard, CylinderMovement, InventoryQuery } from '../../types/cylinderInventory';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class CylinderInventoryApi {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async getInventory(query?: InventoryQuery): Promise<{ success: boolean; data: InventoryItem[] }> {
    const params = new URLSearchParams();
    if (query?.locationType) params.append('locationType', query.locationType);
    if (query?.referenceId !== undefined) params.append('referenceId', query.referenceId.toString());
    if (query?.cylinderStatus) params.append('cylinderStatus', query.cylinderStatus);
    if (query?.cylinderTypeId) params.append('cylinderTypeId', query.cylinderTypeId.toString());

    const queryString = params.toString();
    const endpoint = `/api/cylinder-inventory${queryString ? `?${queryString}` : ''}`;

    return this.request<{ success: boolean; data: InventoryItem[] }>(endpoint);
  }

  async getInventorySummary(): Promise<{ success: boolean; data: InventorySummary[] }> {
    return this.request<{ success: boolean; data: InventorySummary[] }>('/api/cylinder-inventory/summary');
  }

  async getInventoryDashboard(): Promise<{ success: boolean; data: InventoryDashboard }> {
    return this.request<{ success: boolean; data: InventoryDashboard }>('/api/cylinder-inventory/dashboard');
  }

  async getAvailableQuantity(
    cylinderTypeId: number,
    locationType: string,
    referenceId?: number,
    cylinderStatus: 'FILLED' | 'EMPTY' = 'FILLED'
  ): Promise<{ success: boolean; data: { quantity: number } }> {
    const endpoint = `/api/cylinder-inventory/available/${cylinderTypeId}/${locationType}${referenceId ? `/${referenceId}` : '/0'}/${cylinderStatus}`;
    return this.request<{ success: boolean; data: { quantity: number } }>(endpoint);
  }

  async getCylinderMovements(
    cylinderTypeId?: number,
    referenceTransactionId?: number,
    limit: number = 50
  ): Promise<{ success: boolean; data: CylinderMovement[] }> {
    const params = new URLSearchParams();
    if (cylinderTypeId) params.append('cylinderTypeId', cylinderTypeId.toString());
    if (referenceTransactionId) params.append('referenceTransactionId', referenceTransactionId.toString());
    if (limit !== 50) params.append('limit', limit.toString());

    const queryString = params.toString();
    const endpoint = `/api/cylinder-inventory/movements${queryString ? `?${queryString}` : ''}`;

    return this.request<{ success: boolean; data: CylinderMovement[] }>(endpoint);
  }

  async initializeInventory(data: {
    locationType: string;
    referenceId?: number;
    cylinders: Array<{
      cylinderTypeId: number;
      quantity: number;
      cylinderStatus: 'FILLED' | 'EMPTY';
    }>;
  }): Promise<{ success: boolean; data: any; message: string }> {
    // Initialize inventory by adding cylinders to specified locations
    return this.request<{ success: boolean; data: any; message: string }>('/api/cylinder-inventory/initialize', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

const apiInstance = new CylinderInventoryApi();
export { apiInstance as cylinderInventoryApi };
