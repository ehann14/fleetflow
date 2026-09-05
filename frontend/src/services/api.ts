import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError, ApiResponse, PaginatedResponse, Vehicle, Driver, Delivery } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// UBAH INI MENJADI FALSE agar terhubung ke backend CodeIgniter
const USE_MOCK = false; 

// ==========================================
// MOCK DATA untuk Development
// ==========================================
let mockVehicles: Vehicle[] = [
  {
    id: 1, vehicle_code: 'VH-001', plate_number: 'B 1234 CD', brand: 'Toyota', model: 'HiAce',
    type: 'Van', year: 2022, capacity: 1000, fuel_type: 'Diesel', current_mileage: 45000,
    status: 'available', last_service: '2023-10-01', next_service: '2024-01-01',
    created_at: '2023-01-01', updated_at: '2023-01-01'
  },
  {
    id: 2, vehicle_code: 'VH-002', plate_number: 'B 5678 EF', brand: 'Mitsubishi', model: 'Colt Diesel',
    type: 'Truck', year: 2021, capacity: 4000, fuel_type: 'Diesel', current_mileage: 85000,
    status: 'on_delivery', last_service: '2023-09-15', next_service: '2023-12-15',
    created_at: '2023-01-01', updated_at: '2023-01-01'
  },
  {
    id: 3, vehicle_code: 'VH-003', plate_number: 'B 9012 GH', brand: 'Honda', model: 'Brio',
    type: 'Car', year: 2023, capacity: 400, fuel_type: 'Gasoline', current_mileage: 12000,
    status: 'maintenance', last_service: '2023-11-01', next_service: '2024-02-01',
    created_at: '2023-01-01', updated_at: '2023-01-01'
  }
];

let mockDrivers: Driver[] = [
  {
    id: 1, employee_id: 'EMP-001', name: 'Mike Driver', phone: '081234567890',
    email: 'driver@fleetflow.com', license_number: 'SIM-B2-001', license_expiry: '2027-05-01',
    status: 'active', total_deliveries: 120, completed_deliveries: 112, failed_deliveries: 8,
    rating: 4.6, created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 2, employee_id: 'EMP-002', name: 'Budi Santoso', phone: '081298765432',
    email: 'budi@fleetflow.com', license_number: 'SIM-B2-002', license_expiry: '2026-11-15',
    status: 'active', total_deliveries: 88, completed_deliveries: 80, failed_deliveries: 8,
    rating: 4.3, created_at: '2024-01-01', updated_at: '2024-01-01'
  },
  {
    id: 3, employee_id: 'EMP-003', name: 'Siti Aminah', phone: '081345678912',
    email: 'siti@fleetflow.com', license_number: 'SIM-B2-003', license_expiry: '2025-08-20',
    status: 'on_leave', total_deliveries: 45, completed_deliveries: 40, failed_deliveries: 5,
    rating: 4.1, created_at: '2024-01-01', updated_at: '2024-01-01'
  },
];

let mockDeliveries: Delivery[] = [
  {
    id: 1, order_number: 'DO-20260901-0001', customer_name: 'PT Sinar Jaya', customer_phone: '081211112222',
    pickup_address: 'Gudang A, Jl. Industri No.1', destination_address: 'Jl. Merdeka No.10, Bandung',
    package_description: 'Elektronik', package_weight: 25.5, package_quantity: 3,
    delivery_date: '2026-09-10', priority: 'high', driver_id: 1, vehicle_id: 2,
    status: 'on_delivery', notes: null, created_at: '2026-09-01', updated_at: '2026-09-01',
    driver_name: 'Mike Driver', vehicle_code: 'VH-001', plate_number: 'B 1234 CD'
  },
];

