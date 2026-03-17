import { format, parse } from 'date-fns';

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  });
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return format(date, 'dd/MM/yyyy');
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return format(date, 'dd/MM/yyyy HH:mm');
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  try {
    const date = parse(timeStr, 'HH:mm', new Date());
    return format(date, 'h:mm a');
  } catch {
    return timeStr;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function calculateHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
  return Math.round((totalMinutes / 60) * 100) / 100;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    Active: 'bg-green-100 text-green-800',
    Inactive: 'bg-gray-100 text-gray-600',
    'On Hold': 'bg-amber-100 text-amber-800',
    Scheduled: 'bg-blue-100 text-blue-800',
    Confirmed: 'bg-indigo-100 text-indigo-800',
    'In Progress': 'bg-amber-100 text-amber-800',
    Completed: 'bg-green-100 text-green-800',
    Cancelled: 'bg-red-100 text-red-700',
    Draft: 'bg-gray-100 text-gray-600',
    Sent: 'bg-blue-100 text-blue-800',
    Paid: 'bg-green-100 text-green-800',
    Overdue: 'bg-red-100 text-red-700',
    Available: 'bg-green-100 text-green-800',
    Unavailable: 'bg-gray-100 text-gray-600',
    'On Leave': 'bg-amber-100 text-amber-800',
    'Not Started': 'bg-gray-100 text-gray-600',
    Achieved: 'bg-green-100 text-green-800',
    Archived: 'bg-gray-100 text-gray-400',
    Void: 'bg-red-50 text-red-400',
    Submitted: 'bg-blue-100 text-blue-800',
    Approved: 'bg-emerald-100 text-emerald-800',
    Rejected: 'bg-red-100 text-red-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

export function getServiceTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'Daily Living': 'bg-forest text-white',
    'Community Access': 'bg-sage text-white',
    'SIL': 'bg-burgundy text-white',
    'Transport': 'bg-amber-500 text-white',
    'Social/Rec': 'bg-blue-500 text-white',
    'Other': 'bg-amber-400 text-white',
  };
  return colors[type] || 'bg-gray-400 text-white';
}

export function getNextInvoiceNumber(invoices: { invoiceNumber: string }[]): string {
  const year = new Date().getFullYear();
  const existing = invoices
    .map(i => {
      const match = i.invoiceNumber.match(/T4B-(\d{4})-(\d+)/);
      if (match && parseInt(match[1]) === year) return parseInt(match[2]);
      return 0;
    })
    .filter(n => n > 0);
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `T4B-${year}-${String(next).padStart(3, '0')}`;
}
