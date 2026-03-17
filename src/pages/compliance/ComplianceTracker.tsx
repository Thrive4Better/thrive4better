import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  Plus,
  ShieldCheck,
  AlertTriangle,
  Pencil,
  Trash2,
  ListFilter,
  ClipboardCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { ComplianceRecord, ComplianceCheckType, ComplianceStatus } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import SlideOver from '@/components/ui/SlideOver';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';
import TableFilter from '@/components/ui/TableFilter';

// ── Constants ──

const CHECK_TYPES: ComplianceCheckType[] = [
  'NDIS Worker Screening',
  'First Aid',
  'WWCC',
  'Police Check',
  'Manual Handling',
  'Medication Admin',
  'CPR',
  'Infection Control',
  'Food Safety',
  'Driver License',
  'Working at Heights',
  'Other',
];

const STATUS_OPTIONS: ComplianceStatus[] = ['valid', 'expiring_soon', 'expired', 'pending'];

function complianceStatusBadge(status: ComplianceStatus) {
  const map: Record<ComplianceStatus, string> = {
    valid: 'bg-green-100 text-green-800',
    expiring_soon: 'bg-yellow-100 text-yellow-800',
    expired: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-600',
  };
  return map[status];
}

function statusLabel(status: ComplianceStatus) {
  const map: Record<ComplianceStatus, string> = {
    valid: 'Valid',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
    pending: 'Pending',
  };
  return map[status];
}

function calcStatus(expiryDate: string): ComplianceStatus {
  if (!expiryDate) return 'pending';
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'valid';
}

// ── Form Schema ──

const complianceSchema = z.object({
  carerId: z.string().min(1, 'Carer is required'),
  checkType: z.string().min(1, 'Check type is required') as z.ZodType<ComplianceCheckType>,
  certificateNumber: z.string(),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  notes: z.string(),
});

type ComplianceFormData = z.infer<typeof complianceSchema>;

// ── Component ──

