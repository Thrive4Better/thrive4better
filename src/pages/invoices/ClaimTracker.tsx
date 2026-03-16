import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Plus,
  Pencil,
  Trash2,
  ListFilter,
  Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { ClaimSubmission, ClaimPortal, ClaimStatus } from '@/types';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import SlideOver from '@/components/ui/SlideOver';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';

// ── Constants ──

const PORTAL_OPTIONS: ClaimPortal[] = ['PRODA', 'Plan Manager Portal', 'Self Managed', 'Other'];
const STATUS_OPTIONS: ClaimStatus[] = ['submitted', 'accepted', 'rejected', 'paid', 'partial'];

function claimStatusBadge(status: ClaimStatus) {
  const map: Record<ClaimStatus, string> = {
    submitted: 'bg-blue-100 text-blue-800',
    accepted: 'bg-indigo-100 text-indigo-800',
    rejected: 'bg-red-100 text-red-700',
    paid: 'bg-green-100 text-green-800',
    partial: 'bg-amber-100 text-amber-800',
  };
  return map[status];
}

function statusLabel(status: ClaimStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// ── Form Schema ──

const claimSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  claimReference: z.string().min(1, 'Claim reference is required'),
  submittedDate: z.string().min(1, 'Submitted date is required'),
  portal: z.enum(['PRODA', 'Plan Manager Portal', 'Self Managed', 'Other'] as const, {
    required_error: 'Portal is required',
  }),
  status: z.enum(['submitted', 'accepted', 'rejected', 'paid', 'partial'] as const),
  paidAmount: z.coerce.number().min(0).optional(),
  paidDate: z.string().optional(),
  rejectionReason: z.string().optional(),
  notes: z.string(),
});

type ClaimFormData = z.infer<typeof claimSchema>;

// ── Component ──

