import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, isWithinInterval } from 'date-fns';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  FileText,
  Clock,
  Plus,
  CheckSquare,
  Square,
  Trash2,
  CheckCircle2,
  ListFilter,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import type { Shift } from '@/types';
import {
  cn,
  formatCurrency,
  formatDate,
  formatTime,
  calculateHours,
  getServiceTypeColor,
} from '@/lib/utils';
import SlideOver from '@/components/ui/SlideOver';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

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

// ── Sort helpers ───────────────────────────────────────────

type SortField = 'date' | 'client' | 'carer' | 'serviceType' | 'hours' | 'rate' | 'total' | 'status';
type SortDir = 'asc' | 'desc';

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

export default function ShiftsList() {
  const navigate = useNavigate();
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

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCarerId, setFilterCarerId] = useState('');
  const [filterClientId, setFilterClientId] = useState('');
  const [filterServiceType, setFilterServiceType] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sort
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const activeClients = useMemo(
    () => clients.filter((c) => c.status === 'Active'),
    [clients]
  );
  const activeCarers = useMemo(
    () => carers.filter((c) => c.status === 'Active'),
    [carers]
  );

  // Filtered + Sorted
  const filteredShifts = useMemo(() => {
    let result = [...shifts];

    if (filterStatus) result = result.filter((s) => s.status === filterStatus);
    if (filterCarerId) result = result.filter((s) => s.carerId === filterCarerId);
    if (filterClientId) result = result.filter((s) => s.clientId === filterClientId);
    if (filterServiceType) result = result.filter((s) => s.serviceType === filterServiceType);
    if (filterDateFrom) {
      result = result.filter((s) => s.date >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((s) => s.date <= filterDateTo);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date':
          cmp = a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime);
          break;
        case 'client': {
          const ca = getClientById(a.clientId);
          const cb = getClientById(b.clientId);
          cmp = `${ca?.lastName ?? ''} ${ca?.firstName ?? ''}`.localeCompare(
            `${cb?.lastName ?? ''} ${cb?.firstName ?? ''}`
          );
          break;
        }
        case 'carer': {
          const ra = getCarerById(a.carerId);
          const rb = getCarerById(b.carerId);
          cmp = `${ra?.lastName ?? ''} ${ra?.firstName ?? ''}`.localeCompare(
            `${rb?.lastName ?? ''} ${rb?.firstName ?? ''}`
          );
          break;
        }
        case 'serviceType':
          cmp = a.serviceType.localeCompare(b.serviceType);
          break;
        case 'hours':
          cmp = a.hours - b.hours;
          break;
        case 'rate':
          cmp = a.hourlyRate - b.hourlyRate;
          break;
        case 'total':
          cmp = a.totalAmount - b.totalAmount;
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [
    shifts,
    filterStatus,
    filterCarerId,
    filterClientId,
    filterServiceType,
    filterDateFrom,
    filterDateTo,
    sortField,
    sortDir,
    getClientById,
    getCarerById,
  ]);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDir('asc');
      }
    },
    [sortField]
  );

  // Selection
  const allSelected =
    filteredShifts.length > 0 && filteredShifts.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredShifts.map((s) => s.id)));
    }
  }, [allSelected, filteredShifts]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleGenerateInvoice = useCallback(() => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one shift');
      return;
    }
    navigate('/invoices/new', { state: { shiftIds: Array.from(selectedIds) } });
  }, [selectedIds, navigate]);

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="text-mid-gray/50" />;
    return sortDir === 'asc' ? (
      <ArrowUp size={14} className="text-forest" />
    ) : (
      <ArrowDown size={14} className="text-forest" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">All Shifts</h1>
          <p className="text-sm text-mid-gray mt-1">
            {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={handleGenerateInvoice}
              className="btn-secondary flex items-center gap-2"
            >
              <FileText size={16} />
              Generate Invoice ({selectedIds.size})
            </button>
          )}
          <button onClick={openNewShift} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Add Shift
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <ListFilter size={16} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          {(filterStatus || filterCarerId || filterClientId || filterServiceType || filterDateFrom || filterDateTo) && (
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterCarerId('');
                setFilterClientId('');
                setFilterServiceType('');
                setFilterDateFrom('');
                setFilterDateTo('');
              }}
              className="text-sm text-burgundy hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All Statuses</option>
              {SHIFT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={filterCarerId}
              onChange={(e) => setFilterCarerId(e.target.value)}
              className="input-field text-sm"
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
              className="input-field text-sm"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
            <select
              value={filterServiceType}
              onChange={(e) => setFilterServiceType(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All Service Types</option>
              {SERVICE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <div>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="input-field text-sm"
                placeholder="From"
              />
            </div>
            <div>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="input-field text-sm"
                placeholder="To"
              />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      {filteredShifts.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No shifts found"
          description="No shifts match your current filters. Try adjusting your filters or add a new shift."
          action={{ label: 'Add Shift', onClick: openNewShift }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header w-10">
                    <button onClick={toggleSelectAll} className="p-1">
                      {allSelected ? (
                        <CheckSquare size={16} className="text-forest" />
                      ) : (
                        <Square size={16} className="text-mid-gray" />
                      )}
                    </button>
                  </th>
                  {(
                    [
                      ['date', 'Date'],
                      ['client', 'Client'],
                      ['carer', 'Carer'],
                      ['serviceType', 'Service Type'],
                      ['hours', 'Hours'],
                      ['rate', 'Rate'],
                      ['total', 'Total'],
                      ['status', 'Status'],
                    ] as [SortField, string][]
                  ).map(([field, label]) => (
                    <th key={field} className="table-header">
                      <button
                        onClick={() => toggleSort(field)}
                        className="flex items-center gap-1.5 hover:text-forest transition-colors"
                      >
                        {label}
                        <SortIcon field={field} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredShifts.map((shift) => {
                  const client = getClientById(shift.clientId);
                  const carer = getCarerById(shift.carerId);
                  const isSelected = selectedIds.has(shift.id);

                  return (
                    <tr
                      key={shift.id}
                      className={cn(
                        'border-b border-sage-pale/50 hover:bg-sage-pale/20 cursor-pointer transition-colors',
                        isSelected && 'bg-sage-pale/30'
                      )}
                      onClick={() => openEditShift(shift)}
                    >
                      <td className="table-cell w-10" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(shift.id)} className="p-1">
                          {isSelected ? (
                            <CheckSquare size={16} className="text-forest" />
                          ) : (
                            <Square size={16} className="text-mid-gray" />
                          )}
                        </button>
                      </td>
                      <td className="table-cell">
                        <div className="text-sm font-medium text-charcoal">
                          {formatDate(shift.date)}
                        </div>
                        <div className="text-xs text-mid-gray">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </div>
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {client ? `${client.firstName} ${client.lastName}` : 'Unknown'}
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {carer ? `${carer.firstName} ${carer.lastName}` : 'Unassigned'}
                      </td>
                      <td className="table-cell">
                        <span
                          className={cn(
                            'badge text-xs',
                            getServiceTypeColor(shift.serviceType)
                          )}
                        >
                          {shift.serviceType}
                        </span>
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {shift.hours.toFixed(2)}
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {formatCurrency(shift.hourlyRate)}
                      </td>
                      <td className="table-cell text-sm font-medium text-charcoal">
                        {formatCurrency(shift.totalAmount)}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={shift.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Shift Drawer */}
      <SlideOver
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingShift ? 'Edit Shift' : 'New Shift'}
        wide
      >
        <ShiftFormInline
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

// ── Inline Shift Form ──────────────────────────────────────

interface ShiftFormInlineProps {
  shift: Shift | null;
  clients: { id: string; firstName: string; lastName: string }[];
  carers: { id: string; firstName: string; lastName: string }[];
  onSave: (data: Omit<Shift, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function ShiftFormInline({ shift, clients, carers, onSave, onDelete, onCancel }: ShiftFormInlineProps) {
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

  const hours = useMemo(() => {
    if (!startTime || !endTime || startTime >= endTime) return 0;
    return calculateHours(startTime, endTime);
  }, [startTime, endTime]);

  const totalAmount = useMemo(() => {
    return Math.round(hours * (hourlyRate || 0) * 100) / 100;
  }, [hours, hourlyRate]);

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
          {errors.date && <p className="text-sm text-red-600 mt-1">{errors.date.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Start Time</label>
          <input type="time" {...register('startTime')} className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">End Time</label>
          <input type="time" {...register('endTime')} className="input-field" />
          {errors.endTime && (
            <p className="text-sm text-red-600 mt-1">{errors.endTime.message}</p>
          )}
        </div>
      </div>

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
      </div>

      {/* Support Category */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">
          NDIS Support Category
        </label>
        <input {...register('supportCategory')} className="input-field" />
      </div>

      {/* Line Item Code */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">
          NDIS Line Item Code
        </label>
        <input {...register('ndisLineItemCode')} className="input-field" />
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
          onClick={() => setValue('status', 'Completed')}
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
