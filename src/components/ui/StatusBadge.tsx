import { getStatusColor } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`badge ${getStatusColor(status)} ${className}`}>
      {status}
    </span>
  );
}
