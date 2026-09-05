'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Users, Package, TrendingUp, LucideIcon } from 'lucide-react';

// PATH YANG BENAR sesuai struktur folder Anda
import apiService from '@/services/api'; 

// Tipe data sesuai dengan response yang dikembalikan getDashboardStats
interface DashboardStats {
  total_vehicles: number;
  active_drivers: number;
  active_deliveries: number;
  completed_today: number;
}

const getIcon = (key: string): LucideIcon => {
  switch (key) {
    case 'vehicles': return Truck;
    case 'drivers': return Users;
    case 'deliveries': return Package;
    case 'completed': return TrendingUp;
    default: return Package;
  }
};

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  // 1. Redirect jika belum login
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // 2. Fetch data dashboard setelah user terautentikasi
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchStats = async () => {
      try {
        setIsStatsLoading(true);
        setStatsError(null);
        
        // Menggunakan apiService yang sudah kita update
        const response = await apiService.getDashboardStats();
        
        // Ambil data dari properti 'data' (sesuai format ApiResponse di apiService)
        setStats(response.data); 
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStatsError('Gagal memuat data dashboard. Pastikan backend berjalan atau coba ubah USE_MOCK menjadi true di api.ts');
      } finally {
        setIsStatsLoading(false);
      }
    };

    fetchStats();
  }, [isAuthenticated]);

  // Loading state untuk autentikasi
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Jika belum login, return null (akan di-redirect oleh useEffect)
  if (!isAuthenticated) {
    return null;
  }

  // Format data untuk UI mapping
  const uiStats = stats ? [
    { name: 'Total Vehicles', value: stats.total_vehicles.toString(), change: '+2', key: 'vehicles', color: 'bg-blue-500' },
    { name: 'Active Drivers', value: stats.active_drivers.toString(), change: '+1', key: 'drivers', color: 'bg-green-500' },
    { name: 'Active Deliveries', value: stats.active_deliveries.toString(), change: '+3', key: 'deliveries', color: 'bg-yellow-500' },
    { name: 'Completed Today', value: stats.completed_today.toString(), change: '+12%', key: 'completed', color: 'bg-purple-500' },
  ] : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {user?.name}! Here is what is happening with your fleet today.
        </p>
      </div>

      {/* Loading State untuk Data Dashboard */}
      {isStatsLoading && (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-gray-600">Memuat data statistik...</span>
        </div>
      )}

      {/* Error State */}
      {statsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600 text-sm font-medium">Error: {statsError}</p>
          </CardContent>
        </Card>
      )}

      {/* Render Data Cards */}
      {!isStatsLoading && !statsError && stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {uiStats.map((stat) => {
            const IconComponent = getIcon(stat.key);
            return (
              <Card key={stat.key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
                  <div className={`p-2 rounded-lg ${stat.color}`}>
                    <IconComponent className="h-4 w-4 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.change} from last month</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}