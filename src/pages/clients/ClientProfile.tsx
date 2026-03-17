import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { formatDate, formatTime, formatDateTime, formatCurrency, cn, getServiceTypeColor, generateId } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import AiSupportPlanGenerator, { generateSectionContent } from '@/components/ai/AiSupportPlanGenerator';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  ArrowLeft, User, CreditCard, Target, Calendar, FileText, FolderOpen,
  Phone, Mail, MapPin, Shield, Heart, AlertTriangle, Stethoscope,
  Clock, Download, Upload, File, FileImage, FileSpreadsheet,
  Edit2, Save, X, ChevronRight, Trash2, Sparkles, Plus,
  ChevronUp, ChevronDown, Loader2, FileCode, FileType, MessageSquare, Tag,
} from 'lucide-react';
import type { CarePlan, CarePlanGoal, AlliedHealthContact, Shift, CarePlanSection, CarePlanSectionType, ModularCarePlan, ShiftNote, ShiftNoteType, SessionNote, ParticipantMood } from '@/types';
import { format, parseISO, isWithinInterval, differenceInDays } from 'date-fns';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import CarePlanPdf from './CarePlanPdf';
import { downloadXml, downloadDocx } from '@/lib/care-plan-export';

// ── Section type config ──

const SECTION_TYPE_OPTIONS: { value: CarePlanSectionType; label: string }[] = [
  { value: 'participant_details', label: 'Participant Details' },
  { value: 'plan_overview', label: 'Plan Overview' },
  { value: 'support_needs', label: 'Support Needs' },
  { value: 'goals_and_outcomes', label: 'Goals & Outcomes' },
  { value: 'short_term_goals', label: 'Short-Term Goals (0-12 months)' },
  { value: 'long_term_goals', label: 'Long-Term Goals (12+ months)' },
  { value: 'core_supports', label: 'Core Supports' },
  { value: 'capacity_building_supports', label: 'Capacity Building Supports' },
  { value: 'capital_supports', label: 'Capital Supports' },
  { value: 'risk_assessment', label: 'Risk Assessment' },
  { value: 'communication_plan', label: 'Communication Plan' },
  { value: 'daily_routine', label: 'Daily Routine' },
  { value: 'medication_management', label: 'Medication Management' },
  { value: 'behaviour_support', label: 'Behaviour Support' },
  { value: 'cultural_considerations', label: 'Cultural Considerations' },
  { value: 'carer_contacts', label: 'Carer & Key Contacts' },
  { value: 'emergency_contacts', label: 'Emergency Contacts' },
  { value: 'review_schedule', label: 'Review Schedule' },
  { value: 'sign_off', label: 'Review & Sign-Off' },
  { value: 'custom', label: 'Custom Section' },
];

function getSectionTitle(type: CarePlanSectionType): string {
  return SECTION_TYPE_OPTIONS.find((o) => o.value === type)?.label || 'Custom Section';
}

function getDefaultSectionContent(type: CarePlanSectionType): string {
  const defaults: Partial<Record<CarePlanSectionType, string>> = {
    participant_details: 'Enter participant details including relevant background information, preferences, and important contacts.',
    plan_overview: 'Provide an overview of this care plan including its purpose, scope, and key objectives.',
    support_needs: 'Describe the participant\'s support needs, including daily living, community access, and any specialist support requirements.',
    goals_and_outcomes: 'List the participant\'s goals and desired outcomes. Include measurable targets and timeframes.',
    risk_assessment: 'Document identified risks, their likelihood and impact, and the mitigation strategies in place.',
    communication_plan: 'Describe the participant\'s communication preferences, needs, and strategies for effective communication.',
    daily_routine: 'Outline the participant\'s preferred daily routine, including morning, afternoon, and evening activities.',
    medication_management: 'Document current medications, dosages, administration schedules, and any special instructions.',
    behaviour_support: 'Describe any behaviour support strategies, triggers, de-escalation techniques, and positive behaviour support plans.',
    cultural_considerations: 'Document cultural, religious, or spiritual considerations important to the participant\'s care.',
    emergency_contacts: 'List emergency contacts, their relationship to the participant, and contact details.',
    review_schedule: 'Outline the schedule for care plan reviews, including dates and responsible parties.',
    short_term_goals: 'List short-term goals (0-12 months) with strategies/actions and target dates.',
    long_term_goals: 'List long-term goals (12+ months) with strategies/actions and target dates.',
    core_supports: 'List core support items including provider, frequency, and budget allocated.',
    capacity_building_supports: 'List capacity building support items including provider, frequency, and budget allocated.',
    capital_supports: 'List capital support items including provider, frequency, and budget allocated.',
    carer_contacts: 'List carer and key contacts including name, relationship, phone, and email.',
    sign_off: 'Review and sign-off section. Include date of review, participant acknowledgement, and representative sign-off.',
  };
  return defaults[type] || '';
}

// ── Tab types ───────────────────────────────────────────────────────────────

type TabId = 'overview' | 'care-plan' | 'shifts' | 'session-notes' | 'invoices' | 'documents' | 'reviews';

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'care-plan', label: 'Care Plan', icon: Heart },
  { id: 'shifts', label: 'Shifts', icon: Calendar },
  { id: 'session-notes', label: 'Session Notes', icon: MessageSquare },
  { id: 'invoices', label: 'Invoices', icon: FileText },
  { id: 'documents', label: 'Documents', icon: FolderOpen },
  { id: 'reviews', label: 'Reviews', icon: Target },
];

