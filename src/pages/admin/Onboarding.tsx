import { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Search,
  UserPlus,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Trash2,
  Eye,
  X,
  FileCheck,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { cn, generateId, formatDate } from '@/lib/utils';
import { useStore } from '@/stores/useStore';
import ConfirmModal from '@/components/ui/ConfirmModal';
import EmptyState from '@/components/ui/EmptyState';

// ── localStorage helpers ──

const STORAGE_PREFIX = 't4b_';

export interface OnboardingChecklistItem {
  id: string;
  label: string;
  description: string;
  required: boolean;
  documentId?: string; // Links to companyDocuments
  completed: boolean;
  completedDate?: string;
  notes?: string;
}

export interface OnboardingRecord {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  carerId?: string;
  startDate: string;
  status: 'in_progress' | 'completed' | 'on_hold';
  checklist: OnboardingChecklistItem[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_CHECKLIST: Omit<OnboardingChecklistItem, 'id'>[] = [
  {
    label: 'Contractor Agreement signed',
    description: 'Independent contractor agreement outlining scope of services, payment terms, and NDIS compliance.',
    required: true,
    documentId: 'contractor-agreement',
    completed: false,
  },
  {
    label: 'Confidentiality Agreement signed',
    description: 'Agreement binding the contractor to maintain confidentiality of all participant and business information.',
    required: true,
    documentId: 'confidentiality-agreement',
    completed: false,
  },
  {
    label: 'Media Release Agreement signed',
    description: 'Consent for use of photos, videos, and testimonials for marketing purposes.',
    required: false,
    documentId: 'media-release-agreement',
    completed: false,
  },
  {
    label: 'OHS Documentation reviewed and acknowledged',
    description: 'Review of occupational health and safety policies, hazard identification, and emergency procedures.',
    required: true,
    documentId: 'ohs-documentation',
    completed: false,
  },
  {
    label: 'NDIS Worker Screening Check verified',
    description: 'Valid NDIS Worker Screening Check clearance must be sighted and recorded.',
    required: true,
    completed: false,
  },
  {
    label: 'Working with Children Check verified',
    description: 'Valid WWCC if applicable to the role or participants being supported.',
    required: false,
    completed: false,
  },
  {
    label: 'First Aid Certificate verified',
    description: 'Current First Aid and CPR certification must be sighted and recorded.',
    required: true,
    completed: false,
  },
  {
    label: 'COVID-19 Vaccination status recorded',
    description: 'COVID-19 vaccination status documented as per organisational requirements.',
    required: true,
    completed: false,
  },
];

function getOnboardingRecords(): OnboardingRecord[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}onboarding_records`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOnboardingRecords(records: OnboardingRecord[]) {
  localStorage.setItem(`${STORAGE_PREFIX}onboarding_records`, JSON.stringify(records));
}

// ── Status helpers ──

function getProgressPercent(checklist: OnboardingChecklistItem[]): number {
  if (checklist.length === 0) return 0;
  const completed = checklist.filter((item) => item.completed).length;
  return Math.round((completed / checklist.length) * 100);
}

function getStatusBadge(status: OnboardingRecord['status']) {
  const map: Record<OnboardingRecord['status'], { label: string; className: string }> = {
    in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-800' },
    completed: { label: 'Completed', className: 'bg-green-100 text-green-800' },
    on_hold: { label: 'On Hold', className: 'bg-amber-100 text-amber-800' },
  };
  return map[status];
}

// ── Main Component ──

export default function Onboarding() {
  const { carers } = useStore();
  const [records, setRecords] = useState<OnboardingRecord[]>(getOnboardingRecords);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Modal states
  const [showNewForm, setShowNewForm] = useState(false);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const updateRecords = useCallback((newRecords: OnboardingRecord[]) => {
    setRecords(newRecords);
    saveOnboardingRecords(newRecords);
  }, []);

  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (filterStatus) {
      result = result.filter((r) => r.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.employeeName.toLowerCase().includes(q) ||
          r.employeeEmail.toLowerCase().includes(q) ||
          r.employeeRole.toLowerCase().includes(q)
      );
    }
    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return result;
  }, [records, filterStatus, search]);

  // Dashboard stats
  const stats = useMemo(() => {
    const total = records.length;
    const inProgress = records.filter((r) => r.status === 'in_progress').length;
    const completed = records.filter((r) => r.status === 'completed').length;
    const onHold = records.filter((r) => r.status === 'on_hold').length;
    return { total, inProgress, completed, onHold };
  }, [records]);

  const handleCreate = (data: { name: string; email: string; role: string; carerId?: string; startDate: string }) => {
    const record: OnboardingRecord = {
      id: generateId(),
      employeeName: data.name,
      employeeEmail: data.email,
      employeeRole: data.role,
      carerId: data.carerId,
      startDate: data.startDate,
      status: 'in_progress',
      checklist: DEFAULT_CHECKLIST.map((item) => ({ ...item, id: generateId() })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const newRecords = [...records, record];
    updateRecords(newRecords);
    setShowNewForm(false);
    toast.success(`Onboarding started for ${data.name}`);
  };

  const handleToggleItem = (recordId: string, itemId: string) => {
    const newRecords = records.map((r) => {
      if (r.id !== recordId) return r;
      const newChecklist = r.checklist.map((item) => {
        if (item.id !== itemId) return item;
        return {
          ...item,
          completed: !item.completed,
          completedDate: !item.completed ? new Date().toISOString() : undefined,
        };
      });
      const allDone = newChecklist.every((item) => item.completed || !item.required);
      return {
        ...r,
        checklist: newChecklist,
        status: allDone && newChecklist.every((i) => i.completed) ? ('completed' as const) : r.status === 'completed' ? ('in_progress' as const) : r.status,
        updatedAt: new Date().toISOString(),
      };
    });
    updateRecords(newRecords);
  };

  const handleUpdateStatus = (recordId: string, status: OnboardingRecord['status']) => {
    const newRecords = records.map((r) =>
      r.id === recordId ? { ...r, status, updatedAt: new Date().toISOString() } : r
    );
    updateRecords(newRecords);
    toast.success('Status updated');
  };

  const handleDelete = () => {
    if (!deletingId) return;
    const newRecords = records.filter((r) => r.id !== deletingId);
    updateRecords(newRecords);
    setDeleteModalOpen(false);
    setDeletingId(null);
    if (expandedRecord === deletingId) setExpandedRecord(null);
    toast.success('Onboarding record deleted');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Employee Onboarding</h1>
          <p className="text-sm text-mid-gray mt-1">
            Track and manage new employee/contractor onboarding
          </p>
        </div>
        <button onClick={() => setShowNewForm(true)} className="btn-primary">
          <UserPlus size={18} />
          Start Onboarding
        </button>
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-sage-pale flex items-center justify-center mx-auto mb-2">
            <Users size={20} className="text-forest" />
          </div>
          <p className="text-2xl font-bold text-charcoal">{stats.total}</p>
          <p className="text-xs text-mid-gray">Total</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
            <Clock size={20} className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-charcoal">{stats.inProgress}</p>
          <p className="text-xs text-mid-gray">In Progress</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-2">
            <CheckCircle2 size={20} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-charcoal">{stats.completed}</p>
          <p className="text-xs text-mid-gray">Completed</p>
        </div>
        <div className="card p-4 text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle size={20} className="text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-charcoal">{stats.onHold}</p>
          <p className="text-xs text-mid-gray">On Hold</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="input-field pl-9 text-sm"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="input-field text-sm w-auto"
          >
            <option value="">All Statuses</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>

      {/* Onboarding Records */}
      {filteredRecords.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No onboarding records"
          description="Start the onboarding process for a new employee or contractor."
          action={{ label: 'Start Onboarding', onClick: () => setShowNewForm(true) }}
        />
      ) : (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const progress = getProgressPercent(record.checklist);
            const statusInfo = getStatusBadge(record.status);
            const isExpanded = expandedRecord === record.id;
            const completedCount = record.checklist.filter((i) => i.completed).length;

            return (
              <div key={record.id} className="card p-0 overflow-hidden">
                {/* Record Header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-sage-pale/20 transition-colors"
                  onClick={() => setExpandedRecord(isExpanded ? null : record.id)}
                >
                  <div className="flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown size={18} className="text-mid-gray" />
                    ) : (
                      <ChevronRight size={18} className="text-mid-gray" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-charcoal">{record.employeeName}</h3>
                      <span className={cn('badge text-xs', statusInfo.className)}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-mid-gray mt-0.5">
                      <span>{record.employeeRole}</span>
                      <span>{record.employeeEmail}</span>
                      <span>Started {formatDate(record.startDate)}</span>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="w-32 hidden sm:block">
                      <div className="flex items-center justify-between text-xs text-mid-gray mb-1">
                        <span>{completedCount}/{record.checklist.length}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="w-full bg-sage-pale rounded-full h-2">
                        <div
                          className={cn(
                            'h-2 rounded-full transition-all',
                            progress === 100 ? 'bg-green-500' : progress > 50 ? 'bg-forest' : 'bg-amber-500'
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(record.id);
                          setDeleteModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-mid-gray hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Checklist */}
                {isExpanded && (
                  <div className="border-t border-sage-pale px-4 py-4">
                    {/* Status controls */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs text-mid-gray">Status:</span>
                      {(['in_progress', 'on_hold', 'completed'] as const).map((s) => {
                        const info = getStatusBadge(s);
                        return (
                          <button
                            key={s}
                            onClick={() => handleUpdateStatus(record.id, s)}
                            className={cn(
                              'badge text-xs cursor-pointer transition-opacity',
                              record.status === s ? info.className : 'bg-gray-100 text-gray-400 hover:opacity-80'
                            )}
                          >
                            {info.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Checklist */}
                    <div className="space-y-2">
                      {record.checklist.map((item) => (
                        <div
                          key={item.id}
                          className={cn(
                            'flex items-start gap-3 p-3 rounded-xl transition-colors',
                            item.completed ? 'bg-green-50/50' : 'bg-sage-pale/20'
                          )}
                        >
                          <button
                            onClick={() => handleToggleItem(record.id, item.id)}
                            className="flex-shrink-0 mt-0.5"
                          >
                            {item.completed ? (
                              <CheckCircle2 size={20} className="text-green-600" />
                            ) : (
                              <Circle size={20} className="text-mid-gray" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  'text-sm font-medium',
                                  item.completed ? 'text-green-800 line-through' : 'text-charcoal'
                                )}
                              >
                                {item.label}
                              </p>
                              {!item.required && (
                                <span className="badge text-[10px] bg-gray-100 text-gray-500">Optional</span>
                              )}
                              {item.documentId && (
                                <a
                                  href="/documents"
                                  className="badge text-[10px] bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Eye size={10} className="mr-0.5" />
                                  View Doc
                                </a>
                              )}
                            </div>
                            <p className="text-xs text-mid-gray mt-0.5">{item.description}</p>
                            {item.completed && item.completedDate && (
                              <p className="text-xs text-green-600 mt-1">
                                Completed {formatDate(item.completedDate)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New Onboarding Modal */}
      {showNewForm && (
        <NewOnboardingModal
          carers={carers}
          onClose={() => setShowNewForm(false)}
          onCreate={handleCreate}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDeletingId(null);
        }}
        onConfirm={handleDelete}
        title="Delete Onboarding Record"
        message="Are you sure you want to delete this onboarding record? This action cannot be undone."
      />
    </div>
  );
}

// ── New Onboarding Modal ──

interface NewOnboardingModalProps {
  carers: { id: string; firstName: string; lastName: string }[];
  onClose: () => void;
  onCreate: (data: { name: string; email: string; role: string; carerId?: string; startDate: string }) => void;
}

function NewOnboardingModal({ carers, onClose, onCreate }: NewOnboardingModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Support Worker');
  const [carerId, setCarerId] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    if (!startDate) newErrors.startDate = 'Start date is required';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onCreate({ name, email, role, carerId: carerId || undefined, startDate });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-pale flex items-center justify-center">
              <UserPlus size={20} className="text-forest" />
            </div>
            <h3 className="text-lg font-semibold text-charcoal">Start Onboarding</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-sage-pale transition-colors">
            <X size={20} className="text-mid-gray" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Enter employee/contractor name"
            />
            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="Enter email address"
            />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input-field">
              <option value="Support Worker">Support Worker</option>
              <option value="Senior Support Worker">Senior Support Worker</option>
              <option value="Team Leader">Team Leader</option>
              <option value="Support Coordinator">Support Coordinator</option>
              <option value="Administration">Administration</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Link to Carer Profile (optional)
            </label>
            <select value={carerId} onChange={(e) => setCarerId(e.target.value)} className="input-field">
              <option value="">Select carer...</option>
              {carers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
            {errors.startDate && <p className="text-sm text-red-600 mt-1">{errors.startDate}</p>}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-sage-pale">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              <Plus size={16} />
              Start Onboarding
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
