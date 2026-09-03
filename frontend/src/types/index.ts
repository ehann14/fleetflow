export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'dispatcher' | 'driver' | 'manager';
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
}

export type UserRole = 'admin' | 'dispatcher' | 'driver' | 'manager';