import { LoginRequest, SignupRequest, AuthResponse } from '../../types/auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class AuthApiService {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
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

  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Login failed');
    }
    return response.data;
  }

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await this.request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Signup failed');
    }
    return response.data;
  }

  async logout(): Promise<void> {
    const token = localStorage.getItem('authToken');
    const response = await this.request('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.success) {
      throw new Error(response.message || 'Logout failed');
    }
  }

  async getProfile(): Promise<any> {
    const token = localStorage.getItem('authToken');
    const response = await this.request('/api/auth/profile', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to get profile');
    }
    return response.data;
  }
}

export const authApi = new AuthApiService();
