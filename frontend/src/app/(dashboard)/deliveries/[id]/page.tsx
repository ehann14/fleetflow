'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiService } from '@/services/api';
import { Delivery, DeliveryStatus, Driver, Vehicle } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DeliveryStatusBadge, DeliveryPriorityBadge } from '@/components/ui/delivery-status-badge';
import {
  ArrowLeft, Loader2, Phone, User, MapPin, Package, Truck,
  Calendar, StickyNote,
} from 'lucide-react';

// ==========================================
// KONFIGURASI STATUS & TIMELINE
// ==========================================
const STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['pickup', 'cancelled'],
  pickup: ['on_delivery', 'cancelled'],
  on_delivery: ['delivered', 'failed'],
  delivered: [],
  failed: [],
  cancelled: [],
};

const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Menunggu',
  assigned: 'Ditugaskan',
  pickup: 'Pengambilan',
  on_delivery: 'Dalam Pengiriman',
  delivered: 'Terkirim',
  failed: 'Gagal',
  cancelled: 'Dibatalkan',
};

const TIMELINE_STEPS: DeliveryStatus[] = ['pending', 'assigned', 'pickup', 'on_delivery', 'delivered'];

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State untuk Modal Assign
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignDriverId, setAssignDriverId] = useState<number | ''>('');
  const [assignVehicleId, setAssignVehicleId] = useState<number | ''>('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  // State untuk Timeline & Status Change
  const [history, setHistory] = useState<any[]>([]);
  const [changingStatus, setChangingStatus] = useState(false);

  const fetchDelivery = async () => {
    setLoading(true);
    try {
      const response = await apiService.getDelivery(id);
      setDelivery(response.data);
    } catch (error) {
      console.error('Failed to fetch delivery:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await apiService.getDeliveryHistory(id);
      setHistory(res.data || []);
    } catch (e) {
      console.error('Failed to fetch history:', e);
    }
  };

  useEffect(() => {
    if (id) {
      fetchDelivery();
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openAssignModal = async () => {
    setAssignError('');
    setAssignDriverId('');
    setAssignVehicleId('');
    try {
      const [driverRes, vehicleRes] = await Promise.all([
        apiService.getDrivers(1, '', 'active'),
        apiService.getVehicles(1, '', 'available'),
      ]);
      setDrivers(driverRes.data);
      setVehicles(vehicleRes.data);
      
      if (delivery?.driver_id) setAssignDriverId(delivery.driver_id);
      if (delivery?.vehicle_id) setAssignVehicleId(delivery.vehicle_id);
      
      setIsAssignModalOpen(true);
    } catch {
      alert('Gagal memuat daftar driver/kendaraan');
    }
  };

  const handleConfirmAssign = async () => {
    if (!assignDriverId || !assignVehicleId) {
      setAssignError('Driver dan kendaraan wajib dipilih');
      return;
    }
    setAssigning(true);
    setAssignError('');
    try {
      const response = await apiService.assignDelivery(id, {
        driver_id: Number(assignDriverId),
        vehicle_id: Number(assignVehicleId),
      });
      setDelivery(response.data);
      fetchHistory(); // Refresh history karena assign juga mencatat history
      setIsAssignModalOpen(false);
    } catch (error: any) {
      const apiErrors = error.response?.data?.errors;
      const message = error.response?.data?.message || 'Gagal melakukan assignment';
      const firstFieldError = apiErrors ? Object.values(apiErrors).flat()[0] : null;
      setAssignError((firstFieldError as string) || message);
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusChange = async (nextStatus: DeliveryStatus) => {
    if (!delivery) return;
    if (!confirm(`Ubah status menjadi "${STATUS_LABELS[nextStatus]}"?`)) return;
    
    setChangingStatus(true);
    try {
      const res = await apiService.updateDeliveryStatus(delivery.id, nextStatus);
      setDelivery(res.data);
      fetchHistory(); // Refresh history setelah status berubah
    } catch (error: any) {
      alert(error.response?.data?.message || 'Gagal mengubah status');
    } finally {
      setChangingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="text-center py-12 text-gray-500">
        Delivery order tidak ditemukan.
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push('/deliveries')}>Kembali</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => router.push('/deliveries')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{delivery.order_number}</h1>
          <p className="text-sm text-gray-500">{delivery.customer_name}</p>
        </div>
        <DeliveryStatusBadge status={delivery.status} />
        <DeliveryPriorityBadge priority={delivery.priority} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kolom Kiri: Info pelanggan & paket */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Informasi Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <User className="w-4 h-4" /> {delivery.customer_name}
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="w-4 h-4" /> {delivery.customer_phone}
            </div>
            <div className="flex items-start gap-2 text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-400">Penjemputan</div>
                {delivery.pickup_address}
              </div>
            </div>
            <div className="flex items-start gap-2 text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                <div className="text-xs text-gray-400">Tujuan</div>
                {delivery.destination_address}
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" /> {delivery.delivery_date}
            </div>
            <div className="flex items-start gap-2 text-gray-600">
              <Package className="w-4 h-4 mt-0.5 shrink-0" />
              <div>
                {delivery.package_description || '-'}
                <div className="text-xs text-gray-400">
                  {delivery.package_quantity} pcs &middot; {Number(delivery.package_weight).toFixed(2)} kg
                </div>
              </div>
            </div>
            {delivery.notes && (
              <div className="flex items-start gap-2 text-gray-600">
                <StickyNote className="w-4 h-4 mt-0.5 shrink-0" />
                <div>{delivery.notes}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kolom Kanan: Timeline, Penugasan, & Aksi */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Timeline & Penugasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* 1. Info Penugasan & Tombol Assign */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Truck className="w-4 h-4" />
                {delivery.driver_name ? (
                  <span className="font-medium text-gray-900">
                    {delivery.driver_name} &middot; {delivery.vehicle_code} ({delivery.plate_number})
                  </span>
                ) : (
                  <span className="text-gray-400">Belum ada driver/kendaraan yang ditugaskan</span>
                )}
              </div>
              <Button onClick={openAssignModal} variant="outline" size="sm">
                <Truck className="w-4 h-4 mr-2" />
                {delivery.driver_id ? 'Ubah Penugasan' : 'Tugaskan Driver & Kendaraan'}
              </Button>
            </div>

            <div className="border-t" />

            {/* 2. Timeline Visual */}
            <div>
              <h4 className="text-sm font-medium mb-3">Progres Pengiriman</h4>
              <div className="flex items-center mb-6 overflow-x-auto pb-2">
                {TIMELINE_STEPS.map((step, idx) => {
                  const currentIdx = TIMELINE_STEPS.indexOf(delivery.status);
                  const isDone = currentIdx >= 0 && idx <= currentIdx;
                  const isFailedOrCancelled = ['failed', 'cancelled'].includes(delivery.status);
                  
                  return (
                    <div key={step} className="flex items-center flex-1 min-w-[80px]">
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors
                          ${isDone && !isFailedOrCancelled ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                          {idx + 1}
                        </div>
                        <span className="text-[10px] sm:text-xs mt-1 text-center text-gray-600 leading-tight">
                          {STATUS_LABELS[step]}
                        </span>
                      </div>
                      {idx < TIMELINE_STEPS.length - 1 && (
                        <div className={`h-0.5 flex-1 mx-1 ${isDone && idx < currentIdx && !isFailedOrCancelled ? 'bg-green-500' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Warning untuk status akhir */}
            {['failed', 'cancelled'].includes(delivery.status) && (
              <div className="text-sm px-3 py-2 rounded-md bg-red-50 text-red-700 border border-red-200">
                Delivery ini berstatus <strong>{STATUS_LABELS[delivery.status]}</strong> (status akhir).
              </div>
            )}

            {/* 4. Tombol Aksi Dinamis */}
            <div className="flex flex-wrap gap-2">
              {STATUS_TRANSITIONS[delivery.status].length === 0 ? (
                <p className="text-sm text-gray-400 italic">Tidak ada aksi lanjutan — status sudah final.</p>
              ) : (
                STATUS_TRANSITIONS[delivery.status].map((nextStatus) => (
                  <Button
                    key={nextStatus}
                    variant={nextStatus === 'cancelled' || nextStatus === 'failed' ? 'destructive' : 'default'}
                    disabled={changingStatus}
                    onClick={() => handleStatusChange(nextStatus)}
                  >
                    {changingStatus && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Ubah ke: {STATUS_LABELS[nextStatus]}
                  </Button>
                ))
              )}
            </div>

            {/* 5. Riwayat Perubahan Status */}
            {history.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="text-sm font-medium mb-2">Riwayat Perubahan</h4>
                <ul className="space-y-2 text-sm text-gray-600 max-h-48 overflow-y-auto pr-2">
                  {history.map((h, i) => (
                    <li key={h.id || i} className="flex justify-between items-start gap-2 py-1 border-b border-gray-100 last:border-0">
                      <span className="flex-1">
                        {h.from_status ? `${STATUS_LABELS[h.from_status as DeliveryStatus] ?? h.from_status} → ` : 'Dibuat → '}
                        <span className="font-medium text-gray-900">{STATUS_LABELS[h.to_status as DeliveryStatus] ?? h.to_status}</span>
                        {h.notes && <span className="block text-xs text-gray-500 mt-0.5">Catatan: {h.notes}</span>}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(h.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </CardContent>
        </Card>
      </div>

      {/* Modal Assign (Tetap dipertahankan) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-lg font-semibold">Assign Driver & Kendaraan</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsAssignModalOpen(false)}>✕</Button>
            </div>
            <div className="p-6 space-y-4">
              {assignError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  {assignError}
                </div>
              )}
              <div>
                <label className="text-sm font-medium mb-1 block">Pilih Driver</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={assignDriverId}
                  onChange={e => setAssignDriverId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Pilih driver aktif --</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.employee_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Pilih Kendaraan</label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={assignVehicleId}
                  onChange={e => setAssignVehicleId(e.target.value ? Number(e.target.value) : '')}
                >
                  <option value="">-- Pilih kendaraan tersedia --</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.vehicle_code} - {v.plate_number}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={() => setIsAssignModalOpen(false)} disabled={assigning}>
                Batal
              </Button>
              <Button onClick={handleConfirmAssign} disabled={assigning}>
                {assigning && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Konfirmasi
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}