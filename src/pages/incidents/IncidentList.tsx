import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Plus,
  Search,
  AlertTriangle,
  Pencil,
  Trash2,
  ListFilter,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { IncidentReport, IncidentType, IncidentSeverity, IncidentStatus } from '@/types';
import { cn, formatDate } from '@/lib/utils';
import SlideOver from '@/components/ui/SlideOver';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

// ── Constants ──

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: 'injury', label: 'Injury' },
  { value: 'behavior', label: 'Behaviour' },
  { value: 'medication', label: 'Medication' },
  { value: 'property', label: 'Property Damage' },
  { value: 'fall', label: 'Fall' },
  { value: 'abuse_neglect', label: 'Abuse / Neglect' },
  { value: 'other', label: 'Other' },
];

const SEVERITY_OPTIONS: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS: IncidentStatus[] = ['open', 'under_review', 'resolved', 'closed'];

function severityBadge(severity: IncidentSeverity) {
  const map: Record<IncidentSeverity, string> = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };
  return map[severity];
}

function statusBadgeColor(status: IncidentStatus) {
  const map: Record<IncidentStatus, string> = {
    open: 'bg-blue-100 text-blue-800',
    under_review: 'bg-amber-100 text-amber-800',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-600',
  };
  return map[status];
}

function statusLabel(status: IncidentStatus) {
  const map: Record<IncidentStatus, string> = {
    open: 'Open',
    under_review: 'Under Review',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return map[status];
}

// ── Form Schema ──

const incidentSchema = z.object({
  clientId: z.string().min(1, 'Client is required'),
  carerId: z.string().min(1, 'Carer is required'),
  incidentDate: z.string().min(1, 'Incident date is required'),
  incidentType: z.enum(['injury', 'behavior', 'medication', 'property', 'fall', 'abuse_neglect', 'other'] as const, {
    required_error: 'Incident type is required',
  }),
  severity: z.enum(['low', 'medium', 'high', 'critical'] as const, {
    required_error: 'Severity is required',
  }),
  description: z.string().min(1, 'Description is required'),
  immediateActionTaken: z.string(),
  followUpRequired: z.boolean(),
  followUpNotes: z.string(),
  witnessNames: z.string(),
  status: z.enum(['open', 'under_review', 'resolved', 'closed'] as const),
});

type IncidentFormData = z.infer<typeof incidentSchema>;

// ── Component ──

export default function IncidentList() {
  const {
    incidentReports,
    clients,
    carers,
    addIncidentReport,
    updateIncidentReport,
    deleteIncidentReport,
    getClientById,
    getCarerById,
  } = useStore();
  const { profile } = useAuth();
  const { isAdminOrManager, canReviewIncidents } = usePermissions();

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<IncidentReport | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredReports = useMemo(() => {
    let result = [...incidentReports];

    if (filterStatus) result = result.filter((r) => r.status === filterStatus);
    if (filterSeverity) result = result.filter((r) => r.severity === filterSeverity);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) => {
        const client = getClientById(r.clientId);
        const carer = getCarerById(r.carerId);
        const clientName = client ? `${client.firstName} ${client.lastName}`.toLowerCase() : '';
        const carerName = carer ? `${carer.firstName} ${carer.lastName}`.toLowerCase() : '';
        return clientName.includes(q) || carerName.includes(q);
      });
    }

    result.sort((a, b) => b.incidentDate.localeCompare(a.incidentDate));
    return result;
  }, [incidentReports, filterStatus, filterSeverity, search, getClientById, getCarerById]);

  const openNew = useCallback(() => {
    setEditing(null);
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((report: IncidentReport) => {
    setEditing(report);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditing(null);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingId) return;
    try {
      await deleteIncidentReport(deletingId);
      toast.success('Incident report deleted');
      setDeleteModalOpen(false);
      setDeletingId(null);
      closeDrawer();
    } catch {
      toast.error('Failed to delete incident report');
    }
  }, [deletingId, deleteIncidentReport, closeDrawer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Incident Reports</h1>
          <p className="text-sm text-mid-gray mt-1">
            {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Report Incident
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="btn-ghost flex items-center gap-2 text-sm"
            >
              <ListFilter size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client or carer..."
                className="input-field pl-9 text-sm w-64"
              />
            </div>
          </div>
          {(filterStatus || filterSeverity) && (
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterSeverity('');
              }}
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
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All Severities</option>
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      {filteredReports.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="No incident reports"
          description="No incidents match your filters, or none have been reported yet."
          action={{ label: 'Report Incident', onClick: openNew }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Date</th>
                  <th className="table-header">Client</th>
                  <th className="table-header">Carer</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Severity</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReports.map((report) => {
                  const client = getClientById(report.clientId);
                  const carer = getCarerById(report.carerId);
                  const typeLabel = INCIDENT_TYPES.find((t) => t.value === report.incidentType)?.label ?? report.incidentType;

                  return (
                    <tr
                      key={report.id}
                      className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors"
                    >
                      <td className="table-cell text-sm text-charcoal">
                        {formatDate(report.incidentDate)}
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {client ? `${client.firstName} ${client.lastName}` : 'Unknown'}
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown'}
                      </td>
                      <td className="table-cell text-sm text-charcoal">{typeLabel}</td>
                      <td className="table-cell">
                        <span className={cn('badge text-xs', severityBadge(report.severity))}>
                          {report.severity.charAt(0).toUpperCase() + report.severity.slice(1)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <span className={cn('badge text-xs', statusBadgeColor(report.status))}>
                          {statusLabel(report.status)}
                        </span>
                      </td>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(report)}
                            className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-forest"
                          >
                            <Pencil size={15} />
                          </button>
                          {isAdminOrManager && (
                            <button
                              onClick={() => {
                                setDeletingId(report.id);
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
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SlideOver Form */}
      <SlideOver open={drawerOpen} onClose={closeDrawer} title={editing ? 'Edit Incident Report' : 'Report Incident'} wide>
        <IncidentForm
          report={editing}
          clients={clients}
          carers={carers}
          currentUserId={profile?.id ?? ''}
          canReview={canReviewIncidents}
          onSave={async (data, isNew) => {
            try {
              if (isNew) {
                await addIncidentReport(data as Omit<IncidentReport, 'id' | 'createdAt' | 'updatedAt'>);
                toast.success('Incident reported');
              } else if (editing) {
                await updateIncidentReport(editing.id, data);
                toast.success('Incident updated');
              }
              closeDrawer();
            } catch {
              toast.error('Failed to save incident report');
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
        title="Delete Incident Report"
        message="Are you sure you want to delete this incident report? This action cannot be undone."
      />
    </div>
  );
}

// ── Form ──

interface IncidentFormProps {
  report: IncidentReport | null;
  clients: { id: string; firstName: string; lastName: string }[];
  carers: { id: string; firstName: string; lastName: string }[];
  currentUserId: string;
  canReview: boolean;
  onSave: (data: Partial<IncidentReport>, isNew: boolean) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function IncidentForm({ report, clients, carers, currentUserId, canReview, onSave, onDelete, onCancel }: IncidentFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IncidentFormData>({
    resolver: zodResolver(incidentSchema),
    defaultValues: report
      ? {
          clientId: report.clientId,
          carerId: report.carerId,
          incidentDate: report.incidentDate,
          incidentType: report.incidentType,
          severity: report.severity,
          description: report.description,
          immediateActionTaken: report.immediateActionTaken,
          followUpRequired: report.followUpRequired,
          followUpNotes: report.followUpNotes,
          witnessNames: report.witnessNames,
          status: report.status,
        }
      : {
          clientId: '',
          carerId: '',
          incidentDate: format(new Date(), 'yyyy-MM-dd'),
          incidentType: 'other',
          severity: 'low',
          description: '',
          immediateActionTaken: '',
          followUpRequired: false,
          followUpNotes: '',
          witnessNames: '',
          status: 'open',
        },
  });

  const followUpRequired = watch('followUpRequired');

  const onSubmit = (data: IncidentFormData) => {
    if (report) {
      const update: Partial<IncidentReport> = { ...data };
      if (canReview && data.status !== report.status && (data.status === 'under_review' || data.status === 'resolved' || data.status === 'closed')) {
        update.reviewedBy = currentUserId;
      }
      onSave(update, false);
    } else {
      onSave(
        {
          ...data,
          reportedBy: currentUserId,
        },
        true,
      );
    }
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
        {errors.clientId && <p className="text-sm text-red-600 mt-1">{errors.clientId.message}</p>}
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
        {errors.carerId && <p className="text-sm text-red-600 mt-1">{errors.carerId.message}</p>}
      </div>

      {/* Incident Date */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Incident Date</label>
        <input type="date" {...register('incidentDate')} className="input-field" />
        {errors.incidentDate && <p className="text-sm text-red-600 mt-1">{errors.incidentDate.message}</p>}
      </div>

      {/* Type & Severity */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Incident Type</label>
          <select {...register('incidentType')} className="input-field">
            {INCIDENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          {errors.incidentType && <p className="text-sm text-red-600 mt-1">{errors.incidentType.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Severity</label>
          <select {...register('severity')} className="input-field">
            {SEVERITY_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </option>
            ))}
          </select>
          {errors.severity && <p className="text-sm text-red-600 mt-1">{errors.severity.message}</p>}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
        <textarea
          {...register('description')}
          rows={4}
          className="input-field resize-none"
          placeholder="Describe the incident in detail..."
        />
        {errors.description && <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>}
      </div>

      {/* Immediate Action */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Immediate Action Taken</label>
        <textarea
          {...register('immediateActionTaken')}
          rows={3}
          className="input-field resize-none"
          placeholder="What action was taken at the time..."
        />
      </div>

      {/* Follow-up */}
      <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
        <input
          type="checkbox"
          {...register('followUpRequired')}
          className="rounded border-sage text-forest focus:ring-forest"
        />
        Follow-up Required
      </label>

      {followUpRequired && (
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Follow-up Notes</label>
          <textarea
            {...register('followUpNotes')}
            rows={3}
            className="input-field resize-none"
            placeholder="Describe follow-up actions needed..."
          />
        </div>
      )}

      {/* Witness Names */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Witness Names</label>
        <input
          {...register('witnessNames')}
          className="input-field"
          placeholder="Comma-separated names of witnesses..."
        />
      </div>

      {/* Status (admin/manager only on edit) */}
      {report && canReview && (
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
      )}

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
            {report ? 'Update Report' : 'Submit Report'}
          </button>
        </div>
      </div>
    </form>
  );
}
