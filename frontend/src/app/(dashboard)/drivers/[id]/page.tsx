'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { Driver } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverStatusBadge } from '@/components/ui/driver-status-badge';
import { ArrowLeft, Star, Phone, Mail, Badge, Loader2 } from 'lucide-react';

export default function DriverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDriver = async () => {
      setLoading(true);
      try {
        const response = await apiService.getDriver(id);
        setDriver(response.data);
      } catch (error) {
        console.error('Failed to fetch driver:', error);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDriver();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="text-center py-12 text-gray-500">
        Driver tidak ditemukan.
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push('/drivers')}>Kembali</Button>
        </div>
      </div>
    );
  }

  // --- JARING PENGAMAN: Konversi ke Number untuk menghindari error operasi matematika ---
  const totalDeliveries = Number(driver.total_deliveries) || 0;
  const completedDeliveries = Number(driver.completed_deliveries) || 0;
  const failedDeliveries = Number(driver.failed_deliveries) || 0;
  const rating = Number(driver.rating) || 0;

  const completedPct = totalDeliveries > 0
    ? Math.round((completedDeliveries / totalDeliveries) * 100)
    : 0;
  const failedPct = totalDeliveries > 0
    ? Math.round((failedDeliveries / totalDeliveries) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push('/drivers')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{driver.name}</h1>
          <p className="text-sm text-gray-500">{driver.employee_id}</p>
        </div>
        <DriverStatusBadge status={driver.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Driver</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" /> {driver.phone}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-4 h-4" /> {driver.email}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Badge className="w-4 h-4" /> {driver.license_number}
            </div>
            <div className="text-gray-500 pl-6">Berlaku hingga {driver.license_expiry}</div>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Statistik & Performa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalDeliveries}</div>
                <div className="text-xs text-gray-500">Total Pengiriman</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{completedDeliveries}</div>
                <div className="text-xs text-gray-500">Selesai</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{failedDeliveries}</div>
                <div className="text-xs text-gray-500">Gagal</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
              <span className="text-lg font-semibold">{rating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">/ 5.0 rating</span>
            </div>

            {/* Simple bar visualization, tanpa dependency chart */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Tingkat Keberhasilan</span>
                <span>{completedPct}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div className="h-full bg-green-500" style={{ width: `${completedPct}%` }} />
                <div className="h-full bg-red-400" style={{ width: `${failedPct}%` }} />
              </div>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Selesai</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Gagal</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}