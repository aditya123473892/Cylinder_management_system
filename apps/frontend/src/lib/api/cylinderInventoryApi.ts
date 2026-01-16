import { CylinderInventorySummary, CylinderLocationSummary, CylinderMovementLog, CreateCylinderMovementRequest } from '../../types/cylinderInventory';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class CylinderInventoryApi {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('authToken');

    const response = await fetch(`${API_BASE_URL}/api/cylinder-inventory${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getInventorySummary(): Promise<CylinderInventorySummary[]> {
    return this.request('/summary');
  }

  async getLocationSummary(): Promise<CylinderLocationSummary[]> {
    return this.request('/locations');
  }

  async recordMovement(movement: CreateCylinderMovementRequest): Promise<CylinderMovementLog> {
    return this.request('/movements', {
      method: 'POST',
      body: JSON.stringify(movement),
    });
  }

  async recordDeliveryMovement(deliveryId: number, cylinderTypeId: number, quantity: number, vehicleId: number): Promise<CylinderMovementLog> {
    return this.request('/delivery-movements', {
      method: 'POST',
      body: JSON.stringify({ deliveryId, cylinderTypeId, quantity, vehicleId }),
    });
  }

  async recordGrApprovalMovement(deliveryId: number, cylinderTypeId: number, quantity: number): Promise<CylinderMovementLog> {
    return this.request('/gr-movements', {
      method: 'POST',
      body: JSON.stringify({ deliveryId, cylinderTypeId, quantity }),
    });
  }

  async recordReturnMovement(deliveryId: number, cylinderTypeId: number, deliveredQuantity: number, returnedQuantity: number): Promise<void> {
    return this.request('/return-movements', {
      method: 'POST',
      body: JSON.stringify({ deliveryId, cylinderTypeId, deliveredQuantity, returnedQuantity }),
    });
  }

  async getMovementLogs(limit?: number, offset?: number): Promise<CylinderMovementLog[]> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());

    const queryString = params.toString();
    return this.request(`/movements${queryString ? `?${queryString}` : ''}`);
  }

  async getMovementsByCylinderType(cylinderTypeId: number): Promise<CylinderMovementLog[]> {
    return this.request(`/movements/cylinder/${cylinderTypeId}`);
  }

  async getMovementsByTransaction(transactionId: number): Promise<CylinderMovementLog[]> {
    return this.request(`/movements/transaction/${transactionId}`);
  }

  async initializeInventory(inventoryData: Array<{cylinder_type_id: number, quantity: number}>): Promise<void> {
    return this.request('/initialize', {
      method: 'POST',
      body: JSON.stringify({ inventoryData }),
    });
  }
}

export const cylinderInventoryApi = new CylinderInventoryApi();
