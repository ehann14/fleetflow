'use client';

import { TrackingItem } from '@/types';
import { cn } from '@/lib/utils';
import { formatSecondsAgo, formatSpeed } from '@/utils/tracking';

interface VehicleTrackingListProps {
  items: TrackingItem[];
  selectedId: number | null;
  onSelect: (vehicleId: number) => void;
}

export default function VehicleTrackingList({ items, selectedId, onSelect }: VehicleTrackingListProps) {
  return (
    <ul className="divide-y">
      {items.map((item) => {
        const selected = item.vehicle_id === selectedId;

        return (
          <li key={item.vehicle_id}>
            <button
              type="button"
              onClick={() => onSelect(item.vehicle_id)}
              className={cn(
                'w-full px-4 py-3 text-left transition-colors hover:bg-gray-50',
                selected && 'bg-blue-50 hover:bg-blue-50'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">{item.plate_number}</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 text-xs font-medium',
                    item.is_online ? 'text-green-700' : 'text-gray-500'
                  )}
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      item.is_online ? 'bg-green-500' : 'bg-gray-400'
                    )}
                  />
                  {item.is_online ? 'Online' : 'Offline'}
                </span>
              </div>

              <p className="mt-0.5 text-xs text-gray-500">
                {item.vehicle_code} · {item.brand} {item.model}
              </p>
              <p className="mt-1 text-sm text-gray-700">{item.driver_name ?? 'Tanpa driver'}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {formatSpeed(item.speed)} · {formatSecondsAgo(item.seconds_since_update)}
              </p>
            </button>
          </li>
        );
      })}
    </ul>
  );
}