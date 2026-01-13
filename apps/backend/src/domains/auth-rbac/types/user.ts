export interface UserMaster {
  UserId: number;
  FullName: string;
  Email: string;
  PasswordHash: string;
  Role: string;
  CustomerId: number | null;
  IsActive: boolean;
  LastLoginAt: string | null;
  CreatedAt: string;
  CreatedBy: number | null;
}

export interface CreateUserRequest {
  FullName: string;
  Email: string;
  Password: string;
  Role?: string;
  CustomerId?: number | null;
  CreatedBy?: number | null;
}

export interface UpdateUserRequest {
  FullName?: string;
  Email?: string;
  Role?: string;
  CustomerId?: number | null;
  IsActive?: boolean;
}

export interface LoginRequest {
  Email: string;
  Password: string;
}

export interface AuthResponse {
  user: {
    UserId: number;
    FullName: string;
    Email: string;
    Role: string;
    CustomerId: number | null;
  };
  token: string;
}
