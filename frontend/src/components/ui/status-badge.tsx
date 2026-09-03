import { cn } from '@/lib/utils';
import { VehicleStatus } from '@/types';

interface StatusBadgeProps {
  status: VehicleStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    available: 'bg-green-100 text-green-800 border-green-200',
    assigned: 'bg-blue-100 text-blue-800 border-blue-200',
    on_delivery: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    maintenance: 'bg-red-100 text-red-800 border-red-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  const labels = {
    available: 'Tersedia',
    assigned: 'Ditugaskan',
    on_delivery: 'Dalam Pengiriman',
    maintenance: 'Perawatan',
    inactive: 'Tidak Aktif',
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', styles[status])}>
      {labels[status]}
    </span>
  );
}