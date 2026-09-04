import { cn } from '@/lib/utils';
import { DriverStatus } from '@/types';

interface DriverStatusBadgeProps {
  status: DriverStatus;
}

export function DriverStatusBadge({ status }: DriverStatusBadgeProps) {
  const styles = {
    active: 'bg-green-100 text-green-800 border-green-200',
    inactive: 'bg-gray-100 text-gray-800 border-gray-200',
    on_leave: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  const labels = {
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    on_leave: 'Cuti',
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', styles[status])}>
      {labels[status]}
    </span>
  );
}