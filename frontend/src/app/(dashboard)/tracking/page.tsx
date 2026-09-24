'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, LocateFixed, MapPinOff, RefreshCw, Search } from 'lucide-react';
import ProtectedRoute from '@/components/layout/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import VehicleTrackingList from '@/components/tracking/vehicle-tracking-list';
import VehicleDetailPanel from '@/components/tracking/vehicle-detail-panel';
import { useTrackingList, useVehicleTracking } from '@/hooks/use-tracking';
import { VehicleStatus } from '@/types';
import { VEHICLE_STATUS_LABELS } from '@/utils/tracking';

// Leaflet butuh `window`, jadi peta hanya di-render di browser.
const TrackingMap = dynamic(() => import('@/components/tracking/tracking-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-100">
      <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
    </div>
  ),
});

const POLL_INTERVAL_MS = 5000;

function TrackingContent() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | ''>('');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fitSignal, setFitSignal] = useState(0);

  // Debounce pencarian agar tidak memanggil API di setiap ketikan
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { items, meta, loading, error, lastFetchedAt, refresh } = useTrackingList({
    search,
    status: statusFilter,
    onlineOnly,
    intervalMs: POLL_INTERVAL_MS,
  });

  const {
    detail,
    loading: detailLoading,
    error: detailError,
  } = useVehicleTracking(selectedId, { intervalMs: POLL_INTERVAL_MS });

  const selectedItem = useMemo(
    () => items.find((i) => i.vehicle_id === selectedId) ?? null,
    [items, selectedId]
  );

  // Pastikan detail milik kendaraan yang sedang dipilih (hook me-reset detail sesaat setelah pilihan berubah).
  const activeDetail = detail && detail.vehicle_id === selectedId ? detail : null;

  // Detail (lebih segar + punya riwayat) dipakai bila sudah ada; sebelum itu pakai data dari daftar.
  const panelItem = activeDetail ?? selectedItem;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Tracking</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pantau posisi armada secara berkala (diperbarui tiap {POLL_INTERVAL_MS / 1000} detik).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          {meta && (
            <span className="rounded-full bg-green-50 px-3 py-1 font-medium text-green-700">
              {meta.online} online / {meta.total} kendaraan
            </span>
          )}
          {lastFetchedAt && (
            <span className="text-xs text-gray-500">
              Diperbarui {lastFetchedAt.toLocaleTimeString('id-ID', { hour12: false })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFitSignal((n) => n + 1)}>
            <LocateFixed className="mr-2 h-4 w-4" /> Lihat semua
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Cari plat, kode kendaraan, atau nama driver..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | '')}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Semua Status</option>
          {(Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[]).map((status) => (
            <option key={status} value={status}>
              {VEHICLE_STATUS_LABELS[status]}
            </option>
          ))}
        </select>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={onlineOnly}
            onChange={(e) => setOnlineOnly(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          Hanya yang online
        </label>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refresh}>
            Coba lagi
          </Button>
        </div>
      )}

      {/* Konten utama */}
      {loading ? (
        <div className="flex h-96 items-center justify-center rounded-lg border bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          {/* Daftar kendaraan */}
          <div className="flex max-h-[420px] flex-col overflow-hidden rounded-lg border bg-white shadow-sm xl:h-[calc(100vh-19rem)] xl:max-h-none">
            <div className="border-b px-4 py-3 text-sm font-semibold text-gray-900">
              Kendaraan ({items.length})
            </div>
            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-500">
                <MapPinOff className="h-8 w-8 text-gray-300" />
                <p>
                  {search || statusFilter || onlineOnly
                    ? 'Tidak ada kendaraan yang cocok dengan filter.'
                    : 'Belum ada kendaraan yang mengirim lokasi.'}
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <VehicleTrackingList items={items} selectedId={selectedId} onSelect={setSelectedId} />
              </div>
            )}
          </div>

          {/* Peta */}
          <div className="order-first h-[55vh] min-h-[360px] rounded-lg border bg-white shadow-sm xl:order-none xl:h-[calc(100vh-19rem)]">
            <TrackingMap
              items={items}
              selectedId={selectedId}
              onSelect={setSelectedId}
              history={activeDetail?.history}
              fitSignal={fitSignal}
            />
          </div>

          {/* Detail kendaraan */}
          <div className="min-h-[200px] overflow-hidden rounded-lg border bg-white shadow-sm xl:h-[calc(100vh-19rem)]">
            <VehicleDetailPanel
              item={panelItem}
              loading={detailLoading}
              error={detailError}
              historyCount={activeDetail?.history.length}
              onClose={() => setSelectedId(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackingPage() {
  // Sama dengan hak akses backend (GET /api/tracking): driver tidak boleh melihat peta armada.
  return (
    <ProtectedRoute allowedRoles={['admin', 'dispatcher', 'manager']}>
      <TrackingContent />
    </ProtectedRoute>
  );
}