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
  Calendar, StickyNote, Save,
} from 'lucide-react';

const STATUS_FLOW: DeliveryStatus[] = [
  'pending', 'assigned', 'pickup', 'on_delivery', 'delivered', 'failed', 'cancelled',
];

export default function DeliveryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [assignForm, setAssignForm] = useState<{
    status: DeliveryStatus;
    driver_id?: number;
    vehicle_id?: number;
  }>({ status: 'pending' });

  const fetchDelivery = async () => {
    setLoading(true);
    try {
      const response = await apiService.getDelivery(id);
      setDelivery(response.data);
      setAssignForm({
        status: response.data.status,
        driver_id: response.data.driver_id ?? undefined,
        vehicle_id: response.data.vehicle_id ?? undefined,
      });
    } catch (error) {
      console.error('Failed to fetch delivery:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchDelivery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [driverRes, vehicleRes] = await Promise.all([
          apiService.getDrivers(1, '', ''),
          apiService.getVehicles(1, '', ''),
        ]);
        setDrivers(driverRes.data);
        setVehicles(vehicleRes.data);
      } catch (error) {
        console.error('Failed to load drivers/vehicles:', error);
      }
    };
    loadOptions();
  }, []);

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!delivery) return;
    setSaving(true);
    setErrors({});
    try {
      const response = await apiService.updateDelivery(delivery.id, assignForm);
      setDelivery(response.data);
    } catch (error: any) {
      const apiErrors = error.response?.data?.errors;
      const message = error.response?.data?.message || 'Gagal memperbarui delivery order';
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        alert(message);
      }
    } finally {
      setSaving(false);
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
        {/* Info pelanggan & paket */}
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

        {/* Penugasan & status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Penugasan &amp; Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
              <Truck className="w-4 h-4" />
              {delivery.driver_name ? (
                <span>{delivery.driver_name} &middot; {delivery.vehicle_code} ({delivery.plate_number})</span>
              ) : (
                <span className="text-gray-400">Belum ada driver/kendaraan yang ditugaskan</span>
              )}
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={assignForm.status}
                    onChange={e => setAssignForm({ ...assignForm, status: e.target.value as DeliveryStatus })}
                  >
                    {STATUS_FLOW.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Driver</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={assignForm.driver_id ?? ''}
                    onChange={e => setAssignForm({ ...assignForm, driver_id: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">Belum ditugaskan</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.employee_id})</option>
                    ))}
                  </select>
                  {errors.driver_id && <p className="text-xs text-red-600 mt-1">{errors.driver_id[0]}</p>}
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Kendaraan</label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={assignForm.vehicle_id ?? ''}
                    onChange={e => setAssignForm({ ...assignForm, vehicle_id: e.target.value ? Number(e.target.value) : undefined })}
                  >
                    <option value="">Belum ditugaskan</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.vehicle_code} - {v.plate_number}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                Status <strong>Ditugaskan</strong>, <strong>Pengambilan</strong>, dan <strong>Dalam Pengiriman</strong> wajib memiliki driver &amp; kendaraan.
                Saat status diubah menjadi <strong>Terkirim</strong>/<strong>Gagal</strong>, statistik driver otomatis diperbarui dan kendaraan otomatis kembali <strong>Tersedia</strong>.
              </p>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Simpan Perubahan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}