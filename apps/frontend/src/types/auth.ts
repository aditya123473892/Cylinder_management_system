export interface User {
  UserId: number;
  FullName: string;
  Email: string;
  Role: string;
  CustomerId: number | null;
}

export interface LoginRequest {
  Email: string;
  Password: string;
}

export interface SignupRequest {
  FullName: string;
  Email: string;
  Password: string;
  Role?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}
