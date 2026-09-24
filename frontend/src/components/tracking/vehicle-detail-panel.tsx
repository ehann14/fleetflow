'use client';

import Link from 'next/link';
import { ExternalLink, Loader2, MapPin, Navigation, Phone, User, X } from 'lucide-react';
import { TrackingItem } from '@/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { DeliveryStatusBadge } from '@/components/ui/delivery-status-badge';
import { cn } from '@/lib/utils';
import {
  formatCoordinate,
  formatDateTime,
  formatSecondsAgo,
  formatSpeed,
} from '@/utils/tracking';

interface VehicleDetailPanelProps {
  item: TrackingItem | null;
  loading?: boolean;
  error?: string | null;
  historyCount?: number;
  onClose: () => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="shrink-0 text-gray-500">{label}</dt>
      <dd className="text-right font-medium text-gray-900">{children}</dd>
    </div>
  );
}

export default function VehicleDetailPanel({
  item,
  loading = false,
  error = null,
  historyCount,
  onClose,
}: VehicleDetailPanelProps) {
  if (!item) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-gray-500">
        <Navigation className="h-8 w-8 text-gray-300" />
        <p>Pilih kendaraan di daftar atau di peta untuk melihat detailnya.</p>
      </div>
    );
  }

  const hasLocation = item.latitude !== null && item.longitude !== null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b p-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{item.plate_number}</h3>
          <p className="text-xs text-gray-500">
            {item.vehicle_code} · {item.brand} {item.model}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Tutup detail"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
        )}

        <div className="mb-2 flex items-center gap-2">
          <StatusBadge status={item.vehicle_status} />
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
              item.is_online
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-gray-200 bg-gray-100 text-gray-600'
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', item.is_online ? 'bg-green-500' : 'bg-gray-400')} />
            {item.is_online ? 'Online' : 'Offline'}
          </span>
        </div>

        <dl className="divide-y">
          <Row label="Driver">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-gray-400" />
              {item.driver_name ?? '-'}
            </span>
          </Row>
          {item.driver_phone && (
            <Row label="Telepon">
              <a
                href={`tel:${item.driver_phone}`}
                className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
              >
                <Phone className="h-3.5 w-3.5" />
                {item.driver_phone}
              </a>
            </Row>
          )}
          <Row label="Kendaraan">
            {item.brand} {item.model}
          </Row>
          <Row label="Plat">{item.plate_number}</Row>
          <Row label="Latitude">{formatCoordinate(item.latitude)}</Row>
          <Row label="Longitude">{formatCoordinate(item.longitude)}</Row>
          <Row label="Kecepatan">{formatSpeed(item.speed)}</Row>
          <Row label="Update terakhir">
            <span className="block">{formatSecondsAgo(item.seconds_since_update)}</span>
            <span className="block text-xs font-normal text-gray-500">{formatDateTime(item.timestamp)}</span>
          </Row>
          {typeof historyCount === 'number' && <Row label="Titik riwayat">{historyCount}</Row>}
        </dl>

        {hasLocation && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=17/${item.latitude}/${item.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Buka di OpenStreetMap
          </a>
        )}

        <div className="mt-5 rounded-lg border bg-gray-50 p-3">
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            <MapPin className="h-4 w-4 text-gray-500" />
            Tujuan
          </h4>

          {item.delivery ? (
            <div className="space-y-2 text-sm">
              <p className="text-gray-800">{item.delivery.destination_address}</p>
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/deliveries/${item.delivery.id}`}
                  className="font-medium text-blue-600 hover:underline"
                >
                  {item.delivery.order_number}
                </Link>
                <DeliveryStatusBadge status={item.delivery.status} />
              </div>
              <p className="text-xs text-gray-500">Pelanggan: {item.delivery.customer_name}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Tidak ada pengiriman aktif.</p>
          )}
        </div>
      </div>
    </div>
  );
}