export default function ComplianceTracker() {
  const {
    complianceRecords,
    carers,
    addComplianceRecord,
    updateComplianceRecord,
    deleteComplianceRecord,
    getCarerById,
  } = useStore();
  const { canViewCompliance } = usePermissions();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCheckType, setFilterCheckType] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ComplianceRecord | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Summary KPIs
  const kpis = useMemo(() => {
    const totalCarers = carers.length;
    const carerStatuses = new Map<string, ComplianceStatus[]>();

    complianceRecords.forEach((r) => {
      const current = calcStatus(r.expiryDate);
      const arr = carerStatuses.get(r.carerId) || [];
      arr.push(current);
      carerStatuses.set(r.carerId, arr);
    });

    let fullyCompliant = 0;
    let expiringSoon = 0;
    let expired = 0;

    carerStatuses.forEach((statuses) => {
      if (statuses.some((s) => s === 'expired')) expired++;
      else if (statuses.some((s) => s === 'expiring_soon')) expiringSoon++;
      else if (statuses.every((s) => s === 'valid')) fullyCompliant++;
    });

    return { totalCarers, fullyCompliant, expiringSoon, expired };
  }, [carers, complianceRecords]);

  // Total count for search results
  const totalRecordCount = complianceRecords.length;

  // Group by carer with filters
  const groupedRecords = useMemo(() => {
    let records = [...complianceRecords];

    // Recalculate statuses
    records = records.map((r) => ({ ...r, status: calcStatus(r.expiryDate) }));

    if (filterStatus) records = records.filter((r) => r.status === filterStatus);
    if (filterCheckType) records = records.filter((r) => r.checkType === filterCheckType);

    // Keyword search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      records = records.filter((r) => {
        const carer = getCarerById(r.carerId);
        const carerName = carer ? `${carer.firstName} ${carer.lastName}`.toLowerCase() : '';
        return (
          carerName.includes(q) ||
          r.checkType.toLowerCase().includes(q) ||
          (r.certificateNumber?.toLowerCase().includes(q) ?? false) ||
          statusLabel(r.status).toLowerCase().includes(q)
        );
      });
    }

    // Sort records by expiry date
    records.sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

    const groups = new Map<string, ComplianceRecord[]>();
    records.forEach((r) => {
      const arr = groups.get(r.carerId) || [];
      arr.push(r);
      groups.set(r.carerId, arr);
    });

    return groups;
  }, [complianceRecords, filterStatus, filterCheckType, searchQuery, getCarerById]);

  const openNew = useCallback(() => {
    setEditing(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((record: ComplianceRecord) => {
    setEditing(record);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditing(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteComplianceRecord(deletingId);
      toast.success('Compliance record deleted');
      setDeleteModalOpen(false);
      setDeletingId(null);
      closeDrawer();
    } catch {
      toast.error('Failed to delete compliance record');
    }
  }, [deletingId, deleteComplianceRecord, closeDrawer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Compliance Tracker</h1>
          <p className="text-sm text-mid-gray mt-1">Track carer certifications and compliance checks</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Add Record
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-sm text-mid-gray">Total Carers</div>
          <div className="text-2xl font-bold text-charcoal mt-1">{kpis.totalCarers}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-mid-gray">
            <ShieldCheck size={14} className="text-green-600" />
            Fully Compliant
          </div>
          <div className="text-2xl font-bold text-green-700 mt-1">{kpis.fullyCompliant}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-mid-gray">
            <AlertTriangle size={14} className="text-yellow-600" />
            Expiring Soon
          </div>
          <div className="text-2xl font-bold text-yellow-700 mt-1">{kpis.expiringSoon}</div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-sm text-mid-gray">
            <AlertTriangle size={14} className="text-red-600" />
            Expired
          </div>
          <div className="text-2xl font-bold text-red-700 mt-1">{kpis.expired}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <TableFilter
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by carer name, check type, certificate #..."
        filterOptions={[
          {
            label: 'All Statuses',
            value: 'status',
            options: STATUS_OPTIONS.map((s) => ({ label: statusLabel(s), value: s })),
          },
          {
            label: 'All Check Types',
            value: 'checkType',
            options: CHECK_TYPES.map((t) => ({ label: t, value: t })),
          },
        ]}
        activeFilters={{ status: filterStatus, checkType: filterCheckType }}
        onFilterChange={(key, value) => {
          if (key === 'status') setFilterStatus(value);
          if (key === 'checkType') setFilterCheckType(value);
        }}
        onClearFilters={() => {
          setSearchQuery('');
          setFilterStatus('');
          setFilterCheckType('');
        }}
        resultCount={Array.from(groupedRecords.values()).reduce((sum, arr) => sum + arr.length, 0)}
        totalCount={totalRecordCount}
      />

      {/* Grouped Table */}
      {groupedRecords.size === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No compliance records"
          description="No compliance records match your filters, or none have been added yet."
          action={{ label: 'Add Record', onClick: openNew }}
        />
      ) : (
        <div className="space-y-4">
          {Array.from(groupedRecords.entries()).map(([carerId, records]) => {
            const carer = getCarerById(carerId);
            return (
              <div key={carerId} className="card overflow-hidden">
                <div className="px-4 py-3 bg-sage-pale/30 border-b border-sage-pale">
                  <h3 className="font-semibold text-charcoal">
                    {carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown Carer'}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr>
                        <th className="table-header">Check Type</th>
                        <th className="table-header">Certificate #</th>
                        <th className="table-header">Issue Date</th>
                        <th className="table-header">Expiry Date</th>
                        <th className="table-header">Status</th>
                        <th className="table-header">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((record) => {
                        const computedStatus = calcStatus(record.expiryDate);
                        return (
                          <tr
                            key={record.id}
                            className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors"
                          >
                            <td className="table-cell text-sm text-charcoal">{record.checkType}</td>
                            <td className="table-cell text-sm text-charcoal">
                              {record.certificateNumber || '-'}
                            </td>
                            <td className="table-cell text-sm text-charcoal">
                              {formatDate(record.issueDate)}
                            </td>
                            <td className="table-cell text-sm text-charcoal">
                              {formatDate(record.expiryDate)}
                            </td>
                            <td className="table-cell">
                              <span className={cn('badge text-xs', complianceStatusBadge(computedStatus))}>
                                {statusLabel(computedStatus)}
                              </span>
                            </td>
                            <td className="table-cell">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => openEdit(record)}
                                  className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-forest"
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  onClick={() => {
                                    setDeletingId(record.id);
                                    setDeleteModalOpen(true);
                                  }}
                                  className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-mid-gray hover:text-red-600"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* SlideOver Form */}
      <SlideOver open={drawerOpen} onClose={closeDrawer} title={editing ? 'Edit Compliance Record' : 'Add Compliance Record'} wide>
        <ComplianceForm
          record={editing}
          carers={carers}
          onSave={async (data, isNew) => {
            try {
              const status = calcStatus(data.expiryDate as string);
              if (isNew) {
                await addComplianceRecord({ ...data, status } as Omit<ComplianceRecord, 'id' | 'createdAt'>);
                toast.success('Compliance record added');
              } else if (editing) {
                await updateComplianceRecord(editing.id, { ...data, status });
                toast.success('Compliance record updated');
              }
              closeDrawer();
            } catch {
              toast.error('Failed to save compliance record');
            }
          }}
          onDelete={
            editing
              ? () => {
                  setDeletingId(editing.id);
                  setDeleteModalOpen(true);
                }
              : undefined
          }
          onCancel={closeDrawer}
        />
      </SlideOver>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        title="Delete Compliance Record"
        message="Are you sure you want to delete this compliance record? This action cannot be undone."
      />
    </div>
  );
}

// ── Form ──

interface ComplianceFormProps {
  record: ComplianceRecord | null;
  carers: { id: string; firstName: string; lastName: string }[];
  onSave: (data: Partial<ComplianceRecord>, isNew: boolean) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function ComplianceForm({ record, carers, onSave, onDelete, onCancel }: ComplianceFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ComplianceFormData>({
    resolver: zodResolver(complianceSchema),
    defaultValues: record
      ? {
          carerId: record.carerId,
          checkType: record.checkType,
          certificateNumber: record.certificateNumber,
          issueDate: record.issueDate,
          expiryDate: record.expiryDate,
          notes: record.notes,
        }
      : {
          carerId: '',
          checkType: '' as ComplianceCheckType,
          certificateNumber: '',
          issueDate: format(new Date(), 'yyyy-MM-dd'),
          expiryDate: '',
          notes: '',
        },
  });

  const onSubmit = (data: ComplianceFormData) => {
    onSave(data as Partial<ComplianceRecord>, !record);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
        {errors.carerId && <p className="text-sm text-red-600 mt-1">{errors.carerId.message}</p>}
      </div>

      {/* Check Type */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Check Type</label>
        <select {...register('checkType')} className="input-field">
          <option value="">Select type...</option>
          {CHECK_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {errors.checkType && <p className="text-sm text-red-600 mt-1">{errors.checkType.message}</p>}
      </div>

      {/* Certificate Number */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Certificate Number</label>
        <input {...register('certificateNumber')} className="input-field" placeholder="Certificate or registration number..." />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Issue Date</label>
          <input type="date" {...register('issueDate')} className="input-field" />
          {errors.issueDate && <p className="text-sm text-red-600 mt-1">{errors.issueDate.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Expiry Date</label>
          <input type="date" {...register('expiryDate')} className="input-field" />
          {errors.expiryDate && <p className="text-sm text-red-600 mt-1">{errors.expiryDate.message}</p>}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Notes</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="input-field resize-none"
          placeholder="Optional notes..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-sage-pale">
        <div>
          {onDelete && (
            <button type="button" onClick={onDelete} className="btn-danger flex items-center gap-2">
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
            {record ? 'Update Record' : 'Add Record'}
          </button>
        </div>
      </div>
    </form>
  );
}
