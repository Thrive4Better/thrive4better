import { useState, useMemo, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  startOfWeek,
  endOfWeek,
  parseISO,
  isWithinInterval,
  differenceInYears,
} from 'date-fns';
import {
  Plus,
  Phone,
  Mail,
  Users,
  Clock,
  Trash2,
  Edit3,
  UserPlus,
  Upload,
  Download,
  X,
  AlertCircle,
  CheckCircle2,
  Archive,
  ArchiveRestore,
  MapPin,
  Briefcase,
  DollarSign,
  Shield,
  Heart,
  Car,
  Globe,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import type { Carer } from '@/types';
import { cn } from '@/lib/utils';
import { exportToCsv } from '@/lib/export-utils';
import SlideOver from '@/components/ui/SlideOver';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import TableFilter from '@/components/ui/TableFilter';

// ── Constants ──────────────────────────────────────────────

const CARER_STATUSES = ['Active', 'Unavailable', 'On Leave', 'Archived'] as const;
const CARER_TIERS = ['Junior', 'Standard', 'Senior', 'Lead'] as const;
const AUSTRALIAN_STATES = ['NSW', 'VIC', 'QLD', 'SA', 'WA', 'TAS', 'NT', 'ACT'] as const;

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const QUALIFICATIONS = [
  'First Aid',
  'NDIS Worker Screening',
  'Manual Handling',
  'Medication Administration',
];

const SPECIALIZATION_OPTIONS = [
  'Disability Support',
  'Mental Health',
  'Complex Care',
  'Behavioural Support',
  'Allied Health Assistance',
  'Community Access',
  'SIL/SDA',
  'Palliative Care',
  'Paediatric',
  'Aged Care',
];

const LANGUAGE_OPTIONS = [
  'English',
  'Mandarin',
  'Cantonese',
  'Vietnamese',
  'Arabic',
  'Hindi',
  'Greek',
  'Italian',
  'Filipino/Tagalog',
  'Korean',
  'Spanish',
  'Auslan',
];

const AVATAR_COLORS = [
  'bg-forest text-white',
  'bg-sage text-white',
  'bg-burgundy text-white',
  'bg-amber-500 text-white',
  'bg-blue-500 text-white',
  'bg-forest-mid text-white',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function maskTfn(tfn?: string): string {
  if (!tfn) return '';
  const digits = tfn.replace(/\D/g, '');
  if (digits.length < 3) return '***-***-***';
  return `***-***-${digits.slice(-3)}`;
}

function maskBankAccount(acc?: string): string {
  if (!acc) return '';
  if (acc.length <= 3) return acc;
  return '****' + acc.slice(-3);
}

function computeAge(dob?: string): number | undefined {
  if (!dob) return undefined;
  try {
    return differenceInYears(new Date(), parseISO(dob));
  } catch {
    return undefined;
  }
}

// ── Carer Form Schema ──────────────────────────────────────

const carerSchema = z.object({
  // Personal Details
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Valid email is required'),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  suburb: z.string().optional(),
  postcode: z.string().optional(),
  state: z.string().optional(),
  // Employment Details
  role: z.string().min(1, 'Role is required'),
  tier: z.enum(['', ...CARER_TIERS] as [string, ...string[]]).optional(),
  hireDate: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional().or(z.literal('')),
  maxWeeklyHours: z.coerce.number().min(0).optional().or(z.literal('')),
  qualifications: z.array(z.string()),
  specializations: z.array(z.string()),
  availability: z.array(z.string()),
  status: z.enum(CARER_STATUSES),
  isSubcontractor: z.boolean(),
  // Tax & Banking
  tfn: z.string().optional(),
  abn: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankBsb: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  superFundName: z.string().optional(),
  superMemberNumber: z.string().optional(),
  // Emergency Contact
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
  // Preferences
  driversLicense: z.boolean().optional(),
  ownVehicle: z.boolean().optional(),
  languages: z.array(z.string()),
  preferredClients: z.array(z.string()),
  // Notes
  notes: z.string(),
});

type CarerFormData = z.infer<typeof carerSchema>;

// ── CSV Import types ────────────────────────────────────────

interface CsvCarerRow {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  role: string;
  status: string;
  errors: string[];
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function validateCarerRow(row: CsvCarerRow): string[] {
  const errors: string[] = [];
  if (!row.firstName) errors.push('First Name required');
  if (!row.lastName) errors.push('Last Name required');
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email');
  if (row.status && !['Active', 'Unavailable', 'On Leave'].includes(row.status)) errors.push('Invalid status');
  return errors;
}

function parseCarerCsv(text: string): CsvCarerRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0].toLowerCase());
  const colMap: Record<string, number> = {};
  const mapping: Record<string, string> = {
    'first name': 'firstName', 'firstname': 'firstName',
    'last name': 'lastName', 'lastname': 'lastName',
    'phone': 'phone', 'email': 'email',
    'role': 'role', 'title': 'role',
    'status': 'status',
  };
  headers.forEach((h, i) => {
    const mapped = mapping[h.trim()];
    if (mapped) colMap[mapped] = i;
  });

  const rows: CsvCarerRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const row: CsvCarerRow = {
      firstName: fields[colMap['firstName'] ?? -1] || '',
      lastName: fields[colMap['lastName'] ?? -1] || '',
      phone: fields[colMap['phone'] ?? -1] || '',
      email: fields[colMap['email'] ?? -1] || '',
      role: fields[colMap['role'] ?? -1] || 'Support Worker',
      status: fields[colMap['status'] ?? -1] || 'Active',
      errors: [],
    };
    row.errors = validateCarerRow(row);
    rows.push(row);
  }
  return rows;
}

