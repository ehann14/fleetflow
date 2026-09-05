'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiService } from '@/services/api';
import { Delivery, DeliveryStatus, DeliveryPriority } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeliveryStatusBadge, DeliveryPriorityBadge } from '@/components/ui/delivery-status-badge';
import { Plus, Search, Eye, Loader2, Package } from 'lucide-react';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<DeliveryPriority | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await apiService.getDeliveries(currentPage, search, statusFilter, priorityFilter);
      setDeliveries(response.data);
      setTotalPages(response.meta.last_page);
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, search, statusFilter, priorityFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Delivery Order</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola pesanan pengiriman, status, dan penugasan driver/kendaraan.</p>
        </div>
        <Link href="/deliveries/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Buat Delivery
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Cari no. order atau nama pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DeliveryStatus | '')}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Status</option>
          <option value="pending">Menunggu</option>
          <option value="assigned">Ditugaskan</option>
          <option value="pickup">Pengambilan</option>
          <option value="on_delivery">Dalam Pengiriman</option>
          <option value="delivered">Terkirim</option>
          <option value="failed">Gagal</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as DeliveryPriority | '')}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Prioritas</option>
          <option value="low">Rendah</option>
          <option value="normal">Normal</option>
          <option value="high">Tinggi</option>
          <option value="urgent">Mendesak</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-6 py-4">No. Order / Pelanggan</th>
                <th className="px-6 py-4">Tujuan</th>
                <th className="px-6 py-4">Tgl Kirim</th>
                <th className="px-6 py-4">Driver / Kendaraan</th>
                <th className="px-6 py-4">Prioritas</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Memuat data...
                  </td>
                </tr>
              ) : deliveries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Tidak ada delivery order ditemukan.
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{d.order_number}</div>
                      <div className="text-gray-500">{d.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="truncate">{d.destination_address}</div>
                    </td>
                    <td className="px-6 py-4">{d.delivery_date}</td>
                    <td className="px-6 py-4">
                      <div>{d.driver_name || <span className="text-gray-400">Belum ditugaskan</span>}</div>
                      <div className="text-gray-500">{d.plate_number || '-'}</div>
                    </td>
                    <td className="px-6 py-4"><DeliveryPriorityBadge priority={d.priority} /></td>
                    <td className="px-6 py-4"><DeliveryStatusBadge status={d.status} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/deliveries/${d.id}`}>
                          <Button variant="outline" size="sm"><Eye className="w-4 h-4" /></Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && deliveries.length > 0 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <span className="text-sm text-gray-500">Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}>Sebelumnya</Button>
              <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}>Selanjutnya</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}