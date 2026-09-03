import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiError, ApiResponse, PaginatedResponse, Vehicle } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

// Mock Data untuk Development
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

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      timeout: 30000,
    });
    this.setupInterceptors();
  }

  private setupInterceptors() {
    this.api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (token && config.headers) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    this.api.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiError>) => {
        if (error.response?.status === 401) this.handleUnauthorized();
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
  async login(email: string, password: string) { return this.api.post('/auth/login', { email, password }); }
  async getMe() { return this.api.get('/auth/me'); }
  async logout() { return this.api.post('/auth/logout'); }

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
}

export const apiService = new ApiService();
export default apiService;