// ── Section Header ─────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 bg-forest rounded-t-xl">
      <Icon size={16} className="text-white/80" />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
  );
}

// ── Detail Row ─────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string | number | boolean | null }) {
  if (value === undefined || value === null || value === '') return null;
  const display = typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value);
  return (
    <div className="flex justify-between py-1.5 text-sm">
      <span className="text-mid-gray">{label}</span>
      <span className="text-charcoal font-medium text-right max-w-[60%] break-words">{display}</span>
    </div>
  );
}

// ── Carer Detail Panel ─────────────────────────────────────

interface CarerDetailPanelProps {
  carer: Carer;
  clients: { id: string; firstName: string; lastName: string }[];
  onEdit: () => void;
  onClose: () => void;
}

function CarerDetailPanel({ carer, clients, onEdit, onClose }: CarerDetailPanelProps) {
  const [showSensitive, setShowSensitive] = useState(false);
  const age = computeAge(carer.dateOfBirth);

  const preferredClientNames = (carer.preferredClients || [])
    .map((id) => {
      const c = clients.find((cl) => cl.id === id);
      return c ? `${c.firstName} ${c.lastName}` : id;
    })
    .join(', ');

  return (
    <div className="space-y-4">
      {/* Header with avatar */}
      <div className="flex items-center gap-4 pb-4 border-b border-sage-pale">
        <div
          className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0',
            getAvatarColor(carer.id)
          )}
        >
          {carer.firstName[0]}{carer.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-charcoal">
            {carer.firstName} {carer.lastName}
          </h2>
          <p className="text-sm text-mid-gray">{carer.role}{carer.tier ? ` - ${carer.tier}` : ''}</p>
          <div className="mt-1">
            <StatusBadge status={carer.status} />
            {carer.isSubcontractor && (
              <span className="ml-2 inline-block text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                Subcontractor
              </span>
            )}
          </div>
        </div>
        <button onClick={onEdit} className="btn-primary flex items-center gap-2 flex-shrink-0">
          <Edit3 size={15} /> Edit
        </button>
      </div>

      {/* Personal Details */}
      <div className="rounded-xl border border-sage-pale overflow-hidden">
        <SectionHeader icon={Users} title="Personal Details" />
        <div className="bg-cream/30 px-4 py-3 space-y-0.5">
          <DetailRow label="Phone" value={carer.phone} />
          <DetailRow label="Email" value={carer.email} />
          <DetailRow label="Date of Birth" value={carer.dateOfBirth} />
          {age !== undefined && <DetailRow label="Age" value={`${age} years`} />}
          <DetailRow label="Address" value={carer.address} />
          <DetailRow label="Suburb" value={carer.suburb} />
          <DetailRow label="Postcode" value={carer.postcode} />
          <DetailRow label="State" value={carer.state} />
        </div>
      </div>

      {/* Employment Details */}
      <div className="rounded-xl border border-sage-pale overflow-hidden">
        <SectionHeader icon={Briefcase} title="Employment Details" />
        <div className="bg-cream/30 px-4 py-3 space-y-0.5">
          <DetailRow label="Role" value={carer.role} />
          <DetailRow label="Tier" value={carer.tier} />
          <DetailRow label="Hire Date" value={carer.hireDate} />
          <DetailRow label="Hourly Rate" value={carer.hourlyRate != null ? `$${carer.hourlyRate.toFixed(2)}` : undefined} />
          <DetailRow label="Max Weekly Hours" value={carer.maxWeeklyHours} />
          {carer.qualifications.length > 0 && (
            <div className="py-1.5">
              <span className="text-sm text-mid-gray">Qualifications</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {carer.qualifications.map((q) => (
                  <span key={q} className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-sage-pale text-forest">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          )}
          {(carer.specializations || []).length > 0 && (
            <div className="py-1.5">
              <span className="text-sm text-mid-gray">Specializations</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(carer.specializations || []).map((s) => (
                  <span key={s} className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tax & Banking */}
      <div className="rounded-xl border border-sage-pale overflow-hidden">
        <SectionHeader icon={DollarSign} title="Tax & Banking" />
        <div className="bg-cream/30 px-4 py-3 space-y-0.5">
          <div className="flex justify-end mb-1">
            <button
              onClick={() => setShowSensitive(!showSensitive)}
              className="flex items-center gap-1.5 text-xs text-mid-gray hover:text-charcoal transition-colors"
            >
              {showSensitive ? <EyeOff size={13} /> : <Eye size={13} />}
              {showSensitive ? 'Hide sensitive' : 'Show sensitive'}
            </button>
          </div>
          <DetailRow label="TFN" value={showSensitive ? carer.tfn : maskTfn(carer.tfn)} />
          {carer.isSubcontractor && <DetailRow label="ABN" value={carer.abn} />}
          <DetailRow label="Bank Account Name" value={carer.bankAccountName} />
          <DetailRow label="BSB" value={showSensitive ? carer.bankBsb : (carer.bankBsb ? '***-***' : undefined)} />
          <DetailRow label="Account Number" value={showSensitive ? carer.bankAccountNumber : maskBankAccount(carer.bankAccountNumber)} />
          <DetailRow label="Super Fund" value={carer.superFundName} />
          <DetailRow label="Super Member No." value={carer.superMemberNumber} />
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="rounded-xl border border-sage-pale overflow-hidden">
        <SectionHeader icon={Heart} title="Emergency Contact" />
        <div className="bg-cream/30 px-4 py-3 space-y-0.5">
          <DetailRow label="Name" value={carer.emergencyContactName} />
          <DetailRow label="Phone" value={carer.emergencyContactPhone} />
          <DetailRow label="Relationship" value={carer.emergencyContactRelation} />
          {!carer.emergencyContactName && !carer.emergencyContactPhone && (
            <p className="text-sm text-mid-gray italic py-2">No emergency contact recorded</p>
          )}
        </div>
      </div>

      {/* Availability & Preferences */}
      <div className="rounded-xl border border-sage-pale overflow-hidden">
        <SectionHeader icon={Clock} title="Availability & Preferences" />
        <div className="bg-cream/30 px-4 py-3 space-y-2">
          {carer.availability.length > 0 && (
            <div className="py-1">
              <span className="text-sm text-mid-gray">Available Days</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {carer.availability.map((d) => (
                  <span key={d} className="inline-block text-[11px] px-2.5 py-1 rounded-full bg-forest text-white font-medium">
                    {d.slice(0, 3)}
                  </span>
                ))}
              </div>
            </div>
          )}
          <DetailRow label="Driver's License" value={carer.driversLicense} />
          <DetailRow label="Own Vehicle" value={carer.ownVehicle} />
          {(carer.languages || []).length > 0 && (
            <div className="py-1">
              <span className="text-sm text-mid-gray">Languages</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {(carer.languages || []).map((l) => (
                  <span key={l} className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-sage-pale text-forest">
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}
          {preferredClientNames && <DetailRow label="Preferred Clients" value={preferredClientNames} />}
        </div>
      </div>

      {/* Notes */}
      {carer.notes && (
        <div className="rounded-xl border border-sage-pale overflow-hidden">
          <SectionHeader icon={Edit3} title="Notes" />
          <div className="bg-cream/30 px-4 py-3">
            <p className="text-sm text-charcoal whitespace-pre-wrap">{carer.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────

export default function CarersList() {
  const {
    carers,
    shifts,
    clients,
    addCarer,
    updateCarer,
    deleteCarer,
    getShiftsByCarer,
  } = useStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [editingCarer, setEditingCarer] = useState<Carer | null>(null);
  const [viewingCarer, setViewingCarer] = useState<Carer | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // Search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRole, setFilterRole] = useState('');

  // CSV Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvCarerRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current week for hours calculation
  const thisWeekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    []
  );
  const thisWeekEnd = useMemo(
    () => endOfWeek(new Date(), { weekStartsOn: 1 }),
    []
  );

  // Per-carer stats
  const carerStats = useMemo(() => {
    const stats: Record<string, { weeklyHours: number; clientCount: number }> = {};
    carers.forEach((carer) => {
      const carerShifts = getShiftsByCarer(carer.id);
      const weekShifts = carerShifts.filter((s) => {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: thisWeekStart, end: thisWeekEnd });
      });
      const weeklyHours = weekShifts.reduce((sum, s) => sum + s.hours, 0);
      const uniqueClients = new Set(carerShifts.map((s) => s.clientId));
      stats[carer.id] = {
        weeklyHours: Math.round(weeklyHours * 100) / 100,
        clientCount: uniqueClients.size,
      };
    });
    return stats;
  }, [carers, getShiftsByCarer, thisWeekStart, thisWeekEnd]);

  // Unique roles for filter dropdown
  const uniqueRoles = useMemo(() => {
    const roles = new Set(carers.map((c) => c.role).filter(Boolean));
    return Array.from(roles).sort();
  }, [carers]);

  // Filtered carers (archive toggle + search + filters)
  const filteredCarers = useMemo(() => {
    let result = showArchived ? carers : carers.filter((c) => c.status !== 'Archived');

    if (filterStatus) result = result.filter((c) => c.status === filterStatus);
    if (filterRole) result = result.filter((c) => c.role === filterRole);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.role.toLowerCase().includes(q)
      );
    }

    // Sort alphabetically by name
    result.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
    );

    return result;
  }, [carers, showArchived, searchQuery, filterStatus, filterRole]);

  // Archive / unarchive
  const handleArchive = useCallback(async (carer: Carer, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateCarer(carer.id, { status: 'Archived' });
    toast.success(`${carer.firstName} ${carer.lastName} archived`);
  }, [updateCarer]);

  const handleUnarchive = useCallback(async (carer: Carer, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateCarer(carer.id, { status: 'Active' });
    toast.success(`${carer.firstName} ${carer.lastName} restored`);
  }, [updateCarer]);

  // Detail view
  const openDetailView = useCallback((carer: Carer) => {
    setViewingCarer(carer);
    setDetailDrawerOpen(true);
  }, []);

  const closeDetailView = useCallback(() => {
    setDetailDrawerOpen(false);
    setViewingCarer(null);
  }, []);

  // Drawer actions
  const openNewCarer = useCallback(() => {
    setEditingCarer(null);
    setDrawerOpen(true);
  }, []);

  const openEditCarer = useCallback((carer: Carer) => {
    setEditingCarer(carer);
    setDetailDrawerOpen(false);
    setViewingCarer(null);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingCarer(null);
  }, []);

  // ── CSV Export ──────────────────────────────────────────────

  const handleExportCsv = useCallback(() => {
    const headers = ['First Name', 'Last Name', 'Phone', 'Email', 'Role', 'Qualifications', 'Availability', 'Status'];
    const rows = carers.map((c) => [
      c.firstName, c.lastName, c.phone, c.email, c.role,
      c.qualifications.join('; '), c.availability.join('; '), c.status,
    ]);
    exportToCsv(`carers-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  }, [carers]);

  // ── CSV Import ──────────────────────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvRows(parseCarerCsv(text));
      setImportResult(null);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleImport = useCallback(async () => {
    const validRows = csvRows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) {
      toast.error('No valid rows to import');
      return;
    }
    setImporting(true);
    let imported = 0;
    let skipped = 0;
    for (const row of csvRows) {
      if (row.errors.length > 0) { skipped++; continue; }
      try {
        await addCarer({
          firstName: row.firstName,
          lastName: row.lastName,
          phone: row.phone,
          email: row.email,
          role: row.role,
          qualifications: [],
          availability: [],
          status: (row.status as 'Active' | 'Unavailable' | 'On Leave') || 'Active',
          isSubcontractor: false,
          notes: '',
        });
        imported++;
      } catch { skipped++; }
    }
    setImporting(false);
    setImportResult({ imported, skipped });
    toast.success(`Imported ${imported} carer${imported !== 1 ? 's' : ''}`);
  }, [csvRows, addCarer]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Carers</h1>
          <p className="text-sm text-mid-gray mt-1">
            {carers.length} carer{carers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-mid-gray cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-sage text-forest focus:ring-forest"
            />
            Show archived
          </label>
          <button
            onClick={() => { setImportModalOpen(true); setCsvRows([]); setImportResult(null); }}
            className="btn-ghost flex items-center gap-2"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button onClick={handleExportCsv} className="btn-ghost flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openNewCarer} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Add Carer
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <TableFilter
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, email, phone or role..."
        filterOptions={[
          {
            label: 'All Statuses',
            value: 'status',
            options: CARER_STATUSES.map((s) => ({ label: s, value: s })),
          },
          ...(uniqueRoles.length > 0
            ? [
                {
                  label: 'All Roles',
                  value: 'role',
                  options: uniqueRoles.map((r) => ({ label: r, value: r })),
                },
              ]
            : []),
        ]}
        activeFilters={{ status: filterStatus, role: filterRole }}
        onFilterChange={(key, value) => {
          if (key === 'status') setFilterStatus(value);
          if (key === 'role') setFilterRole(value);
        }}
        onClearFilters={() => {
          setSearchQuery('');
          setFilterStatus('');
          setFilterRole('');
        }}
        resultCount={filteredCarers.length}
        totalCount={carers.length}
      />

      {/* Carer Cards */}
      {filteredCarers.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No carers yet"
          description={showArchived || carers.length === 0 ? "Add your first carer to start building your team roster." : "No active carers found. Try enabling 'Show archived'."}
          action={carers.length === 0 ? { label: 'Add Carer', onClick: openNewCarer } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCarers.map((carer) => {
            const initials = `${carer.firstName[0]}${carer.lastName[0]}`.toUpperCase();
            const stats = carerStats[carer.id] || { weeklyHours: 0, clientCount: 0 };
            const avatarColor = getAvatarColor(carer.id);
            const isArchived = carer.status === 'Archived';

            return (
              <div
                key={carer.id}
                className={cn(
                  'card p-5 hover:shadow-md transition-shadow cursor-pointer',
                  isArchived && 'opacity-50'
                )}
                onClick={() => openDetailView(carer)}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                      avatarColor
                    )}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-charcoal truncate">
                        {carer.firstName} {carer.lastName}
                      </h3>
                      <StatusBadge status={carer.status} />
                    </div>
                    <p className="text-sm text-mid-gray mt-0.5">
                      {carer.role}
                      {carer.tier && <span className="text-forest"> - {carer.tier}</span>}
                    </p>

                    {/* Contact */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-mid-gray">
                        <Phone size={13} className="flex-shrink-0" />
                        <span className="truncate">{carer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-mid-gray">
                        <Mail size={13} className="flex-shrink-0" />
                        <span className="truncate">{carer.email}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-sage-pale">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock size={14} className="text-sage" />
                        <span className="text-charcoal font-medium">
                          {stats.weeklyHours}h
                        </span>
                        <span className="text-mid-gray">this week</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users size={14} className="text-sage" />
                        <span className="text-charcoal font-medium">
                          {stats.clientCount}
                        </span>
                        <span className="text-mid-gray">
                          client{stats.clientCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Qualifications preview */}
                    {carer.qualifications.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {carer.qualifications.map((q) => (
                          <span
                            key={q}
                            className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-sage-pale text-forest"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Archive / Unarchive */}
                    <div className="mt-3 pt-2 border-t border-sage-pale">
                      {isArchived ? (
                        <button
                          onClick={(e) => handleUnarchive(carer, e)}
                          className="flex items-center gap-1.5 text-xs text-forest hover:text-forest-mid transition-colors"
                        >
                          <ArchiveRestore size={13} /> Unarchive
                        </button>
                      ) : (
                        <button
                          onClick={(e) => handleArchive(carer, e)}
                          className="flex items-center gap-1.5 text-xs text-mid-gray hover:text-amber-600 transition-colors"
                        >
                          <Archive size={13} /> Archive
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setImportModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-3xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-charcoal">Import Carers from CSV</h2>
              <button onClick={() => setImportModalOpen(false)} className="p-1.5 rounded-lg hover:bg-sage-pale">
                <X size={18} className="text-mid-gray" />
              </button>
            </div>

            {csvRows.length === 0 && !importResult && (
              <div className="space-y-4">
                <p className="text-sm text-mid-gray">
                  Upload a CSV file with columns: First Name, Last Name, Phone, Email, Role, Status
                </p>
                <div className="border-2 border-dashed border-sage-pale rounded-xl p-8 text-center">
                  <Upload size={32} className="mx-auto text-sage mb-3" />
                  <p className="text-sm text-mid-gray mb-3">Choose a CSV file to upload</p>
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">Choose File</button>
                </div>
              </div>
            )}

            {csvRows.length > 0 && !importResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-mid-gray">
                    {csvRows.length} row{csvRows.length !== 1 ? 's' : ''} found
                    {' \u2022 '}
                    <span className="text-green-600">{csvRows.filter((r) => r.errors.length === 0).length} valid</span>
                    {' \u2022 '}
                    <span className="text-red-600">{csvRows.filter((r) => r.errors.length > 0).length} with errors</span>
                  </p>
                  <button onClick={() => setCsvRows([])} className="text-sm text-mid-gray hover:text-charcoal">Clear</button>
                </div>
                <div className="overflow-x-auto border border-sage-pale rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-sage-pale bg-sage-pale/30">
                        <th className="px-3 py-2 text-left font-medium text-charcoal">OK</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">First Name</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Last Name</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Phone</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Role</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((row, i) => (
                        <tr key={i} className={cn('border-b border-sage-pale/50', row.errors.length > 0 && 'bg-red-50/50')}>
                          <td className="px-3 py-2">
                            {row.errors.length === 0 ? <CheckCircle2 size={16} className="text-green-500" /> : <AlertCircle size={16} className="text-red-500" />}
                          </td>
                          <td className="px-3 py-2">{row.firstName}</td>
                          <td className="px-3 py-2">{row.lastName}</td>
                          <td className="px-3 py-2">{row.phone}</td>
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">{row.role}</td>
                          <td className="px-3 py-2 text-red-600 text-xs">{row.errors.join(', ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setImportModalOpen(false)} className="btn-ghost">Cancel</button>
                  <button
                    onClick={handleImport}
                    disabled={importing || csvRows.filter((r) => r.errors.length === 0).length === 0}
                    className="btn-primary"
                  >
                    {importing ? 'Importing...' : `Import ${csvRows.filter((r) => r.errors.length === 0).length} Carer${csvRows.filter((r) => r.errors.length === 0).length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}

            {importResult && (
              <div className="space-y-4 text-center py-6">
                <CheckCircle2 size={48} className="mx-auto text-green-500" />
                <h3 className="text-lg font-semibold text-charcoal">Import Complete</h3>
                <p className="text-sm text-mid-gray">
                  {importResult.imported} carer{importResult.imported !== 1 ? 's' : ''} imported.
                  {importResult.skipped > 0 && ` ${importResult.skipped} skipped.`}
                </p>
                <button onClick={() => setImportModalOpen(false)} className="btn-primary">Done</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Carer Detail Drawer */}
      <SlideOver
        open={detailDrawerOpen}
        onClose={closeDetailView}
        title="Carer Profile"
        wide
      >
        {viewingCarer && (
          <CarerDetailPanel
            carer={viewingCarer}
            clients={clients.map((c) => ({ id: c.id, firstName: c.firstName, lastName: c.lastName }))}
            onEdit={() => openEditCarer(viewingCarer)}
            onClose={closeDetailView}
          />
        )}
      </SlideOver>

      {/* Carer Form Drawer */}
      <SlideOver
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingCarer ? 'Edit Carer' : 'New Carer'}
        wide
      >
        <CarerForm
          carer={editingCarer}
          clients={clients}
          onSave={(data) => {
            if (editingCarer) {
              updateCarer(editingCarer.id, data);
              toast.success('Carer updated');
            } else {
              addCarer(data);
              toast.success('Carer added');
            }
            closeDrawer();
          }}
          onDelete={
            editingCarer
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
          if (editingCarer) {
            deleteCarer(editingCarer.id);
            toast.success('Carer deleted');
            setDeleteModalOpen(false);
            closeDrawer();
          }
        }}
        title="Delete Carer"
        message="Are you sure you want to delete this carer? All associated shift assignments will remain but won't have an assigned carer."
      />
    </div>
  );
}

// ── Form Section Wrapper ────────────────────────────────────

function FormSection({
  icon: Icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: React.ElementType;
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-sage-pale overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-forest text-white hover:bg-forest-mid transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-white/80" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="bg-cream/30 px-4 py-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Carer Form Sub-Component ───────────────────────────────

interface CarerFormProps {
  carer: Carer | null;
  clients: { id: string; firstName: string; lastName: string }[];
  onSave: (data: Omit<Carer, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function CarerForm({ carer, clients, onSave, onDelete, onCancel }: CarerFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CarerFormData>({
    resolver: zodResolver(carerSchema),
    defaultValues: carer
      ? {
          firstName: carer.firstName,
          lastName: carer.lastName,
          phone: carer.phone,
          email: carer.email,
          dateOfBirth: carer.dateOfBirth || '',
          address: carer.address || '',
          suburb: carer.suburb || '',
          postcode: carer.postcode || '',
          state: carer.state || '',
          role: carer.role,
          tier: (carer.tier as string) || '',
          hireDate: carer.hireDate || '',
          hourlyRate: carer.hourlyRate ?? ('' as any),
          maxWeeklyHours: carer.maxWeeklyHours ?? ('' as any),
          qualifications: carer.qualifications,
          specializations: carer.specializations || [],
          availability: carer.availability,
          status: carer.status,
          isSubcontractor: carer.isSubcontractor || false,
          tfn: carer.tfn || '',
          abn: carer.abn || '',
          bankAccountName: carer.bankAccountName || '',
          bankBsb: carer.bankBsb || '',
          bankAccountNumber: carer.bankAccountNumber || '',
          superFundName: carer.superFundName || '',
          superMemberNumber: carer.superMemberNumber || '',
          emergencyContactName: carer.emergencyContactName || '',
          emergencyContactPhone: carer.emergencyContactPhone || '',
          emergencyContactRelation: carer.emergencyContactRelation || '',
          driversLicense: carer.driversLicense || false,
          ownVehicle: carer.ownVehicle || false,
          languages: carer.languages || [],
          preferredClients: carer.preferredClients || [],
          notes: carer.notes,
        }
      : {
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          dateOfBirth: '',
          address: '',
          suburb: '',
          postcode: '',
          state: '',
          role: '',
          tier: '',
          hireDate: '',
          hourlyRate: '' as any,
          maxWeeklyHours: '' as any,
          qualifications: [],
          specializations: [],
          availability: [],
          status: 'Active',
          isSubcontractor: false,
          tfn: '',
          abn: '',
          bankAccountName: '',
          bankBsb: '',
          bankAccountNumber: '',
          superFundName: '',
          superMemberNumber: '',
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelation: '',
          driversLicense: false,
          ownVehicle: false,
          languages: [],
          preferredClients: [],
          notes: '',
        },
  });

  const qualifications = watch('qualifications');
  const specializations = watch('specializations');
  const availability = watch('availability');
  const languages = watch('languages');
  const preferredClients = watch('preferredClients');
  const isSubcontractor = watch('isSubcontractor');

  const toggleArrayField = useCallback(
    (field: 'qualifications' | 'specializations' | 'availability' | 'languages' | 'preferredClients', value: string, current: string[]) => {
      const arr = current || [];
      if (arr.includes(value)) {
        setValue(field, arr.filter((v) => v !== value));
      } else {
        setValue(field, [...arr, value]);
      }
    },
    [setValue]
  );

  const onSubmit = (data: CarerFormData) => {
    onSave({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      role: data.role,
      qualifications: data.qualifications,
      availability: data.availability,
      status: data.status,
      isSubcontractor: data.isSubcontractor,
      notes: data.notes,
      // Extended fields
      dateOfBirth: data.dateOfBirth || undefined,
      address: data.address || undefined,
      suburb: data.suburb || undefined,
      postcode: data.postcode || undefined,
      state: data.state || undefined,
      tier: (data.tier as Carer['tier']) || undefined,
      hireDate: data.hireDate || undefined,
      hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : undefined,
      maxWeeklyHours: data.maxWeeklyHours ? Number(data.maxWeeklyHours) : undefined,
      specializations: data.specializations,
      tfn: data.tfn || undefined,
      abn: data.abn || undefined,
      bankAccountName: data.bankAccountName || undefined,
      bankBsb: data.bankBsb || undefined,
      bankAccountNumber: data.bankAccountNumber || undefined,
      superFundName: data.superFundName || undefined,
      superMemberNumber: data.superMemberNumber || undefined,
      emergencyContactName: data.emergencyContactName || undefined,
      emergencyContactPhone: data.emergencyContactPhone || undefined,
      emergencyContactRelation: data.emergencyContactRelation || undefined,
      driversLicense: data.driversLicense || undefined,
      ownVehicle: data.ownVehicle || undefined,
      languages: data.languages,
      preferredClients: data.preferredClients,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* ── Personal Details ── */}
      <FormSection icon={Users} title="Personal Details" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">First Name *</label>
            <input {...register('firstName')} className="input-field" placeholder="First name" />
            {errors.firstName && <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Last Name *</label>
            <input {...register('lastName')} className="input-field" placeholder="Last name" />
            {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Phone *</label>
            <input {...register('phone')} className="input-field" placeholder="04xx xxx xxx" />
            {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Email *</label>
            <input type="email" {...register('email')} className="input-field" placeholder="carer@example.com" />
            {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Date of Birth</label>
          <input type="date" {...register('dateOfBirth')} className="input-field" />
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Address</label>
          <input {...register('address')} className="input-field" placeholder="Street address" />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Suburb</label>
            <input {...register('suburb')} className="input-field" placeholder="Suburb" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Postcode</label>
            <input {...register('postcode')} className="input-field" placeholder="0000" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">State</label>
            <select {...register('state')} className="input-field">
              <option value="">Select...</option>
              {AUSTRALIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </FormSection>

      {/* ── Employment Details ── */}
      <FormSection icon={Briefcase} title="Employment Details" defaultOpen={true}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Role / Title *</label>
            <input {...register('role')} className="input-field" placeholder="e.g. Support Worker" />
            {errors.role && <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Tier</label>
            <select {...register('tier')} className="input-field">
              <option value="">Select tier...</option>
              {CARER_TIERS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Hire Date</label>
            <input type="date" {...register('hireDate')} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Hourly Rate ($)</label>
            <input type="number" step="0.01" {...register('hourlyRate')} className="input-field" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Max Weekly Hours</label>
            <input type="number" {...register('maxWeeklyHours')} className="input-field" placeholder="38" />
          </div>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
          <select {...register('status')} className="input-field">
            {CARER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Subcontractor Flag */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('isSubcontractor')}
              className="rounded border-sage text-forest focus:ring-forest w-4 h-4"
            />
            <div>
              <span className="text-sm font-medium text-charcoal">Subcontractor</span>
              <p className="text-xs text-mid-gray">Subcontractors don't receive PAYG or super in payroll -- they invoice separately.</p>
            </div>
          </label>
        </div>

        {/* Qualifications */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">Qualifications</label>
          <div className="grid grid-cols-2 gap-2">
            {QUALIFICATIONS.map((qual) => {
              const checked = (qualifications || []).includes(qual);
              return (
                <label
                  key={qual}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm',
                    checked
                      ? 'border-forest bg-sage-pale/50 text-forest'
                      : 'border-sage-pale text-mid-gray hover:border-sage'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArrayField('qualifications', qual, qualifications || [])}
                    className="rounded border-sage text-forest focus:ring-forest"
                  />
                  {qual}
                </label>
              );
            })}
          </div>
        </div>

        {/* Specializations */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">Specializations</label>
          <div className="grid grid-cols-2 gap-2">
            {SPECIALIZATION_OPTIONS.map((spec) => {
              const checked = (specializations || []).includes(spec);
              return (
                <label
                  key={spec}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm',
                    checked
                      ? 'border-blue-500 bg-blue-50/50 text-blue-700'
                      : 'border-sage-pale text-mid-gray hover:border-sage'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleArrayField('specializations', spec, specializations || [])}
                    className="rounded border-sage text-blue-600 focus:ring-blue-500"
                  />
                  {spec}
                </label>
              );
            })}
          </div>
        </div>
      </FormSection>

      {/* ── Tax & Banking ── */}
      <FormSection icon={DollarSign} title="Tax & Banking" defaultOpen={!!carer}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Tax File Number (TFN)</label>
            <input {...register('tfn')} className="input-field" placeholder="XXX-XXX-XXX" />
          </div>
          {isSubcontractor && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">ABN</label>
              <input {...register('abn')} className="input-field" placeholder="XX XXX XXX XXX" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Bank Account Name</label>
          <input {...register('bankAccountName')} className="input-field" placeholder="Account holder name" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">BSB</label>
            <input {...register('bankBsb')} className="input-field" placeholder="XXX-XXX" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Account Number</label>
            <input {...register('bankAccountNumber')} className="input-field" placeholder="XXXXXXXX" />
          </div>
        </div>

        {!isSubcontractor && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Super Fund Name</label>
              <input {...register('superFundName')} className="input-field" placeholder="e.g. Australian Super" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Super Member Number</label>
              <input {...register('superMemberNumber')} className="input-field" placeholder="Member number" />
            </div>
          </div>
        )}
      </FormSection>

      {/* ── Emergency Contact ── */}
      <FormSection icon={Heart} title="Emergency Contact" defaultOpen={!!carer}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Contact Name</label>
            <input {...register('emergencyContactName')} className="input-field" placeholder="Full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Contact Phone</label>
            <input {...register('emergencyContactPhone')} className="input-field" placeholder="04xx xxx xxx" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Relationship</label>
          <input {...register('emergencyContactRelation')} className="input-field" placeholder="e.g. Spouse, Parent, Sibling" />
        </div>
      </FormSection>

      {/* ── Availability & Preferences ── */}
      <FormSection icon={Clock} title="Availability & Preferences" defaultOpen={true}>
        {/* Availability */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">Availability</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const active = (availability || []).includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleArrayField('availability', day, availability || [])}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    active
                      ? 'bg-forest text-white'
                      : 'bg-sage-pale text-mid-gray hover:bg-sage-light'
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Driver & Vehicle */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('driversLicense')}
              className="rounded border-sage text-forest focus:ring-forest w-4 h-4"
            />
            <span className="text-sm text-charcoal">Driver's License</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              {...register('ownVehicle')}
              className="rounded border-sage text-forest focus:ring-forest w-4 h-4"
            />
            <span className="text-sm text-charcoal">Own Vehicle</span>
          </label>
        </div>

        {/* Languages */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-2">Languages</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGE_OPTIONS.map((lang) => {
              const active = (languages || []).includes(lang);
              return (
                <button
                  key={lang}
                  type="button"
                  onClick={() => toggleArrayField('languages', lang, languages || [])}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    active
                      ? 'bg-forest text-white'
                      : 'bg-sage-pale text-mid-gray hover:bg-sage-light'
                  )}
                >
                  {lang}
                </button>
              );
            })}
          </div>
        </div>

        {/* Preferred Clients */}
        {clients.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Preferred Clients</label>
            <div className="max-h-40 overflow-y-auto border border-sage-pale rounded-lg p-2 space-y-1">
              {clients.map((client) => {
                const checked = (preferredClients || []).includes(client.id);
                return (
                  <label
                    key={client.id}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors text-sm',
                      checked ? 'bg-sage-pale/50 text-forest' : 'text-mid-gray hover:bg-sage-pale/30'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleArrayField('preferredClients', client.id, preferredClients || [])}
                      className="rounded border-sage text-forest focus:ring-forest"
                    />
                    {client.firstName} {client.lastName}
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </FormSection>

      {/* ── Notes ── */}
      <FormSection icon={Edit3} title="Notes" defaultOpen={true}>
        <textarea
          {...register('notes')}
          rows={3}
          className="input-field resize-none"
          placeholder="Any additional notes about this carer..."
        />
      </FormSection>

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
            {carer ? 'Update Carer' : 'Add Carer'}
          </button>
        </div>
      </div>
    </form>
  );
}
