import { useState, useMemo, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  addDays,
  isWithinInterval,
  isSameDay,
} from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import type { Shift } from '@/types';
import {
  cn,
  formatCurrency,
  formatTime,
  generateId,
  calculateHours,
  getServiceTypeColor,
} from '@/lib/utils';
import SlideOver from '@/components/ui/SlideOver';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StatusBadge from '@/components/ui/StatusBadge';

// ── Constants ──────────────────────────────────────────────

const SERVICE_TYPES = [
  'Daily Living',
  'Community Access',
  'SIL',
  'Transport',
  'Social/Rec',
  'Other',
] as const;

type ServiceType = (typeof SERVICE_TYPES)[number];

const SHIFT_STATUSES = [
  'Scheduled',
  'Confirmed',
  'In Progress',
  'Completed',
  'Cancelled',
] as const;

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SERVICE_TYPE_CATEGORY_MAP: Record<ServiceType, string> = {
  'Daily Living': '01 - Daily Activities',
  'Community Access': '04 - Assistance with Social',
  SIL: '03 - SIL',
  Transport: '04 - Assistance with Social',
  'Social/Rec': '04 - Assistance with Social',
  Other: '01 - Daily Activities',
};

const SERVICE_TYPE_LINE_ITEM_MAP: Record<ServiceType, string> = {
  'Daily Living': '01_002_0107_1_1',
  'Community Access': '04_104_0125_6_1',
  SIL: '03_001_0104_1_1',
  Transport: '04_590_0125_6_1',
  'Social/Rec': '04_102_0125_6_1',
  Other: '01_002_0107_1_1',
};

const SERVICE_TYPE_ABBREVIATIONS: Record<ServiceType, string> = {
  'Daily Living': 'DL',
  'Community Access': 'CA',
  SIL: 'SIL',
  Transport: 'TR',
  'Social/Rec': 'S/R',
  Other: 'OTH',
};

const SERVICE_TYPE_BLOCK_COLORS: Record<ServiceType, string> = {
  'Daily Living': 'bg-forest text-white border-forest',
  'Community Access': 'bg-sage text-white border-sage',
  SIL: 'bg-burgundy text-white border-burgundy',
  Transport: 'bg-amber-500 text-white border-amber-500',
  'Social/Rec': 'bg-blue-500 text-white border-blue-500',
  Other: 'bg-amber-400 text-white border-amber-400',
};

