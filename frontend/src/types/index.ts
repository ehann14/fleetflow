export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type UserRole = 'admin' | 'dispatcher' | 'driver' | 'manager';

export type VehicleStatus = 'available' | 'assigned' | 'on_delivery' | 'maintenance' | 'inactive';

export interface Vehicle {
  id: number;
  vehicle_code: string;
  plate_number: string;
  brand: string;
  model: string;
  type: string;
  year: number;
  capacity: number;
  fuel_type: string;
  current_mileage: number;
  status: VehicleStatus;
  last_service: string;
  next_service: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
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