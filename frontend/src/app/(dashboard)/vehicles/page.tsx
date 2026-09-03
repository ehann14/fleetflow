'use client';

import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';
import { Vehicle, VehicleStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Plus, Search, Pencil, Trash2, X, Loader2 } from 'lucide-react';

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>({
    vehicle_code: '', plate_number: '', brand: '', model: '', type: '',
    year: new Date().getFullYear(), capacity: 0, fuel_type: 'Diesel',
    current_mileage: 0, status: 'available', last_service: '', next_service: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getVehicles(currentPage, search, statusFilter);
      setVehicles(response.data);
      setTotalPages(response.meta.last_page);
    } catch (error) {
      console.error('Failed to fetch vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, statusFilter]);

  const handleOpenModal = (vehicle?: Vehicle) => {
    if (vehicle) {
      setEditingVehicle(vehicle);
      setFormData(vehicle);
    } else {
      setEditingVehicle(null);
      setFormData({
        vehicle_code: '', plate_number: '', brand: '', model: '', type: '',
        year: new Date().getFullYear(), capacity: 0, fuel_type: 'Diesel',
        current_mileage: 0, status: 'available', last_service: '', next_service: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingVehicle) {
        await apiService.updateVehicle(editingVehicle.id, formData);
      } else {
        await apiService.createVehicle(formData);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      alert('Gagal menyimpan data kendaraan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kendaraan ini?')) return;
    try {
      await apiService.deleteVehicle(id);
      fetchData();
    } catch (error) {
      alert('Gagal menghapus data');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Kendaraan</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola data armada, status, dan perawatan kendaraan.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Kendaraan
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari plat nomor atau merek..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | '')}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Status</option>
          <option value="available">Tersedia</option>
          <option value="assigned">Ditugaskan</option>
          <option value="on_delivery">Dalam Pengiriman</option>
          <option value="maintenance">Perawatan</option>
          <option value="inactive">Tidak Aktif</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-6 py-4">Kode / Plat</th>
                <th className="px-6 py-4">Merek / Model</th>
                <th className="px-6 py-4">Tipe / Kapasitas</th>
                <th className="px-6 py-4">Kilometer</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada data kendaraan ditemukan.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{v.vehicle_code}</div>
                      <div className="text-gray-500">{v.plate_number}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{v.brand}</div>
                      <div className="text-gray-500">{v.model}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{v.type}</div>
                      <div className="text-gray-500">{v.capacity} kg</div>
                    </td>
                    <td className="px-6 py-4">{v.current_mileage.toLocaleString()} km</td>
                    <td className="px-6 py-4"><StatusBadge status={v.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(v)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(v.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && vehicles.length > 0 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Halaman {currentPage} dari {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>
                Sebelumnya
              </Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>
                Selanjutnya
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">{editingVehicle ? 'Edit Kendaraan' : 'Tambah Kendaraan Baru'}</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Kode Kendaraan</label>
                  <Input required value={formData.vehicle_code} onChange={e => setFormData({...formData, vehicle_code: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Nomor Plat</label>
                  <Input required value={formData.plate_number} onChange={e => setFormData({...formData, plate_number: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Merek</label>
                  <Input required value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Model</label>
                  <Input required value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Tipe</label>
                  <Input required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} placeholder="e.g., Van, Truck" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Tahun</label>
                  <Input type="number" required value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Kapasitas (kg)</label>
                  <Input type="number" required value={formData.capacity} onChange={e => setFormData({...formData, capacity: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Jenis Bahan Bakar</label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={formData.fuel_type} onChange={e => setFormData({...formData, fuel_type: e.target.value})}>
                    <option value="Diesel">Diesel</option>
                    <option value="Gasoline">Bensin</option>
                    <option value="Electric">Listrik</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Kilometer Saat Ini</label>
                  <Input type="number" required value={formData.current_mileage} onChange={e => setFormData({...formData, current_mileage: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as VehicleStatus})}>
                    <option value="available">Tersedia</option>
                    <option value="assigned">Ditugaskan</option>
                    <option value="on_delivery">Dalam Pengiriman</option>
                    <option value="maintenance">Perawatan</option>
                    <option value="inactive">Tidak Aktif</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Servis Terakhir</label>
                  <Input type="date" required value={formData.last_service} onChange={e => setFormData({...formData, last_service: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Servis Berikutnya</label>
                  <Input type="date" required value={formData.next_service} onChange={e => setFormData({...formData, next_service: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>Batal</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingVehicle ? 'Simpan Perubahan' : 'Tambah Kendaraan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}