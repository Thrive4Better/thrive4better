import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { formatDate, formatTime, formatCurrency, cn, getServiceTypeColor, generateId } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import AiSupportPlanGenerator from '@/components/ai/AiSupportPlanGenerator';
import {
  ArrowLeft, User, CreditCard, Target, Calendar, FileText, FolderOpen,
  Phone, Mail, MapPin, Shield, Heart, AlertTriangle, Stethoscope,
  Clock, Download, Upload, File, FileImage, FileSpreadsheet,
  Edit2, Save, X, ChevronRight, Trash2, Sparkles,
} from 'lucide-react';
import type { CarePlan, CarePlanGoal, AlliedHealthContact, Shift } from '@/types';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ── Tab types ───────────────────────────────────────────────────────────────

type TabId = 'overview' | 'care-plan' | 'shifts' | 'invoices' | 'documents';

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'care-plan', label: 'Care Plan', icon: Heart },
  { id: 'shifts', label: 'Shifts', icon: Calendar },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
];

// ── File type icon helper ───────────────────────────────────────────────────

function FileTypeIcon({ fileType }: { fileType: string }) {
  const type = fileType.toLowerCase();
  if (type.includes('image') || type.includes('png') || type.includes('jpg') || type.includes('jpeg')) {
    return <FileImage size={20} className="text-blue-500" />;
  }
  if (type.includes('spreadsheet') || type.includes('xlsx') || type.includes('csv')) {
    return <FileSpreadsheet size={20} className="text-green-600" />;
  }
  return <File size={20} className="text-mid-gray" />;
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ClientProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getClientById, getShiftsByClient, getInvoicesByClient,
    getCarePlanByClient, getDocumentsByClient,
    getCarerById, updateCarePlan, addDocument, deleteDocument,
  } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const _client = getClientById(id ?? '');
  // client is narrowed by the early-return guard below
  const client = _client!;
  const carePlan = getCarePlanByClient(id ?? '');
  const shifts = getShiftsByClient(id ?? '');
  const invoices = getInvoicesByClient(id ?? '');
  const documents = getDocumentsByClient(id ?? '');

  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabId | null;
    if (tab && TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Shifts filters
  const [shiftStatusFilter, setShiftStatusFilter] = useState<string>('All');
  const [shiftDateFrom, setShiftDateFrom] = useState('');
  const [shiftDateTo, setShiftDateTo] = useState('');

  // Care plan editing
  const [editingCarePlan, setEditingCarePlan] = useState(false);
  const [editedPlan, setEditedPlan] = useState<Partial<CarePlan>>({});
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  if (!_client) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/clients')} className="btn-ghost">
          <ArrowLeft size={16} /> Back to Clients
        </button>
        <EmptyState
          icon={User}
          title="Client not found"
          description="The client you are looking for does not exist or has been removed."
          action={{ label: 'Go to Clients', onClick: () => navigate('/clients') }}
        />
      </div>
    );
  }


  // ── Filtered shifts ───────────────────────────────────────────────────────

  const filteredShifts = useMemo(() => {
    let result = [...shifts];

    if (shiftStatusFilter !== 'All') {
      result = result.filter((s) => s.status === shiftStatusFilter);
    }

    if (shiftDateFrom && shiftDateTo) {
      const from = parseISO(shiftDateFrom);
      const to = parseISO(shiftDateTo);
      result = result.filter((s) => {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: from, end: to });
      });
    } else if (shiftDateFrom) {
      const from = parseISO(shiftDateFrom);
      result = result.filter((s) => parseISO(s.date) >= from);
    } else if (shiftDateTo) {
      const to = parseISO(shiftDateTo);
      result = result.filter((s) => parseISO(s.date) <= to);
    }

    return result.sort((a, b) => b.date.localeCompare(a.date));
  }, [shifts, shiftStatusFilter, shiftDateFrom, shiftDateTo]);

  // ── Budget helpers ────────────────────────────────────────────────────────

  const totalAllocated = client.supportCategories.reduce((s, c) => s + c.allocatedBudget, 0);
  const totalSpent = client.supportCategories.reduce((s, c) => s + c.spentAmount, 0);

  // ── Care plan edit handlers ───────────────────────────────────────────────

  function startEditingCarePlan() {
    if (!carePlan) return;
    setEditedPlan({
      supportNeedsSummary: carePlan.supportNeedsSummary,
      preferredRoutines: carePlan.preferredRoutines,
      likesAndPreferences: carePlan.likesAndPreferences,
      communicationNeeds: carePlan.communicationNeeds,
      riskNotes: carePlan.riskNotes,
      medicalInfo: carePlan.medicalInfo,
    });
    setEditingCarePlan(true);
  }

  function saveCarePlan() {
    if (!carePlan) return;
    updateCarePlan(carePlan.id, editedPlan);
    setEditingCarePlan(false);
  }

  function handleAiPlanApply(planData: {
    supportNeedsSummary: string;
    goals: { description: string; targetDate: string; rationale: string }[];
    preferredRoutines: string;
    riskNotes: string;
    communicationStrategies: string;
  }) {
    if (!carePlan) return;

    // Merge AI-generated goals into the existing care plan goals
    const newGoals: CarePlanGoal[] = planData.goals.map((g) => ({
      id: generateId(),
      description: g.description,
      targetDate: g.targetDate,
      status: 'Not Started' as const,
    }));

    updateCarePlan(carePlan.id, {
      supportNeedsSummary: planData.supportNeedsSummary,
      preferredRoutines: planData.preferredRoutines,
      riskNotes: planData.riskNotes,
      communicationNeeds: planData.communicationStrategies,
      goals: [...carePlan.goals, ...newGoals],
    });

    setShowAiGenerator(false);
  }

  function getCarerName(carerId: string): string {
    const carer = getCarerById(carerId);
    return carer ? `${carer.firstName} ${carer.lastName}` : 'Unassigned';
  }

  function getDayOfWeek(dateStr: string): string {
    try {
      return format(parseISO(dateStr), 'EEE');
    } catch {
      return '';
    }
  }

  function calculateDuration(shift: Shift): string {
    return `${shift.hours.toFixed(1)}h`;
  }

  // ── Tab renderers ─────────────────────────────────────────────────────────

  function renderOverview() {
    return (
      <div className="grid grid-cols-3 gap-6">
        {/* Personal Details */}
        <div className="card col-span-2">
          <h3 className="text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
            <User size={16} className="text-forest" /> Personal Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-mid-gray text-xs">Full Name</p>
              <p className="text-charcoal font-medium">{client.firstName} {client.lastName}</p>
            </div>
            <div>
              <p className="text-mid-gray text-xs">Date of Birth</p>
              <p className="text-charcoal">{formatDate(client.dateOfBirth)}</p>
            </div>
            <div>
              <p className="text-mid-gray text-xs">NDIS Number</p>
              <p className="text-charcoal font-mono">{client.ndisNumber}</p>
            </div>
            <div>
              <p className="text-mid-gray text-xs">Status</p>
              <StatusBadge status={client.status} />
            </div>
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-mid-gray mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-mid-gray text-xs">Address</p>
                <p className="text-charcoal">{client.address}, {client.suburb} {client.postcode}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone size={14} className="text-mid-gray mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-mid-gray text-xs">Phone</p>
                <p className="text-charcoal">{client.phone}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail size={14} className="text-mid-gray mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-mid-gray text-xs">Email</p>
                <p className="text-charcoal">{client.email}</p>
              </div>
            </div>
            <div>
              <p className="text-mid-gray text-xs">Preferred Communication</p>
              <p className="text-charcoal capitalize">{client.preferredCommunication}</p>
            </div>
            {client.emergencyContactName && (
              <>
                <div>
                  <p className="text-mid-gray text-xs">Emergency Contact</p>
                  <p className="text-charcoal">{client.emergencyContactName}</p>
                </div>
                <div>
                  <p className="text-mid-gray text-xs">Emergency Phone</p>
                  <p className="text-charcoal">{client.emergencyContactPhone}</p>
                </div>
              </>
            )}
          </div>
          {client.notes && (
            <div className="mt-4 pt-4 border-t border-sage-pale">
              <p className="text-mid-gray text-xs mb-1">Notes</p>
              <p className="text-sm text-charcoal">{client.notes}</p>
            </div>
          )}
        </div>

        {/* Funding Card */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
              <CreditCard size={16} className="text-forest" /> Funding Details
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-mid-gray text-xs">Funding Type</p>
                <span className="badge bg-sage-pale text-forest">{client.fundingType}</span>
              </div>
              <div>
                <p className="text-mid-gray text-xs">Plan Period</p>
                <p className="text-charcoal">{formatDate(client.planStartDate)} - {formatDate(client.planEndDate)}</p>
              </div>
              {client.planManagerName && (
                <div>
                  <p className="text-mid-gray text-xs">Plan Manager</p>
                  <p className="text-charcoal">{client.planManagerName}</p>
                  {client.planManagerEmail && (
                    <p className="text-xs text-mid-gray">{client.planManagerEmail}</p>
                  )}
                </div>
              )}
              {client.supportCoordinatorName && (
                <div>
                  <p className="text-mid-gray text-xs">Support Coordinator</p>
                  <p className="text-charcoal">{client.supportCoordinatorName}</p>
                  {client.supportCoordinatorContact && (
                    <p className="text-xs text-mid-gray">{client.supportCoordinatorContact}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Budget Summary */}
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Target size={16} className="text-forest" /> Budget Summary
            </h3>
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-mid-gray">Total Budget</span>
                <span className="font-semibold text-charcoal">{formatCurrency(totalAllocated)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-mid-gray">Total Spent</span>
                <span className="font-semibold text-charcoal">{formatCurrency(totalSpent)}</span>
              </div>
              <div className="w-full bg-sage-pale rounded-full h-2.5">
                <div
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    totalAllocated > 0 && (totalSpent / totalAllocated) > 0.9
                      ? 'bg-burgundy'
                      : 'bg-forest'
                  )}
                  style={{ width: `${totalAllocated > 0 ? Math.min((totalSpent / totalAllocated) * 100, 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-mid-gray mt-1">
                {totalAllocated > 0
                  ? `${((totalSpent / totalAllocated) * 100).toFixed(1)}% utilised`
                  : 'No budget allocated'}
              </p>
            </div>
          </div>
        </div>

        {/* Support Categories */}
        {client.supportCategories.length > 0 && (
          <div className="card col-span-3">
            <h3 className="text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Shield size={16} className="text-forest" /> Support Categories
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {client.supportCategories.map((cat) => {
                const pct = cat.allocatedBudget > 0 ? (cat.spentAmount / cat.allocatedBudget) * 100 : 0;
                return (
                  <div key={cat.categoryId} className="p-4 bg-sage-pale/30 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-charcoal">{cat.categoryName}</p>
                      <p className="text-xs text-mid-gray">{pct.toFixed(0)}%</p>
                    </div>
                    <div className="w-full bg-sage-pale rounded-full h-2 mb-2">
                      <div
                        className={cn(
                          'h-2 rounded-full transition-all',
                          pct > 90 ? 'bg-burgundy' : pct > 70 ? 'bg-amber-500' : 'bg-forest'
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-mid-gray">
                      <span>Spent: {formatCurrency(cat.spentAmount)}</span>
                      <span>Allocated: {formatCurrency(cat.allocatedBudget)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderCarePlan() {
    if (!carePlan) {
      return (
        <EmptyState
          icon={Heart}
          title="No care plan"
          description="This client does not have a care plan yet."
        />
      );
    }

    return (
      <div className="space-y-6">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-mid-gray">
            Last reviewed: {formatDate(carePlan.lastReviewedDate)} | Next review due: {formatDate(carePlan.nextReviewDueDate)}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAiGenerator(true)}
              className="btn-secondary"
            >
              <Sparkles size={16} /> Generate with AI
            </button>
            <button className="btn-secondary">
              <Download size={16} /> Export Care Plan PDF
            </button>
            {editingCarePlan ? (
              <>
                <button onClick={() => setEditingCarePlan(false)} className="btn-ghost">
                  <X size={16} /> Cancel
                </button>
                <button onClick={saveCarePlan} className="btn-primary">
                  <Save size={16} /> Save Changes
                </button>
              </>
            ) : (
              <button onClick={startEditingCarePlan} className="btn-secondary">
                <Edit2 size={16} /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Goals */}
        <div className="card">
          <h3 className="text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
            <Target size={16} className="text-forest" /> Goals
          </h3>
          {carePlan.goals.length === 0 ? (
            <p className="text-sm text-mid-gray">No goals defined</p>
          ) : (
            <div className="space-y-3">
              {carePlan.goals.map((goal: CarePlanGoal) => (
                <div key={goal.id} className="flex items-start gap-3 p-3 bg-sage-pale/30 rounded-xl">
                  <div className="flex-1">
                    <p className="text-sm text-charcoal">{goal.description}</p>
                    <p className="text-xs text-mid-gray mt-1">Target: {formatDate(goal.targetDate)}</p>
                  </div>
                  <StatusBadge status={goal.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Needs & Routines */}
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-3 flex items-center gap-2">
              <Shield size={16} className="text-forest" /> Support Needs
            </h3>
            {editingCarePlan ? (
              <textarea
                value={editedPlan.supportNeedsSummary ?? ''}
                onChange={(e) => setEditedPlan((p) => ({ ...p, supportNeedsSummary: e.target.value }))}
                rows={4}
                className="input-field w-full resize-none"
              />
            ) : (
              <p className="text-sm text-charcoal whitespace-pre-wrap">{carePlan.supportNeedsSummary || 'Not specified'}</p>
            )}
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-3 flex items-center gap-2">
              <Clock size={16} className="text-forest" /> Preferred Routines
            </h3>
            {editingCarePlan ? (
              <textarea
                value={editedPlan.preferredRoutines ?? ''}
                onChange={(e) => setEditedPlan((p) => ({ ...p, preferredRoutines: e.target.value }))}
                rows={4}
                className="input-field w-full resize-none"
              />
            ) : (
              <p className="text-sm text-charcoal whitespace-pre-wrap">{carePlan.preferredRoutines || 'Not specified'}</p>
            )}
          </div>
        </div>

        {/* Likes / Communication */}
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-3 flex items-center gap-2">
              <Heart size={16} className="text-forest" /> Likes & Preferences
            </h3>
            {editingCarePlan ? (
              <textarea
                value={editedPlan.likesAndPreferences ?? ''}
                onChange={(e) => setEditedPlan((p) => ({ ...p, likesAndPreferences: e.target.value }))}
                rows={4}
                className="input-field w-full resize-none"
              />
            ) : (
              <p className="text-sm text-charcoal whitespace-pre-wrap">{carePlan.likesAndPreferences || 'Not specified'}</p>
            )}
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-3 flex items-center gap-2">
              <Mail size={16} className="text-forest" /> Communication Needs
            </h3>
            {editingCarePlan ? (
              <textarea
                value={editedPlan.communicationNeeds ?? ''}
                onChange={(e) => setEditedPlan((p) => ({ ...p, communicationNeeds: e.target.value }))}
                rows={4}
                className="input-field w-full resize-none"
              />
            ) : (
              <p className="text-sm text-charcoal whitespace-pre-wrap">{carePlan.communicationNeeds || 'Not specified'}</p>
            )}
          </div>
        </div>

        {/* Risk Notes & Medical */}
        <div className="grid grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" /> Risk Notes
            </h3>
            {editingCarePlan ? (
              <textarea
                value={editedPlan.riskNotes ?? ''}
                onChange={(e) => setEditedPlan((p) => ({ ...p, riskNotes: e.target.value }))}
                rows={4}
                className="input-field w-full resize-none"
              />
            ) : (
              <p className="text-sm text-charcoal whitespace-pre-wrap">{carePlan.riskNotes || 'Not specified'}</p>
            )}
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-3 flex items-center gap-2">
              <Stethoscope size={16} className="text-forest" /> Medical Information
            </h3>
            {editingCarePlan ? (
              <textarea
                value={editedPlan.medicalInfo ?? ''}
                onChange={(e) => setEditedPlan((p) => ({ ...p, medicalInfo: e.target.value }))}
                rows={4}
                className="input-field w-full resize-none"
              />
            ) : (
              <p className="text-sm text-charcoal whitespace-pre-wrap">{carePlan.medicalInfo || 'Not specified'}</p>
            )}
          </div>
        </div>

        {/* Allied Health Contacts */}
        {carePlan.alliedHealthContacts.length > 0 && (
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Stethoscope size={16} className="text-forest" /> Allied Health Contacts
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sage-pale">
                    <th className="table-header">Name</th>
                    <th className="table-header">Role</th>
                    <th className="table-header">Phone</th>
                    <th className="table-header">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {carePlan.alliedHealthContacts.map((contact: AlliedHealthContact) => (
                    <tr key={contact.id} className="border-b border-sage-pale/50">
                      <td className="table-cell font-medium">{contact.name}</td>
                      <td className="table-cell">{contact.role}</td>
                      <td className="table-cell">{contact.phone}</td>
                      <td className="table-cell">{contact.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* AI Support Plan Generator */}
        {showAiGenerator && id && (
          <AiSupportPlanGenerator
            clientId={id}
            onClose={() => setShowAiGenerator(false)}
            onApply={handleAiPlanApply}
          />
        )}
      </div>
    );
  }

  function renderShifts() {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-xs font-medium text-mid-gray mb-1 block">From</label>
              <input
                type="date"
                value={shiftDateFrom}
                onChange={(e) => setShiftDateFrom(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-mid-gray mb-1 block">To</label>
              <input
                type="date"
                value={shiftDateTo}
                onChange={(e) => setShiftDateTo(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-mid-gray mb-1 block">Status</label>
              <select
                value={shiftStatusFilter}
                onChange={(e) => setShiftStatusFilter(e.target.value)}
                className="input-field"
              >
                <option value="All">All Statuses</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Confirmed">Confirmed</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
            {(shiftDateFrom || shiftDateTo || shiftStatusFilter !== 'All') && (
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setShiftDateFrom('');
                    setShiftDateTo('');
                    setShiftStatusFilter('All');
                  }}
                  className="btn-ghost text-sm"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        {filteredShifts.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No shifts found"
            description={shifts.length === 0
              ? 'No shifts have been scheduled for this client yet.'
              : 'No shifts match the current filters.'}
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sage-pale">
                    <th className="table-header">Date</th>
                    <th className="table-header">Day</th>
                    <th className="table-header">Start</th>
                    <th className="table-header">End</th>
                    <th className="table-header">Duration</th>
                    <th className="table-header">Carer</th>
                    <th className="table-header">Service Type</th>
                    <th className="table-header">Category</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShifts.map((shift) => (
                    <tr key={shift.id} className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors">
                      <td className="table-cell">{formatDate(shift.date)}</td>
                      <td className="table-cell">{getDayOfWeek(shift.date)}</td>
                      <td className="table-cell">{formatTime(shift.startTime)}</td>
                      <td className="table-cell">{formatTime(shift.endTime)}</td>
                      <td className="table-cell">{calculateDuration(shift)}</td>
                      <td className="table-cell font-medium">{getCarerName(shift.carerId)}</td>
                      <td className="table-cell">
                        <span className={cn('badge text-xs', getServiceTypeColor(shift.serviceType))}>
                          {shift.serviceType}
                        </span>
                      </td>
                      <td className="table-cell text-xs">{shift.supportCategory}</td>
                      <td className="table-cell"><StatusBadge status={shift.status} /></td>
                      <td className="table-cell text-xs text-mid-gray max-w-[160px] truncate" title={shift.notes}>
                        {shift.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-sage-pale text-sm text-mid-gray">
              {filteredShifts.length} shift{filteredShifts.length !== 1 ? 's' : ''} |{' '}
              {filteredShifts.reduce((sum, s) => sum + s.hours, 0).toFixed(1)} total hours |{' '}
              {formatCurrency(filteredShifts.reduce((sum, s) => sum + s.totalAmount, 0))} total value
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderInvoices() {
    if (invoices.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="No invoices"
          description="No invoices have been generated for this client yet."
        />
      );
    }

    const sortedInvoices = [...invoices].sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

    return (
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sage-pale">
                <th className="table-header">Invoice #</th>
                <th className="table-header">Period</th>
                <th className="table-header">Amount</th>
                <th className="table-header">Status</th>
                <th className="table-header">Due Date</th>
                <th className="table-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors">
                  <td className="table-cell font-medium font-mono">{invoice.invoiceNumber}</td>
                  <td className="table-cell">
                    {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                  </td>
                  <td className="table-cell font-medium">{formatCurrency(invoice.total)}</td>
                  <td className="table-cell"><StatusBadge status={invoice.status} /></td>
                  <td className="table-cell">{formatDate(invoice.dueDate)}</td>
                  <td className="table-cell">
                    <button
                      onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
                      className="text-forest hover:text-forest-mid text-sm font-medium flex items-center gap-1 transition-colors"
                    >
                      View <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-sage-pale text-sm text-mid-gray">
          {sortedInvoices.length} invoice{sortedInvoices.length !== 1 ? 's' : ''} |{' '}
          Total: {formatCurrency(sortedInvoices.reduce((sum, i) => sum + i.total, 0))}
        </div>
      </div>
    );
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const storagePath = `documents/${id}/${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, file);
        if (uploadError) throw uploadError;

        const sizeStr = file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(0)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
        const ext = file.name.split('.').pop()?.toUpperCase() || 'FILE';

        await addDocument({
          clientId: id,
          name: file.name,
          fileType: ext,
          uploadDate: new Date().toISOString(),
          size: sizeStr,
          storagePath,
        });
      }
      toast.success('Document(s) uploaded successfully');
    } catch (err) {
      toast.error(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownloadDoc(storagePath: string | undefined, name: string) {
    if (!storagePath) {
      toast.error('No file path available');
      return;
    }
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, 60);
    if (error || !data?.signedUrl) {
      toast.error('Failed to generate download link');
      return;
    }
    window.open(data.signedUrl, '_blank');
  }

  async function handleDeleteDoc(docId: string, storagePath: string | undefined) {
    if (storagePath) {
      await supabase.storage.from('documents').remove([storagePath]);
    }
    await deleteDocument(docId);
    toast.success('Document deleted');
  }

  function renderDocuments() {
    return (
      <div className="space-y-4">
        {/* Upload area */}
        <div className="card border-2 border-dashed border-sage-pale">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-full bg-sage-pale flex items-center justify-center mb-3">
              <Upload size={20} className="text-sage" />
            </div>
            <p className="text-sm font-medium text-charcoal mb-1">Upload Documents</p>
            <p className="text-xs text-mid-gray">Drag and drop files here, or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              className="btn-secondary mt-4 text-sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Uploading...
                </span>
              ) : (
                <><Upload size={14} /> Browse Files</>
              )}
            </button>
          </div>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No documents"
            description="No documents have been uploaded for this client yet."
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sage-pale">
                    <th className="table-header">Document</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Date Uploaded</th>
                    <th className="table-header">Size</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors">
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <FileTypeIcon fileType={doc.fileType} />
                          <span className="font-medium text-charcoal">{doc.name}</span>
                        </div>
                      </td>
                      <td className="table-cell text-xs uppercase text-mid-gray">{doc.fileType}</td>
                      <td className="table-cell">{formatDate(doc.uploadDate)}</td>
                      <td className="table-cell text-mid-gray">{doc.size}</td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDownloadDoc(doc.storagePath, doc.name)}
                            className="p-1.5 rounded hover:bg-sage-pale transition-colors text-forest"
                            title="Download"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(doc.id, doc.storagePath)}
                            className="p-1.5 rounded hover:bg-red-50 transition-colors text-burgundy"
                            title="Delete"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  const tabContent: Record<TabId, () => React.JSX.Element> = {
    overview: renderOverview,
    'care-plan': renderCarePlan,
    shifts: renderShifts,
    invoices: renderInvoices,
    documents: renderDocuments,
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back + heading */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clients')} className="btn-ghost p-2">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">
            {client.firstName} {client.lastName}
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-mid-gray font-mono">NDIS: {client.ndisNumber}</span>
            <StatusBadge status={client.status} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-sage-pale">
        <div className="flex gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px',
                  activeTab === tab.id
                    ? 'bg-white border border-sage-pale border-b-white text-forest'
                    : 'text-mid-gray hover:text-charcoal hover:bg-sage-pale/30'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {tabContent[activeTab]()}
    </div>
  );
}
