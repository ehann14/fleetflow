'use client';

import { useEffect, useState } from 'react';
// Pastikan path import ini benar sesuai struktur folder project Anda
import { apiService } from '@/services/api'; 
import { Delivery, PaginatedResponse } from '@/types';

export default function DeliveriesPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Flag untuk mencegah update state jika komponen sudah unmount
    let isMounted = true;

    console.log('>>> [DELIVERIES PAGE] Komponen dimounting & useEffect berjalan...');

    const fetchData = async () => {
      try {
        console.log('>>> [DELIVERIES PAGE] Memulai request ke API /deliveries...');
        
        // Panggil service API
        // Pastikan parameter sesuai dengan definisi di api.ts
        const response: PaginatedResponse<Delivery> = await apiService.getDeliveries(1, '', '', '');
        
        console.log('>>> [DELIVERIES PAGE] Response mentah dari API:', response);

        if (isMounted) {
          // Validasi struktur response
          if (response && Array.isArray(response.data)) {
            setDeliveries(response.data);
            setError(null);
            console.log(`>>> [DELIVERIES PAGE] Berhasil memuat ${response.data.length} data.`);
          } else {
            throw new Error('Format data dari server tidak valid (bukan array)');
          }
        }
      } catch (err: any) {
        console.error('>>> [DELIVERIES PAGE] TERJADI ERROR SAAT FETCH:', err);
        
        if (isMounted) {
          // Ambil pesan error yang paling relevan
          const msg = err.response?.data?.message || err.message || 'Gagal terhubung ke server backend';
          setError(msg);
        }
      } finally {
        if (isMounted) {
          console.log('>>> [DELIVERIES PAGE] Proses selesai, mematikan spinner loading.');
          setLoading(false); // PENTING: Ini yang menghentikan spinner muter
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array = hanya jalan sekali saat mount

  // --- RENDER STATES ---

  // 1. State Loading
  if (loading) {
    return (
      <div className="flex h-[60vh] w-full flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"></div>
        <p className="text-sm text-gray-500">Memuat data pengiriman...</p>
      </div>
    );
  }

  // 2. State Error
  if (error) {
    return (
      <div className="m-6 rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 shadow-sm">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>⚠️ Gagal Memuat Data</span>
        </h3>
        <p className="mt-2 text-sm font-mono bg-red-100 p-2 rounded">{error}</p>
        <div className="mt-4 flex gap-2">
          <button 
            onClick={() => window.location.reload()}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
          >
            Coba Lagi (Reload)
          </button>
          <a 
            href="/dashboard"
            className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 transition-colors"
          >
            Kembali ke Dashboard
          </a>
        </div>
      </div>
    );
  }

  // 3. State Sukses (Tabel Data)
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daftar Pengiriman</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola semua order pengiriman barang</p>
        </div>
        {/* Tombol Add Delivery bisa ditaruh di sini */}
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-700">
              <tr>
                <th className="px-6 py-4 font-semibold">Order No</th>
                <th className="px-6 py-4 font-semibold">Pelanggan</th>
                <th className="px-6 py-4 font-semibold">Tujuan</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Tanggal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deliveries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-2xl">📦</span>
                      Belum ada data pengiriman ditemukan.
                    </div>
                  </td>
                </tr>
              ) : (
                deliveries.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{d.order_number}</td>
                    <td className="px-6 py-4">{d.customer_name}</td>
                    <td className="px-6 py-4 truncate max-w-xs" title={d.destination_address}>
                      {d.destination_address}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        d.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        d.status === 'on_delivery' ? 'bg-blue-100 text-blue-800' :
                        d.status === 'failed' || d.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {d.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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