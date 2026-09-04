'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiService } from '@/services/api';
import { Driver, DriverStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DriverStatusBadge } from '@/components/ui/driver-status-badge';
import { Plus, Search, Pencil, Trash2, X, Loader2, Star, Eye } from 'lucide-react';

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DriverStatus | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState<Partial<Driver>>({
    employee_id: '', name: '', phone: '', email: '',
    license_number: '', license_expiry: '', status: 'active'
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getDrivers(currentPage, search, statusFilter);
      setDrivers(response.data);
      setTotalPages(response.meta.last_page);
    } catch (error) {
      console.error('Failed to fetch drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, statusFilter]);

  const handleOpenModal = (driver?: Driver) => {
    if (driver) {
      setEditingDriver(driver);
      setFormData(driver);
    } else {
      setEditingDriver(null);
      setFormData({
        employee_id: '', name: '', phone: '', email: '',
        license_number: '', license_expiry: '', status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingDriver) {
        // Hapus field yang tidak boleh dikirim saat update
        const { id, created_at, updated_at, ...dataToSend } = formData;
        
        // DEBUG: Lihat di Console browser apa yang dikirim
        console.log("🚀 MENGIRIM UPDATE KE BACKEND:");
        console.log("ID:", editingDriver.id);
        console.log("PAYLOAD:", dataToSend);

        const response = await apiService.updateDriver(editingDriver.id, dataToSend);
        console.log("✅ RESPON DARI BACKEND:", response);
      } else {
        await apiService.createDriver(formData);
      }
      
      setIsModalOpen(false);
      // Tunggu fetchData selesai agar UI langsung update
      await fetchData(); 
    } catch (error: any) {
      console.error("❌ ERROR SAAT SAVE:", error);
      const errors = error.response?.data?.errors;
      const message = error.response?.data?.message || 'Gagal menyimpan data driver';
      
      if (errors) {
        const errorMessages = Object.values(errors).flat().join('\n');
        alert(`Validasi Gagal:\n${errorMessages}`);
      } else {
        alert(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus driver ini?')) return;
    try {
      await apiService.deleteDriver(id);
      fetchData();
    } catch (error) {
      alert('Gagal menghapus data');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manajemen Driver</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola data driver, status, dan performa pengiriman.</p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" /> Tambah Driver
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari nama atau ID karyawan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DriverStatus | '')}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Tidak Aktif</option>
          <option value="on_leave">Cuti</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-6 py-4">ID / Nama</th>
                <th className="px-6 py-4">Kontak</th>
                <th className="px-6 py-4">SIM</th>
                <th className="px-6 py-4">Rating</th>
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
              ) : drivers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Tidak ada data driver ditemukan.
                  </td>
                </tr>
              ) : (
                drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{d.employee_id}</div>
                      <div className="text-gray-500">{d.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{d.phone}</div>
                      <div className="text-gray-500">{d.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{d.license_number}</div>
                      <div className="text-gray-500">Exp: {d.license_expiry}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        {Number(d.rating || 0).toFixed(1)}
                      </div>
                    </td>
                    <td className="px-6 py-4"><DriverStatusBadge status={d.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/drivers/${d.id}`}>
                          <Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(d)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(d.id)}>
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

        {!loading && drivers.length > 0 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <span className="text-sm text-gray-500">Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">{editingDriver ? 'Edit Driver' : 'Tambah Driver Baru'}</h2>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">ID Karyawan</label>
                  <Input required value={formData.employee_id || ''} onChange={e => setFormData({...formData, employee_id: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Nama Lengkap</label>
                  <Input required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Telepon</label>
                  <Input required value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Email</label>
                  <Input type="email" required value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Nomor SIM</label>
                  <Input required value={formData.license_number || ''} onChange={e => setFormData({...formData, license_number: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Masa Berlaku SIM</label>
                  <Input type="date" required value={formData.license_expiry || ''} onChange={e => setFormData({...formData, license_expiry: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Status</label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={formData.status || 'active'} onChange={e => setFormData({...formData, status: e.target.value as DriverStatus})}>
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                    <option value="on_leave">Cuti</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>Batal</Button>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingDriver ? 'Simpan Perubahan' : 'Tambah Driver'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}