export default function ClaimTracker() {
  const {
    claimSubmissions,
    invoices,
    addClaimSubmission,
    updateClaimSubmission,
    deleteClaimSubmission,
  } = useStore();
  const { canManageClaims } = usePermissions();

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<ClaimSubmission | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // KPIs
  const kpis = useMemo(() => {
    const submitted = claimSubmissions.filter((c) => c.status === 'submitted').length;
    const accepted = claimSubmissions.filter((c) => c.status === 'accepted').length;
    const rejected = claimSubmissions.filter((c) => c.status === 'rejected').length;
    const paid = claimSubmissions.filter((c) => c.status === 'paid').length;
    const totalPaid = claimSubmissions.reduce((sum, c) => sum + (c.paidAmount ?? 0), 0);
    return { submitted, accepted, rejected, paid, totalPaid };
  }, [claimSubmissions]);

  // Filtered
  const filtered = useMemo(() => {
    let result = [...claimSubmissions];
    if (filterStatus) result = result.filter((c) => c.status === filterStatus);
    result.sort((a, b) => b.submittedDate.localeCompare(a.submittedDate));
    return result;
  }, [claimSubmissions, filterStatus]);

  const getInvoiceNumber = useCallback(
    (invoiceId: string) => {
      const inv = invoices.find((i) => i.id === invoiceId);
      return inv?.invoiceNumber ?? 'Unknown';
    },
    [invoices],
  );

  const openNew = useCallback(() => {
    setEditing(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((claim: ClaimSubmission) => {
    setEditing(claim);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditing(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteClaimSubmission(deletingId);
      toast.success('Claim deleted');
      setDeleteModalOpen(false);
      setDeletingId(null);
      closeDrawer();
    } catch {
      toast.error('Failed to delete claim');
    }
  }, [deletingId, deleteClaimSubmission, closeDrawer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Claim Tracker</h1>
          <p className="text-sm text-mid-gray mt-1">Track NDIS claim submissions and payment status</p>
        </div>
        {canManageClaims && (
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            New Claim
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="text-sm text-mid-gray">Submitted</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{kpis.submitted}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-mid-gray">Accepted</div>
          <div className="text-2xl font-bold text-indigo-700 mt-1">{kpis.accepted}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-mid-gray">Rejected</div>
          <div className="text-2xl font-bold text-red-700 mt-1">{kpis.rejected}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-mid-gray">Paid</div>
          <div className="text-2xl font-bold text-green-700 mt-1">{kpis.paid}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-mid-gray">Total Paid</div>
          <div className="text-2xl font-bold text-forest mt-1">{formatCurrency(kpis.totalPaid)}</div>
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
          {filterStatus && (
            <button
              onClick={() => setFilterStatus('')}
              className="text-sm text-burgundy hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No claims found"
          description="No claims match your filters, or none have been submitted yet."
          action={canManageClaims ? { label: 'New Claim', onClick: openNew } : undefined}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Invoice</th>
                  <th className="table-header">Claim Reference</th>
                  <th className="table-header">Submitted Date</th>
                  <th className="table-header">Portal</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Paid Amount</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((claim) => (
                  <tr
                    key={claim.id}
                    className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors"
                  >
                    <td className="table-cell text-sm font-medium text-charcoal">
                      {getInvoiceNumber(claim.invoiceId)}
                    </td>
                    <td className="table-cell text-sm text-charcoal">{claim.claimReference}</td>
                    <td className="table-cell text-sm text-charcoal">
                      {formatDate(claim.submittedDate)}
                    </td>
                    <td className="table-cell text-sm text-charcoal">{claim.portal}</td>
                    <td className="table-cell">
                      <span className={cn('badge text-xs', claimStatusBadge(claim.status))}>
                        {statusLabel(claim.status)}
                      </span>
                    </td>
                    <td className="table-cell text-sm font-medium text-charcoal">
                      {claim.paidAmount != null ? formatCurrency(claim.paidAmount) : '-'}
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(claim)}
                          className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-forest"
                        >
                          <Pencil size={15} />
                        </button>
                        {canManageClaims && (
                          <button
                            onClick={() => {
                              setDeletingId(claim.id);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-mid-gray hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SlideOver Form */}
      <SlideOver open={drawerOpen} onClose={closeDrawer} title={editing ? 'Edit Claim' : 'New Claim'} wide>
        <ClaimForm
          claim={editing}
          invoices={invoices}
          onSave={async (data, isNew) => {
            try {
              if (isNew) {
                await addClaimSubmission(data as Omit<ClaimSubmission, 'id' | 'createdAt' | 'updatedAt'>);
                toast.success('Claim submitted');
              } else if (editing) {
                await updateClaimSubmission(editing.id, data);
                toast.success('Claim updated');
              }
              closeDrawer();
            } catch {
              toast.error('Failed to save claim');
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
        title="Delete Claim"
        message="Are you sure you want to delete this claim submission? This action cannot be undone."
      />
    </div>
  );
}

// ── Form ──

interface ClaimFormProps {
  claim: ClaimSubmission | null;
  invoices: { id: string; invoiceNumber: string }[];
  onSave: (data: Partial<ClaimSubmission>, isNew: boolean) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function ClaimForm({ claim, invoices, onSave, onDelete, onCancel }: ClaimFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: claim
      ? {
          invoiceId: claim.invoiceId,
          claimReference: claim.claimReference,
          submittedDate: claim.submittedDate,
          portal: claim.portal,
          status: claim.status,
          paidAmount: claim.paidAmount ?? 0,
          paidDate: claim.paidDate ?? '',
          rejectionReason: claim.rejectionReason ?? '',
          notes: claim.notes,
        }
      : {
          invoiceId: '',
          claimReference: '',
          submittedDate: format(new Date(), 'yyyy-MM-dd'),
          portal: 'PRODA',
          status: 'submitted',
          paidAmount: 0,
          paidDate: '',
          rejectionReason: '',
          notes: '',
        },
  });

  const status = watch('status');

  const onSubmit = (data: ClaimFormData) => {
    onSave(data as unknown as Partial<ClaimSubmission>, !claim);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Invoice */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Invoice</label>
        <select {...register('invoiceId')} className="input-field">
          <option value="">Select invoice...</option>
          {invoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.invoiceNumber}
            </option>
          ))}
        </select>
        {errors.invoiceId && <p className="text-sm text-red-600 mt-1">{errors.invoiceId.message}</p>}
      </div>

      {/* Claim Reference */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Claim Reference</label>
        <input {...register('claimReference')} className="input-field" placeholder="e.g. CLM-2026-001" />
        {errors.claimReference && <p className="text-sm text-red-600 mt-1">{errors.claimReference.message}</p>}
      </div>

      {/* Submitted Date & Portal */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Submitted Date</label>
          <input type="date" {...register('submittedDate')} className="input-field" />
          {errors.submittedDate && <p className="text-sm text-red-600 mt-1">{errors.submittedDate.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Portal</label>
          <select {...register('portal')} className="input-field">
            {PORTAL_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
        <select {...register('status')} className="input-field">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
      </div>

      {/* Paid Amount & Date (shown when paid/partial) */}
      {(status === 'paid' || status === 'partial') && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Paid Amount (AUD)</label>
            <input
              type="number"
              step="0.01"
              {...register('paidAmount')}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Paid Date</label>
            <input type="date" {...register('paidDate')} className="input-field" />
          </div>
        </div>
      )}

      {/* Rejection Reason (shown when rejected) */}
      {status === 'rejected' && (
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Rejection Reason</label>
          <textarea
            {...register('rejectionReason')}
            rows={3}
            className="input-field resize-none"
            placeholder="Reason for rejection..."
          />
        </div>
      )}

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
            {claim ? 'Update Claim' : 'Submit Claim'}
          </button>
        </div>
      </div>
    </form>
  );
}
