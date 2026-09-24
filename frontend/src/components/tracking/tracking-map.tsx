'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import { divIcon, latLngBounds, type DivIcon } from 'leaflet';
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from 'react-leaflet';
import { TrackingHistoryPoint, TrackingItem } from '@/types';
import { OFFLINE_COLOR, VEHICLE_STATUS_COLORS, VEHICLE_STATUS_LABELS } from '@/utils/tracking';

// Bandung (data awal proyek). Hanya dipakai sebelum ada marker.
const DEFAULT_CENTER: [number, number] = [-6.9175, 107.6191];
const DEFAULT_ZOOM = 12;

const TRUCK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" ' +
  'stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
  '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/>' +
  '<path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>' +
  '<circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>';

// Cache icon agar tidak dibuat ulang di setiap polling.
const iconCache = new Map<string, DivIcon>();

function getIcon(color: string, selected: boolean, online: boolean): DivIcon {
  const key = `${color}-${selected}-${online}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const size = selected ? 40 : 32;
  const ring = selected ? '0 0 0 4px rgba(37,99,235,0.35), ' : '';
  const icon = divIcon({
    className: 'fleetflow-marker',
    html:
      `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};` +
      `border:3px solid #fff;box-shadow:${ring}0 2px 6px rgba(0,0,0,0.4);` +
      `display:flex;align-items:center;justify-content:center;opacity:${online ? 1 : 0.7};">` +
      `${TRUCK_SVG}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

  iconCache.set(key, icon);
  return icon;
}

interface MapControllerProps {
  items: TrackingItem[];
  selectedId: number | null;
  fitSignal: number;
}

/**
 * Mengatur kamera peta:
 * - fit ke semua marker saat data pertama kali datang
 * - fit ulang saat `fitSignal` berubah (tombol "Lihat semua")
 * - terbang ke kendaraan yang dipilih (hanya saat pilihan berubah, bukan tiap polling,
 *   agar peta tidak "melawan" user yang sedang menggeser peta)
 */
function MapController({ items, selectedId, fitSignal }: MapControllerProps) {
  const map = useMap();
  const hasFitted = useRef(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const fitAll = () => {
    const points = itemsRef.current
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => [i.latitude as number, i.longitude as number] as [number, number]);

    if (points.length === 0) return false;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(latLngBounds(points), { padding: [60, 60], maxZoom: 15 });
    }
    return true;
  };

  // Fit pertama kali data tersedia
  useEffect(() => {
    if (hasFitted.current) return;
    if (fitAll()) hasFitted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Fit ulang atas permintaan user
  useEffect(() => {
    if (fitSignal === 0) return;
    fitAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitSignal]);

  // Fokus ke kendaraan terpilih
  useEffect(() => {
    if (selectedId === null) return;
    const target = itemsRef.current.find((i) => i.vehicle_id === selectedId);
    if (!target || target.latitude === null || target.longitude === null) return;
    map.flyTo([target.latitude, target.longitude], Math.max(map.getZoom(), 14), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return null;
}

interface TrackingMapProps {
  items: TrackingItem[];
  selectedId: number | null;
  onSelect: (vehicleId: number) => void;
  /** Jejak perjalanan kendaraan terpilih (urut lama -> baru). */
  history?: TrackingHistoryPoint[];
  fitSignal?: number;
}

export default function TrackingMap({
  items,
  selectedId,
  onSelect,
  history = [],
  fitSignal = 0,
}: TrackingMapProps) {
  const path = history.map((p) => [p.latitude, p.longitude] as [number, number]);

  return (
    <div className="relative isolate h-full w-full overflow-hidden rounded-lg">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        <MapController items={items} selectedId={selectedId} fitSignal={fitSignal} />

        {path.length > 1 && (
          <Polyline positions={path} pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.7 }} />
        )}

        {items.map((item) => {
          if (item.latitude === null || item.longitude === null) return null;

          const selected = item.vehicle_id === selectedId;
          const color = item.is_online ? VEHICLE_STATUS_COLORS[item.vehicle_status] : OFFLINE_COLOR;

          return (
            <Marker
              key={item.vehicle_id}
              position={[item.latitude, item.longitude]}
              icon={getIcon(color, selected, item.is_online)}
              zIndexOffset={selected ? 1000 : 0}
              eventHandlers={{ click: () => onSelect(item.vehicle_id) }}
            >
              <Tooltip direction="top" offset={[0, -16]}>
                <strong>{item.plate_number}</strong>
                <br />
                {item.is_online ? VEHICLE_STATUS_LABELS[item.vehicle_status] : 'Offline'}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Legenda */}
      <div className="absolute bottom-3 left-3 z-[1000] rounded-md bg-white/95 px-3 py-2 text-xs shadow">
        <ul className="space-y-1">
          {(Object.keys(VEHICLE_STATUS_COLORS) as (keyof typeof VEHICLE_STATUS_COLORS)[]).map((status) => (
            <li key={status} className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: VEHICLE_STATUS_COLORS[status] }} />
              {VEHICLE_STATUS_LABELS[status]}
            </li>
          ))}
          <li className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: OFFLINE_COLOR }} />
            Offline (&gt; 5 menit)
          </li>
        </ul>
      </div>
    </div>
  );
}