'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/services/api';
import { Delivery, DeliveryPriority, Driver, Vehicle } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function CreateDeliveryPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const [formData, setFormData] = useState<Partial<Delivery>>({
    order_number: '',
    customer_name: '',
    customer_phone: '',
    pickup_address: '',
    destination_address: '',
    package_description: '',
    package_weight: 0,
    package_quantity: 1,
    delivery_date: '',
    priority: 'normal',
    driver_id: undefined,
    vehicle_id: undefined,
    notes: '',
  });

  useEffect(() => {
    // Catatan: dropdown hanya menampilkan halaman pertama (10 data) dari driver aktif
    // & kendaraan tersedia. Gunakan pencarian di modul Driver/Vehicle untuk data lebih banyak.
    const loadOptions = async () => {
      try {
        const [driverRes, vehicleRes] = await Promise.all([
          apiService.getDrivers(1, '', 'active'),
          apiService.getVehicles(1, '', 'available'),
        ]);
        setDrivers(driverRes.data);
        setVehicles(vehicleRes.data);
      } catch (error) {
        console.error('Failed to load drivers/vehicles:', error);
      }
    };
    loadOptions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      const payload: Partial<Delivery> = { ...formData };
      if (!payload.order_number) delete payload.order_number;
      if (!payload.driver_id) delete payload.driver_id;
      if (!payload.vehicle_id) delete payload.vehicle_id;

      const response = await apiService.createDelivery(payload);
      router.push(`/deliveries/${response.data.id}`);
    } catch (error: any) {
      const apiErrors = error.response?.data?.errors;
      const message = error.response?.data?.message || 'Gagal membuat delivery order';
      if (apiErrors) {
        setErrors(apiErrors);
      } else {
        alert(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/deliveries">
          <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Buat Delivery Order</h1>
          <p className="text-sm text-gray-500">Kosongkan No. Order agar dibuat otomatis.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">No. Order (opsional)</label>
            <Input
              placeholder="Auto-generate jika kosong"
              value={formData.order_number || ''}
              onChange={e => setFormData({ ...formData, order_number: e.target.value })}
            />
            {errors.order_number && <p className="text-xs text-red-600 mt-1">{errors.order_number[0]}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Tanggal Kirim</label>
            <Input
              type="date" required
              value={formData.delivery_date || ''}
              onChange={e => setFormData({ ...formData, delivery_date: e.target.value })}
            />
            {errors.delivery_date && <p className="text-xs text-red-600 mt-1">{errors.delivery_date[0]}</p>}
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Nama Pelanggan</label>
            <Input required value={formData.customer_name || ''} onChange={e => setFormData({ ...formData, customer_name: e.target.value })} />
            {errors.customer_name && <p className="text-xs text-red-600 mt-1">{errors.customer_name[0]}</p>}
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Telepon Pelanggan</label>
            <Input required value={formData.customer_phone || ''} onChange={e => setFormData({ ...formData, customer_phone: e.target.value })} />
            {errors.customer_phone && <p className="text-xs text-red-600 mt-1">{errors.customer_phone[0]}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">Alamat Penjemputan</label>
            <Input required value={formData.pickup_address || ''} onChange={e => setFormData({ ...formData, pickup_address: e.target.value })} />
            {errors.pickup_address && <p className="text-xs text-red-600 mt-1">{errors.pickup_address[0]}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">Alamat Tujuan</label>
            <Input required value={formData.destination_address || ''} onChange={e => setFormData({ ...formData, destination_address: e.target.value })} />
            {errors.destination_address && <p className="text-xs text-red-600 mt-1">{errors.destination_address[0]}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">Deskripsi Paket</label>
            <Input value={formData.package_description || ''} onChange={e => setFormData({ ...formData, package_description: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Berat Paket (kg)</label>
            <Input type="number" step="0.01" min="0" value={formData.package_weight ?? 0} onChange={e => setFormData({ ...formData, package_weight: parseFloat(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Jumlah Paket</label>
            <Input type="number" min="1" value={formData.package_quantity ?? 1} onChange={e => setFormData({ ...formData, package_quantity: parseInt(e.target.value) || 1 })} />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Prioritas</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={formData.priority || 'normal'}
              onChange={e => setFormData({ ...formData, priority: e.target.value as DeliveryPriority })}
            >
              <option value="low">Rendah</option>
              <option value="normal">Normal</option>
              <option value="high">Tinggi</option>
              <option value="urgent">Mendesak</option>
            </select>
          </div>
          <div />

          <div>
            <label className="text-sm font-medium mb-1 block">Driver (opsional)</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={formData.driver_id ?? ''}
              onChange={e => setFormData({ ...formData, driver_id: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Belum ditugaskan</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.employee_id})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Kendaraan (opsional)</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              value={formData.vehicle_id ?? ''}
              onChange={e => setFormData({ ...formData, vehicle_id: e.target.value ? Number(e.target.value) : undefined })}
            >
              <option value="">Belum ditugaskan</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.vehicle_code} - {v.plate_number}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium mb-1 block">Catatan</label>
            <Input value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Link href="/deliveries">
            <Button type="button" variant="outline" disabled={submitting}>Batal</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Buat Delivery
          </Button>
        </div>
      </form>
    </div>
  );
}