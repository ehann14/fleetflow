// src/app/(dashboard)/deliveries/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';
import { Delivery } from '@/types';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await apiService.getDeliveries(1, '', '', '');
        
        if (response && Array.isArray(response.data)) {
          setDeliveries(response.data);
          setError(null);
        } else {
          throw new Error('Format response tidak valid');
        }
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || 'Gagal memuat data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Helper untuk warna badge status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'on_delivery': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'failed': 
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
        <h3 className="font-bold">Terjadi Kesalahan</h3>
        <p className="mt-2 text-sm">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Pengiriman</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola semua order pengiriman barang</p>
        </div>
        <div className="text-sm font-medium text-gray-600 bg-white px-4 py-2 rounded-lg border shadow-sm">
          Total: {deliveries.length} Data
        </div>
      </div>

      {/* Tabel Data */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700 font-semibold">
              <tr>
                <th className="px-6 py-4">Order No</th>
                <th className="px-6 py-4">Pelanggan</th>
                <th className="px-6 py-4">Tujuan</th>
                <th className="px-6 py-4">Prioritas</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                    Belum ada data pengiriman ditemukan.
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {d.order_number}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{d.customer_name}</div>
                      <div className="text-xs text-gray-400">{d.customer_phone}</div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate" title={d.destination_address}>
                      {d.destination_address}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                        d.priority === 'high' || d.priority === 'urgent' 
                          ? 'bg-orange-50 text-orange-700 border-orange-200' 
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {d.priority ? d.priority.toUpperCase() : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(d.status)}`}>
                        {formatStatus(d.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(d.delivery_date).toLocaleDateString('id-ID', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}