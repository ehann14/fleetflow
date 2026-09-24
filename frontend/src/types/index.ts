// ==========================================
// TRACKING (Milestone 7)
// ==========================================
export type TrackingDeliveryStatus = 'assigned' | 'pickup' | 'on_delivery';

export interface TrackingDelivery {
  id: number;
  order_number: string;
  status: TrackingDeliveryStatus;
  customer_name: string;
  destination_address: string;
}

export interface TrackingItem {
  vehicle_id: number;
  vehicle_code: string;
  plate_number: string;
  brand: string;
  model: string;
  vehicle_status: VehicleStatus;
  driver_id: number | null;
  driver_name: string | null;
  driver_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  /** Format "YYYY-MM-DD HH:MM:SS", zona waktu server (UTC). Gunakan parseServerTime(). */
  timestamp: string | null;
  seconds_since_update: number | null;
  is_online: boolean;
  delivery: TrackingDelivery | null;
}

export interface TrackingHistoryPoint {
  driver_id: number | null;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

export interface TrackingDetail extends TrackingItem {
  history: TrackingHistoryPoint[];
}

export interface TrackingListResponse {
  success: boolean;
  message: string;
  data: TrackingItem[];
  meta: {
    total: number;
    online: number;
    online_threshold_seconds: number;
  };
}

export interface TrackingDetailResponse {
  success: boolean;
  message: string;
  data: TrackingDetail;
  meta: {
    history_count: number;
    history_limit: number;
    online_threshold_seconds: number;
  };
}

export interface SendLocationPayload {
  vehicle_id: number;
  /** Opsional untuk role driver (diisi otomatis oleh backend). */
  driver_id?: number;
  latitude: number;
  longitude: number;
  speed?: number;
  /** "YYYY-MM-DD HH:MM:SS", ISO 8601, atau epoch detik. Default: waktu server. */
  timestamp?: string | number;
}

export interface SavedLocation {
  id: number;
  vehicle_id: number;
  driver_id: number | null;
  latitude: number;
  longitude: number;
  speed: number;
  timestamp: string;
}

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

export type DriverStatus = 'active' | 'inactive' | 'on_leave';

export interface Driver {
  id: number;
  employee_id: string;
  name: string;
  phone: string;
  email: string;
  license_number: string;
  license_expiry: string;
  status: DriverStatus;
  total_deliveries: number;
  completed_deliveries: number;
  failed_deliveries: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export type DeliveryStatus =
  | 'pending'
  | 'assigned'
  | 'pickup'
  | 'on_delivery'
  | 'delivered'
  | 'failed'
  | 'cancelled';

export type DeliveryPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Delivery {
  id: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  destination_address: string;
  package_description: string | null;
  package_weight: number;
  package_quantity: number;
  delivery_date: string;
  priority: DeliveryPriority;
  driver_id: number | null;
  vehicle_id: number | null;
  status: DeliveryStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Hasil join dari backend (opsional, hanya ada di response GET)
  driver_name?: string | null;
  vehicle_code?: string | null;
  plate_number?: string | null;
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