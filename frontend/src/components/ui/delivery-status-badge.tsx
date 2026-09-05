import { cn } from '@/lib/utils';
import { DeliveryStatus, DeliveryPriority } from '@/types';

interface DeliveryStatusBadgeProps {
  status: DeliveryStatus;
}

export function DeliveryStatusBadge({ status }: DeliveryStatusBadgeProps) {
  const styles: Record<DeliveryStatus, string> = {
    pending: 'bg-gray-100 text-gray-800 border-gray-200',
    assigned: 'bg-blue-100 text-blue-800 border-blue-200',
    pickup: 'bg-purple-100 text-purple-800 border-purple-200',
    on_delivery: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    delivered: 'bg-green-100 text-green-800 border-green-200',
    failed: 'bg-red-100 text-red-800 border-red-200',
    cancelled: 'bg-gray-200 text-gray-600 border-gray-300',
  };

  const labels: Record<DeliveryStatus, string> = {
    pending: 'Menunggu',
    assigned: 'Ditugaskan',
    pickup: 'Pengambilan',
    on_delivery: 'Dalam Pengiriman',
    delivered: 'Terkirim',
    failed: 'Gagal',
    cancelled: 'Dibatalkan',
  };

  return (
    <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium border', styles[status])}>
      {labels[status]}
    </span>
  );
}

interface DeliveryPriorityBadgeProps {
  priority: DeliveryPriority;
}

export function DeliveryPriorityBadge({ priority }: DeliveryPriorityBadgeProps) {
  const styles: Record<DeliveryPriority, string> = {
    low: 'bg-gray-100 text-gray-600 border-gray-200',
    normal: 'bg-blue-50 text-blue-700 border-blue-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    urgent: 'bg-red-100 text-red-800 border-red-200',
  };

  const labels: Record<DeliveryPriority, string> = {
    low: 'Rendah',
    normal: 'Normal',
    high: 'Tinggi',
    urgent: 'Mendesak',
  };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium border', styles[priority])}>
      {labels[priority]}
    </span>
  );
}