// Time slots from 06:00 to 22:00 in 30-min intervals
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 6; h <= 21; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  slots.push('22:00');
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function formatSlotLabel(slot: string): string {
  const [hStr, mStr] = slot.split(':');
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr}${suffix}`;
}

function timeToSlotIndex(time: string): number {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const totalMinutes = (h - 6) * 60 + m;
  return Math.max(0, Math.floor(totalMinutes / 30));
}

function slotSpan(startTime: string, endTime: string): number {
  const startIdx = timeToSlotIndex(startTime);
  const endIdx = timeToSlotIndex(endTime);
  return Math.max(1, endIdx - startIdx);
}

// ── Shift Form Schema ──────────────────────────────────────

const shiftSchema = z
  .object({
    clientId: z.string().min(1, 'Client is required'),
    carerId: z.string().min(1, 'Carer is required'),
    date: z.string().min(1, 'Date is required'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    serviceType: z.enum(SERVICE_TYPES, { required_error: 'Service type is required' }),
    supportCategory: z.string().min(1, 'Support category is required'),
    ndisLineItemCode: z.string().min(1, 'Line item code is required'),
    hourlyRate: z.coerce.number().min(0, 'Rate must be positive'),
    notes: z.string(),
    status: z.enum(SHIFT_STATUSES),
    convertToInvoice: z.boolean(),
  })
  .refine(
    (data) => {
      if (!data.startTime || !data.endTime) return true;
      return data.startTime < data.endTime;
    },
    { message: 'End time must be after start time', path: ['endTime'] }
  );

type ShiftFormData = z.infer<typeof shiftSchema>;

// ── Component ──────────────────────────────────────────────

export default function WeeklyRoster() {
  const {
    shifts,
    clients,
    carers,
    addShift,
    updateShift,
    deleteShift,
    getClientById,
    getCarerById,
  } = useStore();

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const { session } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sendingAllReminders, setSendingAllReminders] = useState(false);

  // Filters
  const [filterCarerId, setFilterCarerId] = useState('');
  const [filterClientId, setFilterClientId] = useState('');

  const activeClients = useMemo(
    () => clients.filter((c) => c.status === 'Active'),
    [clients]
  );
  const activeCarers = useMemo(
    () => carers.filter((c) => c.status === 'Active'),
    [carers]
  );

  const weekEnd = useMemo(
    () => endOfWeek(currentWeekStart, { weekStartsOn: 1 }),
    [currentWeekStart]
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const weekLabel = useMemo(() => {
    return `${format(currentWeekStart, 'd MMM')} \u2013 ${format(weekEnd, 'd MMM yyyy')}`;
  }, [currentWeekStart, weekEnd]);

  // Filter shifts for the current week
  const weekShifts = useMemo(() => {
    return shifts.filter((s) => {
      const d = parseISO(s.date);
      if (!isWithinInterval(d, { start: currentWeekStart, end: weekEnd })) return false;
      if (filterCarerId && s.carerId !== filterCarerId) return false;
      if (filterClientId && s.clientId !== filterClientId) return false;
      return true;
    });
  }, [shifts, currentWeekStart, weekEnd, filterCarerId, filterClientId]);

  // Group shifts by day index (0=Mon ... 6=Sun)
  const shiftsByDay = useMemo(() => {
    const grouped: Record<number, Shift[]> = {};
    for (let i = 0; i < 7; i++) grouped[i] = [];
    weekShifts.forEach((s) => {
      const d = parseISO(s.date);
      for (let i = 0; i < 7; i++) {
        if (isSameDay(d, weekDays[i])) {
          grouped[i].push(s);
          break;
        }
      }
    });
    return grouped;
  }, [weekShifts, weekDays]);

  // Navigation
  const goToday = useCallback(() => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentWeekStart((prev) => subWeeks(prev, 1));
  }, []);

  const goNext = useCallback(() => {
    setCurrentWeekStart((prev) => addWeeks(prev, 1));
  }, []);

  // Drawer
  const openNewShift = useCallback(() => {
    setEditingShift(null);
    setDrawerOpen(true);
  }, []);

  const openEditShift = useCallback((shift: Shift) => {
    setEditingShift(shift);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingShift(null);
  }, []);

  // Send reminders for all shifts in the visible week
  const handleSendAllReminders = useCallback(async () => {
    if (weekShifts.length === 0) {
      toast.error('No shifts in the current week to send reminders for');
      return;
    }

    const token = session?.access_token;
    if (!token) {
      toast.error('You must be logged in to send reminders');
      return;
    }

    setSendingAllReminders(true);
    try {
      const res = await fetch('/api/send-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shiftIds: weekShifts.map((s) => s.id),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reminders');
      }

      if (data.simulated > 0) {
        toast.success(`${data.simulated} reminder(s) queued (Twilio not configured yet)`);
      } else {
        toast.success(data.message || `Sent ${data.sent} reminder(s)`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reminders');
    } finally {
      setSendingAllReminders(false);
    }
  }, [weekShifts, session]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Weekly Roster</h1>
          <p className="text-sm text-mid-gray mt-1">
            Manage shifts and schedules for participants and carers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendAllReminders}
            disabled={sendingAllReminders || weekShifts.length === 0}
            className="btn-secondary flex items-center gap-2"
          >
            {sendingAllReminders ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
            Send All Reminders ({weekShifts.length})
          </button>
          <button onClick={openNewShift} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Add Shift
          </button>
        </div>
      </div>

      {/* Filter Bar + Week Navigation */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Week Nav */}
          <div className="flex items-center gap-2">
            <button onClick={goPrev} className="btn-ghost p-2">
              <ChevronLeft size={18} />
            </button>
            <button onClick={goToday} className="btn-secondary text-sm">
              Today
            </button>
            <button onClick={goNext} className="btn-ghost p-2">
              <ChevronRight size={18} />
            </button>
            <span className="ml-2 text-sm font-semibold text-charcoal flex items-center gap-2">
              <Calendar size={16} className="text-sage" />
              {weekLabel}
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <select
              value={filterCarerId}
              onChange={(e) => setFilterCarerId(e.target.value)}
              className="input-field text-sm py-1.5"
            >
              <option value="">All Carers</option>
              {carers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
            <select
              value={filterClientId}
              onChange={(e) => setFilterClientId(e.target.value)}
              className="input-field text-sm py-1.5"
            >
              <option value="">All Clients</option>
              {activeClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Day headers */}
            <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-sage-pale">
              <div className="p-3 text-xs font-medium text-mid-gray">Time</div>
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={i}
                    className={cn(
                      'p-3 text-center border-l border-sage-pale',
                      isToday && 'bg-sage-pale/50'
                    )}
                  >
                    <div className="text-xs font-medium text-mid-gray">{DAYS_OF_WEEK[i]}</div>
                    <div
                      className={cn(
                        'text-sm font-semibold mt-0.5',
                        isToday ? 'text-forest' : 'text-charcoal'
                      )}
                    >
                      {format(day, 'd MMM')}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Time rows */}
            <div className="relative">
              {TIME_SLOTS.map((slot, slotIdx) => (
                <div
                  key={slot}
                  className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-sage-pale/50"
                  style={{ height: '36px' }}
                >
                  <div className="px-3 flex items-center">
                    {slotIdx % 2 === 0 && (
                      <span className="text-[11px] text-mid-gray">
                        {formatSlotLabel(slot)}
                      </span>
                    )}
                  </div>
                  {weekDays.map((day, dayIdx) => {
                    const isCurrentDay = isSameDay(day, new Date());
                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          'border-l border-sage-pale/50 relative',
                          isCurrentDay && 'bg-sage-pale/20'
                        )}
                      />
                    );
                  })}
                </div>
              ))}

              {/* Shift blocks overlay */}
              {weekDays.map((_, dayIdx) =>
                shiftsByDay[dayIdx].map((shift) => {
                  const topIdx = timeToSlotIndex(shift.startTime);
                  const span = slotSpan(shift.startTime, shift.endTime);
                  const client = getClientById(shift.clientId);
                  const carer = getCarerById(shift.carerId);
                  const carerInitials = carer
                    ? `${carer.firstName[0]}${carer.lastName[0]}`
                    : '??';
                  const clientName = client
                    ? `${client.firstName} ${client.lastName[0]}.`
                    : 'Unknown';
                  const abbr =
                    SERVICE_TYPE_ABBREVIATIONS[shift.serviceType as ServiceType] || 'OTH';
                  const colorClass =
                    SERVICE_TYPE_BLOCK_COLORS[shift.serviceType as ServiceType] ||
                    'bg-gray-400 text-white border-gray-400';

                  // Calculate position: 80px for time col, then evenly divided 7 cols
                  const top = topIdx * 36;
                  const height = span * 36;

                  return (
                    <div
                      key={shift.id}
                      className={cn(
                        'absolute rounded-md px-1.5 py-1 cursor-pointer shadow-sm hover:shadow-md transition-shadow overflow-hidden border-l-[3px]',
                        colorClass
                      )}
                      style={{
                        top: `${top}px`,
                        height: `${height - 2}px`,
                        left: `calc(80px + ${dayIdx} * ((100% - 80px) / 7) + 2px)`,
                        width: `calc((100% - 80px) / 7 - 4px)`,
                      }}
                      onClick={() => openEditShift(shift)}
                      title={`${clientName} - ${carer?.firstName ?? 'Unassigned'} ${carer?.lastName ?? ''} (${formatTime(shift.startTime)} - ${formatTime(shift.endTime)})`}
                    >
                      <div className="text-[11px] font-semibold leading-tight truncate">
                        {clientName}
                      </div>
                      {height > 40 && (
                        <div className="text-[10px] opacity-90 leading-tight truncate">
                          {carerInitials} &middot; {abbr}
                        </div>
                      )}
                      {height > 60 && (
                        <div className="text-[10px] opacity-75 leading-tight">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Shift Drawer */}
      <SlideOver
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingShift ? 'Edit Shift' : 'New Shift'}
        wide
      >
        <ShiftForm
          shift={editingShift}
          clients={activeClients}
          carers={activeCarers}
          onSave={(data) => {
            if (editingShift) {
              updateShift(editingShift.id, data);
              toast.success('Shift updated');
            } else {
              addShift(data);
              toast.success('Shift created');
            }
            closeDrawer();
          }}
          onDelete={
            editingShift
              ? () => setDeleteModalOpen(true)
              : undefined
          }
          onCancel={closeDrawer}
        />
      </SlideOver>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          if (editingShift) {
            deleteShift(editingShift.id);
            toast.success('Shift deleted');
            setDeleteModalOpen(false);
            closeDrawer();
          }
        }}
        title="Delete Shift"
        message="Are you sure you want to delete this shift? This action cannot be undone."
      />
    </div>
  );
}

// ── Shift Form Sub-Component ───────────────────────────────

interface ShiftFormProps {
  shift: Shift | null;
  clients: { id: string; firstName: string; lastName: string }[];
  carers: { id: string; firstName: string; lastName: string }[];
  onSave: (data: Omit<Shift, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function ShiftForm({ shift, clients, carers, onSave, onDelete, onCancel }: ShiftFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: shift
      ? {
          clientId: shift.clientId,
          carerId: shift.carerId,
          date: shift.date,
          startTime: shift.startTime,
          endTime: shift.endTime,
          serviceType: shift.serviceType,
          supportCategory: shift.supportCategory,
          ndisLineItemCode: shift.ndisLineItemCode,
          hourlyRate: shift.hourlyRate,
          notes: shift.notes,
          status: shift.status,
          convertToInvoice: shift.convertToInvoice,
        }
      : {
          clientId: '',
          carerId: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          startTime: '09:00',
          endTime: '12:00',
          serviceType: 'Daily Living',
          supportCategory: SERVICE_TYPE_CATEGORY_MAP['Daily Living'],
          ndisLineItemCode: SERVICE_TYPE_LINE_ITEM_MAP['Daily Living'],
          hourlyRate: 65.47,
          notes: '',
          status: 'Scheduled',
          convertToInvoice: false,
        },
  });

  const startTime = watch('startTime');
  const endTime = watch('endTime');
  const hourlyRate = watch('hourlyRate');
  const serviceType = watch('serviceType');

  const hours = useMemo(() => {
    if (!startTime || !endTime || startTime >= endTime) return 0;
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  const totalAmount = useMemo(() => {
    return Math.round(hours * (hourlyRate || 0) * 100) / 100;
  }, [hours, hourlyRate]);

  // Auto-map service type to category and line item code
  const handleServiceTypeChange = useCallback(
    (type: ServiceType) => {
      setValue('serviceType', type);
      setValue('supportCategory', SERVICE_TYPE_CATEGORY_MAP[type]);
      setValue('ndisLineItemCode', SERVICE_TYPE_LINE_ITEM_MAP[type]);
    },
    [setValue]
  );

  const onSubmit = (data: ShiftFormData) => {
    const h = calculateHours(data.startTime, data.endTime);
    const total = Math.round(h * data.hourlyRate * 100) / 100;
    onSave({
      clientId: data.clientId,
      carerId: data.carerId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      serviceType: data.serviceType,
      supportCategory: data.supportCategory,
      ndisLineItemCode: data.ndisLineItemCode,
      hourlyRate: data.hourlyRate,
      totalAmount: total,
      hours: h,
      notes: data.notes,
      status: data.status,
      convertToInvoice: data.convertToInvoice,
    });
  };

  const markCompleted = useCallback(() => {
    setValue('status', 'Completed');
  }, [setValue]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Client */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Participant</label>
        <select {...register('clientId')} className="input-field">
          <option value="">Select participant...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
        {errors.clientId && (
          <p className="text-sm text-red-600 mt-1">{errors.clientId.message}</p>
        )}
      </div>

      {/* Carer */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Carer</label>
        <select {...register('carerId')} className="input-field">
          <option value="">Select carer...</option>
          {carers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.firstName} {c.lastName}
            </option>
          ))}
        </select>
        {errors.carerId && (
          <p className="text-sm text-red-600 mt-1">{errors.carerId.message}</p>
        )}
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Date</label>
          <input type="date" {...register('date')} className="input-field" />
          {errors.date && (
            <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Start Time</label>
          <input type="time" {...register('startTime')} className="input-field" />
          {errors.startTime && (
            <p className="text-sm text-red-600 mt-1">{errors.startTime.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">End Time</label>
          <input type="time" {...register('endTime')} className="input-field" />
          {errors.endTime && (
            <p className="text-sm text-red-600 mt-1">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      {/* Duration display */}
      {hours > 0 && (
        <div className="flex items-center gap-2 text-sm text-sage">
          <Clock size={14} />
          <span>Duration: {hours} hour{hours !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Service Type */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Service Type</label>
        <Controller
          name="serviceType"
          control={control}
          render={({ field }) => (
            <select
              className="input-field"
              value={field.value}
              onChange={(e) => handleServiceTypeChange(e.target.value as ServiceType)}
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          )}
        />
        {errors.serviceType && (
          <p className="text-sm text-red-600 mt-1">{errors.serviceType.message}</p>
        )}
      </div>

      {/* Support Category */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">
          NDIS Support Category
        </label>
        <input {...register('supportCategory')} className="input-field" />
        {errors.supportCategory && (
          <p className="text-sm text-red-600 mt-1">{errors.supportCategory.message}</p>
        )}
      </div>

      {/* Line Item Code */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">
          NDIS Line Item Code
        </label>
        <input {...register('ndisLineItemCode')} className="input-field" />
        {errors.ndisLineItemCode && (
          <p className="text-sm text-red-600 mt-1">{errors.ndisLineItemCode.message}</p>
        )}
      </div>

      {/* Rate & Total */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">
            Hourly Rate (AUD)
          </label>
          <input
            type="number"
            step="0.01"
            {...register('hourlyRate', { valueAsNumber: true })}
            className="input-field"
          />
          {errors.hourlyRate && (
            <p className="text-sm text-red-600 mt-1">{errors.hourlyRate.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">
            Calculated Total
          </label>
          <div className="input-field bg-sage-pale/30 flex items-center font-semibold text-forest">
            {formatCurrency(totalAmount)}
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Shift Notes</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="input-field resize-none"
          placeholder="Optional notes about this shift..."
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
        <select {...register('status')} className="input-field">
          {SHIFT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Mark as Completed */}
      {shift && shift.status !== 'Completed' && (
        <button
          type="button"
          onClick={markCompleted}
          className="btn-secondary flex items-center gap-2 w-full justify-center"
        >
          <CheckCircle2 size={16} />
          Mark as Completed
        </button>
      )}

      {/* Convert to Invoice */}
      <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
        <input
          type="checkbox"
          {...register('convertToInvoice')}
          className="rounded border-sage text-forest focus:ring-forest"
        />
        Convert to Invoice Line Item
      </label>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-sage-pale">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {shift ? 'Update Shift' : 'Create Shift'}
          </button>
        </div>
      </div>
    </form>
  );
}