// ── Mood config ──
const MOOD_OPTIONS: { value: ParticipantMood; label: string; emoji: string; color: string }[] = [
  { value: 'great', label: 'Great', emoji: '😊', color: 'bg-green-100 text-green-700' },
  { value: 'good', label: 'Good', emoji: '🙂', color: 'bg-blue-100 text-blue-700' },
  { value: 'neutral', label: 'Neutral', emoji: '😐', color: 'bg-gray-100 text-gray-700' },
  { value: 'low', label: 'Low', emoji: '😔', color: 'bg-amber-100 text-amber-700' },
  { value: 'distressed', label: 'Distressed', emoji: '😰', color: 'bg-red-100 text-red-700' },
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
    getCarerById, updateCarePlan, updateClient, addDocument, deleteDocument,
    getReviewsByClient, activityReviews,
    getShiftNotesByClient, shiftNotes: allShiftNotes,
    getSessionNotesByClient, addSessionNote, deleteSessionNote, carers,
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

  // Care plan editing (legacy)
  const [editingCarePlan, setEditingCarePlan] = useState(false);
  const [editedPlan, setEditedPlan] = useState<Partial<CarePlan>>({});
  const [showAiGenerator, setShowAiGenerator] = useState(false);

  // Modular sections state
  const [sections, setSections] = useState<CarePlanSection[]>([]);
  const [sectionsInitialized, setSectionsInitialized] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Initialize sections from care plan or localStorage
  useEffect(() => {
    if (!carePlan || sectionsInitialized) return;

    // Try loading from localStorage first
    const stored = localStorage.getItem(`care-plan-sections-${carePlan.id}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as CarePlanSection[];
        setSections(parsed);
        setSectionsInitialized(true);
        return;
      } catch {
        // Ignore parse errors, fall through to migration
      }
    }

    // Migrate existing care plan data into sections
    const migrated: CarePlanSection[] = [];
    let order = 0;
    const now = carePlan.updatedAt || new Date().toISOString();

    if (carePlan.supportNeedsSummary) {
      migrated.push({
        id: generateId(), type: 'support_needs', title: 'Support Needs',
        content: carePlan.supportNeedsSummary, order: order++, lastUpdated: now, generatedByAi: false,
      });
    }
    if (carePlan.goals.length > 0) {
      const goalsContent = carePlan.goals.map((g: CarePlanGoal) =>
        `- ${g.description} (Target: ${formatDate(g.targetDate)}, Status: ${g.status})`
      ).join('\n');
      migrated.push({
        id: generateId(), type: 'goals_and_outcomes', title: 'Goals & Outcomes',
        content: goalsContent, order: order++, lastUpdated: now, generatedByAi: false,
      });
    }
    if (carePlan.preferredRoutines) {
      migrated.push({
        id: generateId(), type: 'daily_routine', title: 'Daily Routine',
        content: carePlan.preferredRoutines, order: order++, lastUpdated: now, generatedByAi: false,
      });
    }
    if (carePlan.communicationNeeds) {
      migrated.push({
        id: generateId(), type: 'communication_plan', title: 'Communication Plan',
        content: carePlan.communicationNeeds, order: order++, lastUpdated: now, generatedByAi: false,
      });
    }
    if (carePlan.riskNotes) {
      migrated.push({
        id: generateId(), type: 'risk_assessment', title: 'Risk Assessment',
        content: carePlan.riskNotes, order: order++, lastUpdated: now, generatedByAi: false,
      });
    }
    if (carePlan.medicalInfo) {
      migrated.push({
        id: generateId(), type: 'medication_management', title: 'Medication Management',
        content: carePlan.medicalInfo, order: order++, lastUpdated: now, generatedByAi: false,
      });
    }

    // If no existing data, add some default sections
    if (migrated.length === 0) {
      const defaultTypes: CarePlanSectionType[] = [
        'participant_details', 'plan_overview', 'support_needs',
        'goals_and_outcomes', 'risk_assessment', 'communication_plan', 'daily_routine',
      ];
      defaultTypes.forEach((type) => {
        migrated.push({
          id: generateId(), type, title: getSectionTitle(type),
          content: getDefaultSectionContent(type), order: order++,
          lastUpdated: now, generatedByAi: false,
        });
      });
    }

    setSections(migrated);
    setSectionsInitialized(true);
  }, [carePlan, sectionsInitialized]);

  // Save sections to localStorage on change
  useEffect(() => {
    if (!carePlan || !sectionsInitialized || sections.length === 0) return;
    localStorage.setItem(`care-plan-sections-${carePlan.id}`, JSON.stringify(sections));
  }, [sections, carePlan, sectionsInitialized]);

  // Close export menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportMenu]);

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

  // Plan period tracking
  const planStart = client.planStartDate ? parseISO(client.planStartDate) : null;
  const planEnd = client.planEndDate ? parseISO(client.planEndDate) : null;
  const planTotalDays = planStart && planEnd ? differenceInDays(planEnd, planStart) : 0;
  const planElapsedDays = planStart ? differenceInDays(new Date(), planStart) : 0;
  const planElapsedPct = planTotalDays > 0 ? Math.min(Math.max((planElapsedDays / planTotalDays) * 100, 0), 100) : 0;
  const budgetUsedPct = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  const planDaysRemaining = planEnd ? differenceInDays(planEnd, new Date()) : null;

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
              {client.nominatedContactName && (
                <div>
                  <p className="text-mid-gray text-xs">Nominated Contact (SMS)</p>
                  <p className="text-charcoal">{client.nominatedContactName}</p>
                  {client.nominatedContactRelation && (
                    <p className="text-xs text-mid-gray">{client.nominatedContactRelation}</p>
                  )}
                  {client.nominatedContactPhone && (
                    <p className="text-xs text-mid-gray">{client.nominatedContactPhone}</p>
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
              {/* Budget utilisation bar */}
              <div className="w-full bg-sage-pale rounded-full h-2.5">
                <div
                  className={cn(
                    'h-2.5 rounded-full transition-all',
                    totalAllocated > 0 && (totalSpent / totalAllocated) > 0.9
                      ? 'bg-burgundy'
                      : 'bg-forest'
                  )}
                  style={{ width: `${totalAllocated > 0 ? Math.min(budgetUsedPct, 100) : 0}%` }}
                />
              </div>
              <p className="text-xs text-mid-gray mt-1">
                {totalAllocated > 0
                  ? `${budgetUsedPct.toFixed(1)}% utilised`
                  : 'No budget allocated'}
              </p>
            </div>

            {/* Plan Period Tracking */}
            {planStart && planEnd && (
              <div className="border-t border-sage-pale pt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-mid-gray">Plan Period</span>
                  <span className="font-medium text-charcoal text-xs">
                    {format(planStart, 'dd MMM yyyy')} &ndash; {format(planEnd, 'dd MMM yyyy')}
                  </span>
                </div>
                {/* Plan period elapsed bar */}
                <div className="w-full bg-sage-pale rounded-full h-2.5 mt-2">
                  <div
                    className="h-2.5 rounded-full transition-all bg-sky-500"
                    style={{ width: `${planElapsedPct}%` }}
                  />
                </div>
                <p className="text-xs text-mid-gray mt-1">
                  {planElapsedPct.toFixed(1)}% of plan period elapsed
                  {planDaysRemaining !== null && planDaysRemaining > 0 && (
                    <> &middot; {planDaysRemaining} days remaining</>
                  )}
                  {planDaysRemaining !== null && planDaysRemaining <= 0 && (
                    <> &middot; Plan period ended</>
                  )}
                </p>

                {/* Spending vs Time comparison */}
                {totalAllocated > 0 && (
                  <div className={cn(
                    'mt-3 p-2.5 rounded-lg text-xs font-medium flex items-center gap-2',
                    budgetUsedPct > planElapsedPct + 10
                      ? 'bg-burgundy/10 text-burgundy'
                      : budgetUsedPct < planElapsedPct - 10
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-forest/10 text-forest'
                  )}>
                    {budgetUsedPct > planElapsedPct + 10 ? (
                      <AlertTriangle size={14} />
                    ) : (
                      <Clock size={14} />
                    )}
                    <span>
                      {budgetUsedPct.toFixed(1)}% budget used | {planElapsedPct.toFixed(1)}% of plan elapsed
                      {budgetUsedPct > planElapsedPct + 10
                        ? ' — Spending ahead of schedule'
                        : budgetUsedPct < planElapsedPct - 10
                          ? ' — Under-utilising budget'
                          : ' — Spending on track'}
                    </span>
                  </div>
                )}
              </div>
            )}
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

        {/* Interests & Preferences */}
        <InterestsSection client={client} carePlan={carePlan} updateClient={updateClient} />
      </div>
    );
  }

  // ── Modular section handlers ──

  function addSection(type: CarePlanSectionType) {
    const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order)) : -1;
    const newSection: CarePlanSection = {
      id: generateId(),
      type,
      title: type === 'custom' ? 'Custom Section' : getSectionTitle(type),
      content: getDefaultSectionContent(type),
      order: maxOrder + 1,
      lastUpdated: new Date().toISOString(),
      generatedByAi: false,
    };
    setSections((prev) => [...prev, newSection]);
    setShowAddSection(false);
  }

  function updateSectionContent(sectionId: string, content: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, content, lastUpdated: new Date().toISOString() }
          : s,
      ),
    );
  }

  function updateSectionTitle(sectionId: string, title: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, title, customTitle: title } : s,
      ),
    );
  }

  function deleteSection(sectionId: string) {
    setSections((prev) => {
      const filtered = prev.filter((s) => s.id !== sectionId);
      return filtered.map((s, i) => ({ ...s, order: i }));
    });
    setDeletingSectionId(null);
  }

  function moveSection(sectionId: string, direction: 'up' | 'down') {
    setSections((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((s) => s.id === sectionId);
      if (idx < 0) return prev;
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const temp = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[swapIdx].order };
      sorted[swapIdx] = { ...sorted[swapIdx], order: temp };
      return sorted;
    });
  }

  function toggleCollapse(sectionId: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }

  async function handleGenerateSection(sectionId: string) {
    if (!id) return;
    setGeneratingSection(sectionId);
    try {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;

      // Build context from other sections
      const otherSections = sections
        .filter((s) => s.id !== sectionId && s.content.length > 20)
        .sort((a, b) => a.order - b.order)
        .map((s) => `${s.title}: ${s.content.substring(0, 200)}`)
        .join('\n');

      const content = await generateSectionContent(id, section.type, otherSections || undefined);
      setSections((prev) =>
        prev.map((s) =>
          s.id === sectionId
            ? { ...s, content, lastUpdated: new Date().toISOString(), generatedByAi: true }
            : s,
        ),
      );
      toast.success(`Generated ${section.title}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setGeneratingSection(null);
    }
  }

  function getModularPlan(): ModularCarePlan {
    return {
      ...(carePlan as CarePlan),
      sections: [...sections].sort((a, b) => a.order - b.order),
      templateVersion: '1.0',
      lastExported: new Date().toISOString(),
    };
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const modularPlan = getModularPlan();
      const blob = await pdf(<CarePlanPdf plan={modularPlan} client={client} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `care-plan-${client.firstName}-${client.lastName}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error('Failed to generate PDF');
      console.error(err);
    } finally {
      setExportingPdf(false);
    }
  }

  function handleExportXml() {
    downloadXml(getModularPlan(), client);
  }

  function handleExportDocx() {
    downloadDocx(getModularPlan(), client);
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

    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    return (
      <div className="space-y-6">
        {/* Actions bar */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-mid-gray">
            Last reviewed: {formatDate(carePlan.lastReviewedDate)} | Next review due: {formatDate(carePlan.nextReviewDueDate)}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowAiGenerator(true)}
              className="btn-secondary text-sm"
            >
              <Sparkles size={14} /> Generate Full Plan
            </button>

            {/* Export dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                onClick={() => setShowExportMenu((prev) => !prev)}
                className="btn-secondary text-sm"
              >
                <Download size={14} /> Export
              </button>
              {showExportMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-sage-pale rounded-xl shadow-lg py-1 z-20 min-w-[180px]">
                  <button
                    onClick={() => { handleExportPdf(); setShowExportMenu(false); }}
                    disabled={exportingPdf}
                    className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-sage-pale/30 flex items-center gap-2 transition-colors"
                  >
                    <FileText size={14} className="text-burgundy" />
                    {exportingPdf ? 'Generating...' : 'Export PDF'}
                  </button>
                  <button
                    onClick={() => { handleExportDocx(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-sage-pale/30 flex items-center gap-2 transition-colors"
                  >
                    <FileType size={14} className="text-blue-600" />
                    Export Word (.docx)
                  </button>
                  <button
                    onClick={() => { handleExportXml(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-charcoal hover:bg-sage-pale/30 flex items-center gap-2 transition-colors"
                  >
                    <FileCode size={14} className="text-forest" />
                    Export XML
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modular Sections */}
        <div className="space-y-4">
          {sortedSections.map((section, idx) => {
            const isCollapsed = collapsedSections.has(section.id);
            const isGenerating = generatingSection === section.id;

            return (
              <div
                key={section.id}
                className="card border border-sage-pale/60 hover:border-sage transition-colors"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => toggleCollapse(section.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <ChevronRight
                      size={16}
                      className={cn(
                        'text-mid-gray transition-transform',
                        !isCollapsed && 'rotate-90',
                      )}
                    />
                    <div className="flex-1">
                      {section.type === 'custom' ? (
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateSectionTitle(section.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm font-semibold text-charcoal bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-sage rounded px-1 -ml-1 w-full"
                        />
                      ) : (
                        <h3 className="text-sm font-semibold text-charcoal">
                          {section.title}
                        </h3>
                      )}
                      <p className="text-xs text-mid-gray mt-0.5">
                        Updated {formatDate(section.lastUpdated)}
                        {section.generatedByAi && (
                          <span className="ml-2 text-xs text-forest">
                            <Sparkles size={10} className="inline mr-0.5" />AI generated
                          </span>
                        )}
                      </p>
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Generate with AI */}
                    <button
                      onClick={() => handleGenerateSection(section.id)}
                      disabled={isGenerating}
                      className="p-1.5 rounded-lg hover:bg-sage-pale text-mid-gray hover:text-forest transition-colors"
                      title="Generate with AI"
                    >
                      {isGenerating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Sparkles size={14} />
                      )}
                    </button>
                    {/* Move up */}
                    <button
                      onClick={() => moveSection(section.id, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg hover:bg-sage-pale text-mid-gray hover:text-charcoal transition-colors disabled:opacity-30"
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    {/* Move down */}
                    <button
                      onClick={() => moveSection(section.id, 'down')}
                      disabled={idx === sortedSections.length - 1}
                      className="p-1.5 rounded-lg hover:bg-sage-pale text-mid-gray hover:text-charcoal transition-colors disabled:opacity-30"
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => setDeletingSectionId(section.id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-mid-gray hover:text-burgundy transition-colors"
                      title="Delete section"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Section Content */}
                {!isCollapsed && (
                  <div className="mt-4">
                    <textarea
                      value={section.content}
                      onChange={(e) => updateSectionContent(section.id, e.target.value)}
                      rows={6}
                      className="input-field w-full resize-y text-sm"
                      placeholder={`Enter ${section.title.toLowerCase()} content...`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Section */}
        <div className="relative">
          <button
            onClick={() => setShowAddSection(!showAddSection)}
            className="btn-secondary w-full flex items-center justify-center gap-2 border-2 border-dashed border-sage-pale hover:border-sage"
          >
            <Plus size={16} /> Add Section
          </button>
          {showAddSection && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-sage-pale rounded-xl shadow-lg p-3 z-20 grid grid-cols-2 md:grid-cols-3 gap-2">
              {SECTION_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => addSection(opt.value)}
                  className="text-left px-3 py-2 rounded-lg text-sm text-charcoal hover:bg-sage-pale/40 transition-colors"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Allied Health Contacts (kept from legacy) */}
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

        {/* Delete section confirmation */}
        <ConfirmModal
          open={!!deletingSectionId}
          onClose={() => setDeletingSectionId(null)}
          onConfirm={() => deletingSectionId && deleteSection(deletingSectionId)}
          title="Delete Section"
          message="Are you sure you want to delete this section? This action cannot be undone."
        />

        {/* AI Support Plan Generator (legacy full plan) */}
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
                      onClick={() => navigate(`/invoices/${invoice.id}/edit`, { state: { from: `/clients/${id}?tab=invoices` } })}
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

  // ── Reviews tab ──

  function renderReviews() {
    const reviews = getReviewsByClient(id ?? '');
    const MOOD_LABELS: Record<string, { label: string; emoji: string }> = {
      great: { label: 'Great', emoji: '\uD83D\uDE01' },
      good: { label: 'Good', emoji: '\uD83D\uDE0A' },
      okay: { label: 'Okay', emoji: '\uD83D\uDE10' },
      not_great: { label: 'Not Great', emoji: '\uD83D\uDE1F' },
      bad: { label: 'Bad', emoji: '\uD83D\uDE1E' },
    };

    const avgActivity = reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.activityRating, 0) / reviews.length).toFixed(1)
      : '-';
    const avgCarer = reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.carerRating, 0) / reviews.length).toFixed(1)
      : '-';

    const moodCounts = reviews.reduce((acc, r) => {
      acc[r.mood] = (acc[r.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

    return (
      <div className="space-y-6">
        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-mid-gray uppercase tracking-wider">Total Reviews</p>
            <p className="text-2xl font-bold text-charcoal mt-1">{reviews.length}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-mid-gray uppercase tracking-wider">Avg Activity Rating</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{avgActivity}/5</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-mid-gray uppercase tracking-wider">Avg Carer Rating</p>
            <p className="text-2xl font-bold text-forest mt-1">{avgCarer}/5</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-mid-gray uppercase tracking-wider">Most Common Mood</p>
            <p className="text-2xl font-bold text-charcoal mt-1">
              {topMood ? `${MOOD_LABELS[topMood[0]]?.emoji || ''} ${MOOD_LABELS[topMood[0]]?.label || topMood[0]}` : '-'}
            </p>
          </div>
        </div>

        {/* Reviews list */}
        {reviews.length === 0 ? (
          <EmptyState icon={Target} title="No reviews yet" description="Client reviews will appear here once submitted." />
        ) : (
          <div className="space-y-3">
            {reviews
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((review) => {
                const shift = shifts.find((s) => s.id === review.shiftId);
                const carer = getCarerById(review.carerId);
                const moodInfo = MOOD_LABELS[review.mood] || { label: review.mood, emoji: '' };
                return (
                  <div key={review.id} className="card p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-charcoal">
                            {shift?.serviceType || 'Activity'}
                          </span>
                          <span className="text-xs text-mid-gray">
                            {review.createdAt ? formatDate(review.createdAt) : ''}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-sage-pale text-forest">
                            {moodInfo.emoji} {moodInfo.label}
                          </span>
                        </div>
                        <p className="text-xs text-mid-gray mt-0.5">
                          Carer: {carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown'}
                        </p>
                      </div>
                      <div className="flex gap-4 text-right">
                        <div>
                          <p className="text-xs text-mid-gray">Activity</p>
                          <p className="text-sm font-semibold text-amber-600">{review.activityRating}/5</p>
                        </div>
                        <div>
                          <p className="text-xs text-mid-gray">Carer</p>
                          <p className="text-sm font-semibold text-forest">{review.carerRating}/5</p>
                        </div>
                      </div>
                    </div>
                    {review.activityFeedback && (
                      <p className="text-sm text-charcoal mt-2 bg-sage-pale/20 rounded-lg p-2">
                        <span className="text-xs font-medium text-mid-gray">Activity: </span>
                        {review.activityFeedback}
                      </p>
                    )}
                    {review.carerFeedback && (
                      <p className="text-sm text-charcoal mt-1 bg-sage-pale/20 rounded-lg p-2">
                        <span className="text-xs font-medium text-mid-gray">Carer: </span>
                        {review.carerFeedback}
                      </p>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  // ── Session Notes tab ──

  const [showSessionNoteForm, setShowSessionNoteForm] = useState(false);
  const [sessionNoteForm, setSessionNoteForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    supportWorker: '',
    startTime: '',
    finishTime: '',
    activityCompleted: '',
    participantMood: 'neutral' as ParticipantMood,
    supportProvided: '',
    incidentsOrConcerns: '',
    transportKms: 0,
    additionalObservations: '',
    shiftId: '',
    invoiceId: '',
  });
  const [savingSessionNote, setSavingSessionNote] = useState(false);

  function resetSessionNoteForm() {
    setSessionNoteForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      supportWorker: '',
      startTime: '',
      finishTime: '',
      activityCompleted: '',
      participantMood: 'neutral',
      supportProvided: '',
      incidentsOrConcerns: '',
      transportKms: 0,
      additionalObservations: '',
      shiftId: '',
      invoiceId: '',
    });
  }

  async function handleSaveSessionNote() {
    if (!sessionNoteForm.date || !sessionNoteForm.supportWorker) {
      toast.error('Date and Support Worker are required');
      return;
    }
    setSavingSessionNote(true);
    try {
      // Build content from the structured fields for backward compat
      const contentParts = [
        sessionNoteForm.activityCompleted && `Activity: ${sessionNoteForm.activityCompleted}`,
        sessionNoteForm.supportProvided && `Support Provided: ${sessionNoteForm.supportProvided}`,
        sessionNoteForm.incidentsOrConcerns && `Incidents/Concerns: ${sessionNoteForm.incidentsOrConcerns}`,
        sessionNoteForm.additionalObservations && `Observations: ${sessionNoteForm.additionalObservations}`,
      ].filter(Boolean).join('\n\n');

      await addSessionNote({
        clientId: id ?? '',
        carerId: sessionNoteForm.shiftId ? (shifts.find(s => s.id === sessionNoteForm.shiftId)?.carerId ?? '') : '',
        shiftId: sessionNoteForm.shiftId || '',
        date: sessionNoteForm.date,
        supportWorker: sessionNoteForm.supportWorker,
        startTime: sessionNoteForm.startTime,
        finishTime: sessionNoteForm.finishTime,
        activityCompleted: sessionNoteForm.activityCompleted,
        content: contentParts || sessionNoteForm.activityCompleted,
        participantMood: sessionNoteForm.participantMood,
        supportProvided: sessionNoteForm.supportProvided,
        incidentsOrConcerns: sessionNoteForm.incidentsOrConcerns,
        transportKms: sessionNoteForm.transportKms,
        additionalObservations: sessionNoteForm.additionalObservations,
        goalsAddressed: [],
        followUpRequired: !!sessionNoteForm.incidentsOrConcerns,
        followUpNotes: sessionNoteForm.incidentsOrConcerns || '',
        invoiceId: sessionNoteForm.invoiceId || undefined,
      });
      toast.success('Session note saved');
      resetSessionNoteForm();
      setShowSessionNoteForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save session note');
    } finally {
      setSavingSessionNote(false);
    }
  }

  function generateAiSummary(notes: SessionNote[]): string {
    if (notes.length === 0) return '';
    const recent = notes.slice(0, 10); // last 10 notes
    const moodCounts: Record<string, number> = {};
    let totalKms = 0;
    let incidentCount = 0;
    const activities = new Set<string>();
    const workers = new Set<string>();

    recent.forEach((n) => {
      moodCounts[n.participantMood] = (moodCounts[n.participantMood] || 0) + 1;
      totalKms += n.transportKms || 0;
      if (n.incidentsOrConcerns?.trim()) incidentCount++;
      if (n.activityCompleted?.trim()) activities.add(n.activityCompleted.trim().split(/[,.;]/)[0].trim());
      if (n.supportWorker?.trim()) workers.add(n.supportWorker.trim());
    });

    const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];
    const moodLabel = dominantMood ? MOOD_OPTIONS.find(m => m.value === dominantMood[0])?.label || dominantMood[0] : 'N/A';

    const parts: string[] = [];
    parts.push(`${recent.length} session${recent.length !== 1 ? 's' : ''} recorded${notes.length > 10 ? ` (${notes.length} total)` : ''}.`);
    parts.push(`Predominant mood: ${moodLabel}.`);
    if (activities.size > 0) parts.push(`Activities include: ${[...activities].slice(0, 5).join(', ')}.`);
    if (workers.size > 0) parts.push(`Support workers: ${[...workers].slice(0, 4).join(', ')}.`);
    if (totalKms > 0) parts.push(`Total transport: ${totalKms} km.`);
    if (incidentCount > 0) parts.push(`${incidentCount} session${incidentCount !== 1 ? 's' : ''} had incidents or concerns flagged.`);
    if (incidentCount === 0) parts.push('No incidents or concerns reported.');

    return parts.join(' ');
  }

  function renderSessionNotes() {
    const clientSessionNotes = getSessionNotesByClient(id ?? '');
    const sortedNotes = [...clientSessionNotes].sort((a, b) =>
      (b.date || b.createdAt).localeCompare(a.date || a.createdAt)
    );
    const aiSummary = generateAiSummary(sortedNotes);

    return (
      <div className="space-y-4">
        {/* AI Summary */}
        {sortedNotes.length > 0 && (
          <div className="card p-4 bg-gradient-to-r from-forest/5 to-sage-pale/30 border-forest/20">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={16} className="text-forest" />
              <h3 className="text-sm font-semibold text-forest">AI Session Summary</h3>
            </div>
            <p className="text-sm text-charcoal leading-relaxed">{aiSummary}</p>
          </div>
        )}

        {/* Header with add button */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-mid-gray">
            {sortedNotes.length} session note{sortedNotes.length !== 1 ? 's' : ''} for this participant
          </p>
          <button
            onClick={() => setShowSessionNoteForm(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Add Session Note
          </button>
        </div>

        {/* Add Session Note Form Modal */}
        {showSessionNoteForm && (
          <div className="card p-5 border-2 border-forest/30 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-charcoal">New Session Note</h3>
              <button onClick={() => { setShowSessionNoteForm(false); resetSessionNoteForm(); }} className="btn-ghost p-1">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Date *</label>
                <input
                  type="date"
                  value={sessionNoteForm.date}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, date: e.target.value })}
                  className="input-field w-full"
                />
              </div>

              {/* Support Worker */}
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Support Worker *</label>
                <select
                  value={sessionNoteForm.supportWorker}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, supportWorker: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">Select support worker...</option>
                  {carers.filter(c => c.status === 'Active').map((c) => (
                    <option key={c.id} value={`${c.firstName} ${c.lastName}`}>
                      {c.firstName} {c.lastName}
                    </option>
                  ))}
                  <option value="__other">Other (type below)</option>
                </select>
                {sessionNoteForm.supportWorker === '__other' && (
                  <input
                    type="text"
                    placeholder="Enter worker name..."
                    className="input-field w-full mt-1"
                    onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, supportWorker: e.target.value })}
                  />
                )}
              </div>

              {/* Start Time */}
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Start Time</label>
                <input
                  type="time"
                  value={sessionNoteForm.startTime}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, startTime: e.target.value })}
                  className="input-field w-full"
                />
              </div>

              {/* Finish Time */}
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Finish Time</label>
                <input
                  type="time"
                  value={sessionNoteForm.finishTime}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, finishTime: e.target.value })}
                  className="input-field w-full"
                />
              </div>

              {/* Activity Completed */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-charcoal mb-1">Activity Completed</label>
                <textarea
                  value={sessionNoteForm.activityCompleted}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, activityCompleted: e.target.value })}
                  className="input-field w-full"
                  rows={2}
                  placeholder="Describe the activity completed during this session..."
                />
              </div>

              {/* Participant Mood / Behaviour */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-charcoal mb-1">Participant Mood / Behaviour</label>
                <div className="flex flex-wrap gap-2">
                  {MOOD_OPTIONS.map((mood) => (
                    <button
                      key={mood.value}
                      type="button"
                      onClick={() => setSessionNoteForm({ ...sessionNoteForm, participantMood: mood.value })}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        sessionNoteForm.participantMood === mood.value
                          ? `${mood.color} border-current ring-2 ring-current/20`
                          : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                      )}
                    >
                      {mood.emoji} {mood.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Support Provided */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-charcoal mb-1">Support Provided</label>
                <textarea
                  value={sessionNoteForm.supportProvided}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, supportProvided: e.target.value })}
                  className="input-field w-full"
                  rows={2}
                  placeholder="Describe the support provided to the participant..."
                />
              </div>

              {/* Incidents or Concerns */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-charcoal mb-1">Any Incidents or Concerns</label>
                <textarea
                  value={sessionNoteForm.incidentsOrConcerns}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, incidentsOrConcerns: e.target.value })}
                  className="input-field w-full"
                  rows={2}
                  placeholder="Record any incidents or concerns (leave blank if none)..."
                />
              </div>

              {/* Transport Kms */}
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Transport KMs</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={sessionNoteForm.transportKms || ''}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, transportKms: parseFloat(e.target.value) || 0 })}
                  className="input-field w-full"
                  placeholder="0"
                />
              </div>

              {/* Link to Shift */}
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Link to Shift (optional)</label>
                <select
                  value={sessionNoteForm.shiftId}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, shiftId: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">No linked shift</option>
                  {shifts.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20).map((s) => {
                    const carer = getCarerById(s.carerId);
                    return (
                      <option key={s.id} value={s.id}>
                        {formatDate(s.date)} {formatTime(s.startTime)}-{formatTime(s.endTime)} ({carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown'})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Link to Invoice */}
              <div>
                <label className="block text-xs font-medium text-charcoal mb-1">Link to Invoice (optional)</label>
                <select
                  value={sessionNoteForm.invoiceId}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, invoiceId: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">No linked invoice</option>
                  {invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20).map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} - {formatDate(inv.createdAt)} ({formatCurrency(inv.total)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional Observations */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-charcoal mb-1">Additional Observations</label>
                <textarea
                  value={sessionNoteForm.additionalObservations}
                  onChange={(e) => setSessionNoteForm({ ...sessionNoteForm, additionalObservations: e.target.value })}
                  className="input-field w-full"
                  rows={2}
                  placeholder="Any additional observations or comments..."
                />
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-sage-pale">
              <button
                onClick={() => { setShowSessionNoteForm(false); resetSessionNoteForm(); }}
                className="btn-ghost text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSessionNote}
                disabled={savingSessionNote}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {savingSessionNote ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Note
              </button>
            </div>
          </div>
        )}

        {/* Notes list */}
        {sortedNotes.length === 0 && !showSessionNoteForm ? (
          <EmptyState
            icon={MessageSquare}
            title="No session notes"
            description="Session notes will appear here. Click 'Add Session Note' to record a new session."
          />
        ) : (
          <div className="space-y-3">
            {sortedNotes.map((note) => {
              const linkedShift = note.shiftId ? shifts.find((s) => s.id === note.shiftId) : null;
              const linkedInvoice = note.invoiceId ? invoices.find((i) => i.id === note.invoiceId) : null;
              const moodInfo = MOOD_OPTIONS.find((m) => m.value === note.participantMood);
              const carer = note.carerId ? getCarerById(note.carerId) : null;

              return (
                <div key={note.id} className="card p-4 hover:shadow-md transition-shadow">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-semibold text-charcoal">
                        {note.date ? formatDate(note.date) : formatDate(note.createdAt)}
                      </span>
                      {moodInfo && (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', moodInfo.color)}>
                          {moodInfo.emoji} {moodInfo.label}
                        </span>
                      )}
                      {note.incidentsOrConcerns?.trim() && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                          <AlertTriangle size={10} className="inline mr-1" />
                          Incident flagged
                        </span>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        if (confirm('Delete this session note?')) {
                          try {
                            await deleteSessionNote(note.id);
                            toast.success('Session note deleted');
                          } catch (err: any) {
                            toast.error(err.message || 'Failed to delete');
                          }
                        }
                      }}
                      className="btn-ghost p-1 text-mid-gray hover:text-red-500"
                      title="Delete note"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-xs text-mid-gray">Support Worker:</span>
                      <p className="font-medium text-charcoal">{note.supportWorker || (carer ? `${carer.firstName} ${carer.lastName}` : 'Not specified')}</p>
                    </div>
                    {(note.startTime || note.finishTime) && (
                      <div>
                        <span className="text-xs text-mid-gray">Time:</span>
                        <p className="font-medium text-charcoal">
                          {note.startTime ? formatTime(note.startTime) : '?'} - {note.finishTime ? formatTime(note.finishTime) : '?'}
                        </p>
                      </div>
                    )}
                    {note.activityCompleted && (
                      <div className="md:col-span-2">
                        <span className="text-xs text-mid-gray">Activity Completed:</span>
                        <p className="text-charcoal whitespace-pre-wrap">{note.activityCompleted}</p>
                      </div>
                    )}
                    {note.supportProvided && (
                      <div className="md:col-span-2">
                        <span className="text-xs text-mid-gray">Support Provided:</span>
                        <p className="text-charcoal whitespace-pre-wrap">{note.supportProvided}</p>
                      </div>
                    )}
                    {note.incidentsOrConcerns && (
                      <div className="md:col-span-2">
                        <span className="text-xs text-mid-gray text-red-600">Incidents / Concerns:</span>
                        <p className="text-charcoal whitespace-pre-wrap">{note.incidentsOrConcerns}</p>
                      </div>
                    )}
                    {note.transportKms > 0 && (
                      <div>
                        <span className="text-xs text-mid-gray">Transport KMs:</span>
                        <p className="font-medium text-charcoal">{note.transportKms} km</p>
                      </div>
                    )}
                    {note.additionalObservations && (
                      <div className="md:col-span-2">
                        <span className="text-xs text-mid-gray">Additional Observations:</span>
                        <p className="text-charcoal whitespace-pre-wrap">{note.additionalObservations}</p>
                      </div>
                    )}
                  </div>

                  {/* Linked shift / invoice */}
                  {(linkedShift || linkedInvoice) && (
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-sage-pale flex-wrap">
                      {linkedShift && (
                        <span className="text-xs text-mid-gray flex items-center gap-1">
                          <Calendar size={12} />
                          Shift: {formatDate(linkedShift.date)} {formatTime(linkedShift.startTime)}-{formatTime(linkedShift.endTime)}
                        </span>
                      )}
                      {linkedInvoice && (
                        <span className="text-xs text-mid-gray flex items-center gap-1">
                          <FileText size={12} />
                          Invoice: {linkedInvoice.invoiceNumber} ({formatCurrency(linkedInvoice.total)})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const tabContent: Record<TabId, () => React.JSX.Element> = {
    overview: renderOverview,
    'care-plan': renderCarePlan,
    shifts: renderShifts,
    'session-notes': renderSessionNotes,
    invoices: renderInvoices,
    documents: renderDocuments,
    reviews: renderReviews,
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

// ── Interests Section Component ──

interface InterestsSectionProps {
  client: import('@/types').Client;
  carePlan: CarePlan | undefined;
  updateClient: (id: string, data: Partial<import('@/types').Client>) => Promise<void>;
}

function InterestsSection({ client, carePlan, updateClient }: InterestsSectionProps) {
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Auto-populate from care plan if no interests set yet
  const interests = useMemo(() => {
    if (client.interests && client.interests.length > 0) {
      return client.interests;
    }
    // Auto-populate from care plan's likesAndPreferences
    if (carePlan?.likesAndPreferences) {
      const parsed = carePlan.likesAndPreferences
        .split(/[,;\n]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && s.length < 50);
      if (parsed.length > 0) {
        // Save these to the client so they persist
        updateClient(client.id, { interests: parsed }).catch(() => {});
        return parsed;
      }
    }
    return [];
  }, [client.interests, client.id, carePlan?.likesAndPreferences, updateClient]);

  const addInterest = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (interests.includes(trimmed)) {
      setInputValue('');
      return;
    }
    const updated = [...interests, trimmed];
    updateClient(client.id, { interests: updated });
    setInputValue('');
  };

  const removeInterest = (tag: string) => {
    const updated = interests.filter((i) => i !== tag);
    updateClient(client.id, { interests: updated });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addInterest();
    }
  };

  return (
    <div className="card col-span-3">
      <h3 className="text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
        <Tag size={16} className="text-forest" /> Interests & Preferences
      </h3>
      <div className="flex flex-wrap gap-2 mb-3">
        {interests.length === 0 && !showInput && (
          <p className="text-sm text-mid-gray italic">No interests added yet.</p>
        )}
        {interests.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sage-pale text-forest text-xs font-medium rounded-full"
          >
            {tag}
            <button
              onClick={() => removeInterest(tag)}
              className="hover:text-burgundy transition-colors"
            >
              <X size={12} />
            </button>
          </span>
        ))}
      </div>
      {showInput ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="input-field text-sm flex-1"
            placeholder="Enter an interest or preference..."
            autoFocus
          />
          <button onClick={addInterest} className="btn-primary text-xs">
            Add
          </button>
          <button onClick={() => { setShowInput(false); setInputValue(''); }} className="btn-ghost text-xs">
            Cancel
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          className="btn-ghost text-xs flex items-center gap-1"
        >
          <Plus size={14} />
          Add Interest
        </button>
      )}
    </div>
  );
}