// ==========================================
// API SERVICE CLASS
// ==========================================
class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json' 
      },
      timeout: 30000,
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
    
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) {
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }

  private handleUnauthorized() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  }

  // --- AUTH ---
  async login(email: string, password: string) { 
    return this.api.post('/auth/login', { email, password }); 
  }
  async getMe() { 
    return this.api.get('/auth/me'); 
  }
  async logout() { 
    return this.api.post('/auth/logout'); 
  }

  // --- VEHICLES ---
  async getVehicles(page = 1, search = '', status = ''): Promise<PaginatedResponse<Vehicle>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      let filtered = mockVehicles;
      if (search) filtered = filtered.filter(v => v.plate_number.toLowerCase().includes(search.toLowerCase()) || v.brand.toLowerCase().includes(search.toLowerCase()));
      if (status) filtered = filtered.filter(v => v.status === status);
      
      const perPage = 10;
      const total = filtered.length;
      const data = filtered.slice((page - 1) * perPage, page * perPage);
      
      return {
        success: true, message: 'Success', data,
        meta: { current_page: page, last_page: Math.ceil(total / perPage) || 1, per_page: perPage, total }
      };
    }
    const response = await this.api.get('/vehicles', { params: { page, search, status } });
    return response.data;
  }

  async createVehicle(data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      const newVehicle: Vehicle = { ...data, id: Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Vehicle;
      mockVehicles.unshift(newVehicle);
      return { success: true, message: 'Vehicle created', data: newVehicle };
    }
    const response = await this.api.post('/vehicles', data);
    return response.data;
  }

  async updateVehicle(id: number, data: Partial<Vehicle>): Promise<ApiResponse<Vehicle>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      const index = mockVehicles.findIndex(v => v.id === id);
      if (index !== -1) {
        mockVehicles[index] = { ...mockVehicles[index], ...data, updated_at: new Date().toISOString() };
        return { success: true, message: 'Vehicle updated', data: mockVehicles[index] };
      }
      throw new Error('Vehicle not found');
    }
    const response = await this.api.put(`/vehicles/${id}`, data);
    return response.data;
  }

  async deleteVehicle(id: number): Promise<ApiResponse<any>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      mockVehicles = mockVehicles.filter(v => v.id !== id);
      return { success: true, message: 'Vehicle deleted', data: null };
    }
    const response = await this.api.delete(`/vehicles/${id}`);
    return response.data;
  }

  // --- DRIVERS ---
  async getDrivers(page = 1, search = '', status = ''): Promise<PaginatedResponse<Driver>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      let filtered = mockDrivers;
      if (search) filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.employee_id.toLowerCase().includes(search.toLowerCase())
      );
      if (status) filtered = filtered.filter(d => d.status === status);

      const perPage = 10;
      const total = filtered.length;
      const data = filtered.slice((page - 1) * perPage, page * perPage);

      return {
        success: true, message: 'Success', data,
        meta: { current_page: page, last_page: Math.ceil(total / perPage) || 1, per_page: perPage, total }
      };
    }
    const response = await this.api.get('/drivers', { params: { page, search, status } });
    return response.data;
  }

  async getDriver(id: number): Promise<ApiResponse<Driver>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 300));
      const driver = mockDrivers.find(d => d.id === id);
      if (!driver) throw new Error('Driver not found');
      return { success: true, message: 'Success', data: driver };
    }
    const response = await this.api.get(`/drivers/${id}`);
    return response.data;
  }

  async createDriver(data: Partial<Driver>): Promise<ApiResponse<Driver>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      const newDriver: Driver = {
        ...data,
        id: Date.now(),
        total_deliveries: 0, completed_deliveries: 0, failed_deliveries: 0, rating: 0,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      } as Driver;
      mockDrivers.unshift(newDriver);
      return { success: true, message: 'Driver created', data: newDriver };
    }
    const response = await this.api.post('/drivers', data);
    return response.data;
  }

  async updateDriver(id: number, data: Partial<Driver>): Promise<ApiResponse<Driver>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      const index = mockDrivers.findIndex(d => d.id === id);
      if (index !== -1) {
        mockDrivers[index] = { ...mockDrivers[index], ...data, updated_at: new Date().toISOString() };
        return { success: true, message: 'Driver updated', data: mockDrivers[index] };
      }
      throw new Error('Driver not found');
    }
    
    const response = await this.api.put(`/drivers/${id}`, data);
    return response.data;
  }

  async deleteDriver(id: number): Promise<ApiResponse<any>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      mockDrivers = mockDrivers.filter(d => d.id !== id);
      return { success: true, message: 'Driver deleted', data: null };
    }
    const response = await this.api.delete(`/drivers/${id}`);
    return response.data;
  }

  // --- DELIVERIES ---
  async getDeliveries(page = 1, search = '', status = '', priority = ''): Promise<PaginatedResponse<Delivery>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      let filtered = mockDeliveries;
      if (search) filtered = filtered.filter(d =>
        d.order_number.toLowerCase().includes(search.toLowerCase()) ||
        d.customer_name.toLowerCase().includes(search.toLowerCase())
      );
      if (status) filtered = filtered.filter(d => d.status === status);
      if (priority) filtered = filtered.filter(d => d.priority === priority);

      const perPage = 10;
      const total = filtered.length;
      const data = filtered.slice((page - 1) * perPage, page * perPage);

      return {
        success: true, message: 'Success', data,
        meta: { current_page: page, last_page: Math.ceil(total / perPage) || 1, per_page: perPage, total }
      };
    }
    const response = await this.api.get('/deliveries', { params: { page, search, status, priority } });
    return response.data;
  }

  async getDelivery(id: number): Promise<ApiResponse<Delivery>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 300));
      const delivery = mockDeliveries.find(d => d.id === id);
      if (!delivery) throw new Error('Delivery not found');
      return { success: true, message: 'Success', data: delivery };
    }
    const response = await this.api.get(`/deliveries/${id}`);
    return response.data;
  }

  async createDelivery(data: Partial<Delivery>): Promise<ApiResponse<Delivery>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      const newDelivery: Delivery = {
        ...data,
        id: Date.now(),
        order_number: data.order_number || `DO-${Date.now()}`,
        status: data.status || 'pending',
        created_at: new Date().toISOString(), updated_at: new Date().toISOString()
      } as Delivery;
      mockDeliveries.unshift(newDelivery);
      return { success: true, message: 'Delivery created', data: newDelivery };
    }
    const response = await this.api.post('/deliveries', data);
    return response.data;
  }

  async updateDelivery(id: number, data: Partial<Delivery>): Promise<ApiResponse<Delivery>> {
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 500));
      const index = mockDeliveries.findIndex(d => d.id === id);
      if (index !== -1) {
        mockDeliveries[index] = { ...mockDeliveries[index], ...data, updated_at: new Date().toISOString() };
        return { success: true, message: 'Delivery updated', data: mockDeliveries[index] };
      }
      throw new Error('Delivery not found');
    }
    const response = await this.api.put(`/deliveries/${id}`, data);
    return response.data;
  }
}

export const apiService = new ApiService();
export default apiService;