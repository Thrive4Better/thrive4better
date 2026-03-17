import { useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, cn } from '@/lib/utils';
import { exportToCsv } from '@/lib/export-utils';
import StatusBadge from '@/components/ui/StatusBadge';
import SlideOver from '@/components/ui/SlideOver';
import EmptyState from '@/components/ui/EmptyState';
import {
  Search, Plus, Users, ChevronUp, ChevronDown, MoreHorizontal,
  Pencil, Trash2, Upload, Download, X, AlertCircle, CheckCircle2,
  Archive, ArchiveRestore,
} from 'lucide-react';
import type { Client } from '@/types';

// ── Zod Schema ──────────────────────────────────────────────────────────────

const clientSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  ndisNumber: z
    .string()
    .min(1, 'NDIS number is required')
    .regex(/^\d{9}$/, 'NDIS number must be 9 digits'),
  address: z.string().min(1, 'Address is required'),
  suburb: z.string().min(1, 'Suburb is required'),
  postcode: z
    .string()
    .min(1, 'Postcode is required')
    .regex(/^\d{4}$/, 'Postcode must be 4 digits'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Invalid email address'),
  emergencyContactName: z.string().default(''),
  emergencyContactPhone: z.string().default(''),
  preferredCommunication: z.enum(['phone', 'email', 'text']).default('phone'),
  fundingType: z.enum(['Agency Managed', 'Plan Managed', 'Self Managed']),
  planStartDate: z.string().min(1, 'Plan start date is required'),
  planEndDate: z.string().min(1, 'Plan end date is required'),
  planManagerName: z.string().default(''),
  planManagerEmail: z.string().default(''),
  planManagerPhone: z.string().default(''),
  supportCoordinatorName: z.string().default(''),
  supportCoordinatorContact: z.string().default(''),
  nominatedContactName: z.string().default(''),
  nominatedContactPhone: z.string().default(''),
  nominatedContactRelation: z.string().default(''),
  status: z.enum(['Active', 'Inactive', 'On Hold', 'Archived']).default('Active'),
  notes: z.string().default(''),
});

type ClientFormData = z.infer<typeof clientSchema>;

// ── CSV Import types ────────────────────────────────────────────────────────

interface CsvRow {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ndisNumber: string;
  address: string;
  suburb: string;
  postcode: string;
  phone: string;
  email: string;
  fundingType: string;
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

function validateCsvRow(row: CsvRow): string[] {
  const errors: string[] = [];
  if (!row.firstName) errors.push('First Name is required');
  if (!row.lastName) errors.push('Last Name is required');
  if (row.ndisNumber && !/^\d{9}$/.test(row.ndisNumber)) errors.push('NDIS number must be 9 digits');
  if (row.postcode && !/^\d{4}$/.test(row.postcode)) errors.push('Postcode must be 4 digits');
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) errors.push('Invalid email');
  if (row.fundingType && !['Agency Managed', 'Plan Managed', 'Self Managed'].includes(row.fundingType)) {
    errors.push('Invalid funding type');
  }
  if (row.status && !['Active', 'Inactive', 'On Hold'].includes(row.status)) {
    errors.push('Invalid status');
  }
  return errors;
}

function parseCsvFile(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  // Skip header row
  const headerLine = lines[0].toLowerCase();
  const headers = parseCsvLine(headerLine);

  // Map header names to indices
  const colMap: Record<string, number> = {};
  const headerMapping: Record<string, string> = {
    'first name': 'firstName',
    'firstname': 'firstName',
    'last name': 'lastName',
    'lastname': 'lastName',
    'dob': 'dateOfBirth',
    'date of birth': 'dateOfBirth',
    'dateofbirth': 'dateOfBirth',
    'ndis number': 'ndisNumber',
    'ndisnumber': 'ndisNumber',
    'ndis': 'ndisNumber',
    'address': 'address',
    'suburb': 'suburb',
    'postcode': 'postcode',
    'phone': 'phone',
    'email': 'email',
    'funding type': 'fundingType',
    'fundingtype': 'fundingType',
    'status': 'status',
  };

  headers.forEach((h, i) => {
    const mapped = headerMapping[h.trim()];
    if (mapped) colMap[mapped] = i;
  });

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const row: CsvRow = {
      firstName: fields[colMap['firstName'] ?? -1] || '',
      lastName: fields[colMap['lastName'] ?? -1] || '',
      dateOfBirth: fields[colMap['dateOfBirth'] ?? -1] || '',
      ndisNumber: fields[colMap['ndisNumber'] ?? -1] || '',
      address: fields[colMap['address'] ?? -1] || '',
      suburb: fields[colMap['suburb'] ?? -1] || '',
      postcode: fields[colMap['postcode'] ?? -1] || '',
      phone: fields[colMap['phone'] ?? -1] || '',
      email: fields[colMap['email'] ?? -1] || '',
      fundingType: fields[colMap['fundingType'] ?? -1] || 'Plan Managed',
      status: fields[colMap['status'] ?? -1] || 'Active',
      errors: [],
    };
    row.errors = validateCsvRow(row);
    rows.push(row);
  }
  return rows;
}

// ── Sort helpers ────────────────────────────────────────────────────────────

type SortField = 'name' | 'ndisNumber' | 'planManagerName' | 'fundingType' | 'planEndDate' | 'status';
type SortDir = 'asc' | 'desc';

function getSortValue(client: Client, field: SortField): string {
  switch (field) {
    case 'name':
      return `${client.lastName} ${client.firstName}`.toLowerCase();
    case 'ndisNumber':
      return client.ndisNumber;
    case 'planManagerName':
      return client.planManagerName.toLowerCase();
    case 'fundingType':
      return client.fundingType;
    case 'planEndDate':
      return client.planEndDate;
    case 'status':
      return client.status;
  }
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ClientList() {
  const navigate = useNavigate();
  const { clients, shifts, addClient, updateClient, deleteClient } = useStore();
  const { role, carerId } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [fundingFilter, setFundingFilter] = useState<string>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // CSV Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unique funding types for the filter dropdown
  const fundingTypes = ['All', 'Agency Managed', 'Plan Managed', 'Self Managed'];
  const statusOptions = ['All', 'Active', 'Inactive', 'On Hold', 'Archived'];

  // ── Filtering & sorting ─────────────────────────────────────────────────

  // Staff/carers only see clients they have shifts with
  const visibleClients = useMemo(() => {
    if (role === 'admin' || role === 'manager') return clients;
    if (role === 'staff' && carerId) {
      const assignedClientIds = new Set(shifts.filter((s) => s.carerId === carerId).map((s) => s.clientId));
      return clients.filter((c) => assignedClientIds.has(c.id));
    }
    return clients;
  }, [clients, shifts, role, carerId]);

  const filteredClients = useMemo(() => {
    let result = [...visibleClients];

    // Hide archived by default unless toggled or explicitly filtering
    if (!showArchived && statusFilter !== 'Archived') {
      result = result.filter((c) => c.status !== 'Archived');
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.ndisNumber.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((c) => c.status === statusFilter);
    }

    // Funding filter
    if (fundingFilter !== 'All') {
      result = result.filter((c) => c.fundingType === fundingFilter);
    }

    // Sort
    result.sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [clients, search, statusFilter, fundingFilter, sortField, sortDir, showArchived]);

  // ── Form ────────────────────────────────────────────────────────────────

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(clientSchema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      ndisNumber: '',
      address: '',
      suburb: '',
      postcode: '',
      phone: '',
      email: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      preferredCommunication: 'phone' as const,
      fundingType: 'Plan Managed' as const,
      planStartDate: '',
      planEndDate: '',
      planManagerName: '',
      planManagerEmail: '',
      planManagerPhone: '',
      supportCoordinatorName: '',
      supportCoordinatorContact: '',
      nominatedContactName: '',
      nominatedContactPhone: '',
      nominatedContactRelation: '',
      status: 'Active' as const,
      notes: '',
    },
  });

  function openAddForm() {
    setEditingClient(null);
    reset({
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      ndisNumber: '',
      address: '',
      suburb: '',
      postcode: '',
      phone: '',
      email: '',
      emergencyContactName: '',
      emergencyContactPhone: '',
      preferredCommunication: 'phone',
      fundingType: 'Agency Managed',
      planStartDate: '',
      planEndDate: '',
      planManagerName: '',
      planManagerEmail: '',
      planManagerPhone: '',
      supportCoordinatorName: '',
      supportCoordinatorContact: '',
      nominatedContactName: '',
      nominatedContactPhone: '',
      nominatedContactRelation: '',
      status: 'Active',
      notes: '',
    });
    setSlideOpen(true);
  }

  function openEditForm(client: Client) {
    setEditingClient(client);
    reset({
      firstName: client.firstName,
      lastName: client.lastName,
      dateOfBirth: client.dateOfBirth,
      ndisNumber: client.ndisNumber,
      address: client.address,
      suburb: client.suburb,
      postcode: client.postcode,
      phone: client.phone,
      email: client.email,
      emergencyContactName: client.emergencyContactName,
      emergencyContactPhone: client.emergencyContactPhone,
      preferredCommunication: client.preferredCommunication,
      fundingType: client.fundingType,
      planStartDate: client.planStartDate,
      planEndDate: client.planEndDate,
      planManagerName: client.planManagerName,
      planManagerEmail: client.planManagerEmail,
      planManagerPhone: client.planManagerPhone,
      supportCoordinatorName: client.supportCoordinatorName,
      supportCoordinatorContact: client.supportCoordinatorContact,
      nominatedContactName: client.nominatedContactName || '',
      nominatedContactPhone: client.nominatedContactPhone || '',
      nominatedContactRelation: client.nominatedContactRelation || '',
      status: client.status,
      notes: client.notes,
    });
    setSlideOpen(true);
    setMenuOpenId(null);
  }

  async function onSubmit(data: ClientFormData) {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, data);
        toast.success(`${data.firstName} ${data.lastName} updated successfully`);
      } else {
        await addClient({ ...data, supportCategories: [] });
        toast.success(`${data.firstName} ${data.lastName} added successfully`);
      }
      setSlideOpen(false);
      reset();
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  function handleDelete(client: Client) {
    deleteClient(client.id);
    toast.success(`${client.firstName} ${client.lastName} deleted`);
    setMenuOpenId(null);
  }

  async function handleArchive(client: Client) {
    await updateClient(client.id, { status: 'Archived' });
    toast.success(`${client.firstName} ${client.lastName} archived`);
    setMenuOpenId(null);
  }

  async function handleUnarchive(client: Client) {
    await updateClient(client.id, { status: 'Active' });
    toast.success(`${client.firstName} ${client.lastName} restored`);
    setMenuOpenId(null);
  }

  // ── Sort handler ────────────────────────────────────────────────────────

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ChevronUp size={14} className="text-mid-gray/40" />;
    return sortDir === 'asc' ? (
      <ChevronUp size={14} className="text-forest" />
    ) : (
      <ChevronDown size={14} className="text-forest" />
    );
  }

  // ── CSV Export ──────────────────────────────────────────────────────────

  const handleExportCsv = useCallback(() => {
    const headers = [
      'First Name', 'Last Name', 'DOB', 'NDIS Number', 'Address', 'Suburb',
      'Postcode', 'Phone', 'Email', 'Funding Type', 'Status',
    ];
    const rows = filteredClients.map((c) => [
      c.firstName, c.lastName, c.dateOfBirth, c.ndisNumber, c.address, c.suburb,
      c.postcode, c.phone, c.email, c.fundingType, c.status,
    ]);
    exportToCsv(`clients-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  }, [filteredClients]);

  // ── CSV Import ──────────────────────────────────────────────────────────

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCsvFile(text);
      setCsvRows(rows);
      setImportResult(null);
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-selected
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
      if (row.errors.length > 0) {
        skipped++;
        continue;
      }
      try {
        await addClient({
          firstName: row.firstName,
          lastName: row.lastName,
          dateOfBirth: row.dateOfBirth,
          ndisNumber: row.ndisNumber,
          address: row.address,
          suburb: row.suburb,
          postcode: row.postcode,
          phone: row.phone,
          email: row.email,
          emergencyContactName: '',
          emergencyContactPhone: '',
          preferredCommunication: 'phone',
          fundingType: (row.fundingType as 'Agency Managed' | 'Plan Managed' | 'Self Managed') || 'Plan Managed',
          planStartDate: '',
          planEndDate: '',
          planManagerName: '',
          planManagerEmail: '',
          planManagerPhone: '',
          supportCoordinatorName: '',
          supportCoordinatorContact: '',
          status: (row.status as 'Active' | 'Inactive' | 'On Hold') || 'Active',
          notes: '',
          supportCategories: [],
        });
        imported++;
      } catch {
        skipped++;
      }
    }
    setImporting(false);
    setImportResult({ imported, skipped });
    toast.success(`Imported ${imported} client${imported !== 1 ? 's' : ''}`);
  }, [csvRows, addClient]);

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal">Clients</h1>
          <p className="text-sm text-mid-gray mt-1">
            {clients.length} participant{clients.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setImportModalOpen(true); setCsvRows([]); setImportResult(null); }}
            className="btn-ghost flex items-center gap-2"
          >
            <Upload size={16} /> Import CSV
          </button>
          <button onClick={handleExportCsv} className="btn-ghost flex items-center gap-2">
            <Download size={16} /> Export CSV
          </button>
          <button onClick={openAddForm} className="btn-primary">
            <Plus size={16} /> Add Client
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
            <input
              type="text"
              placeholder="Search by name, NDIS number, email or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-full"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field min-w-[140px]"
          >
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'All Statuses' : s}
              </option>
            ))}
          </select>
          <select
            value={fundingFilter}
            onChange={(e) => setFundingFilter(e.target.value)}
            className="input-field min-w-[160px]"
          >
            {fundingTypes.map((f) => (
              <option key={f} value={f}>
                {f === 'All' ? 'All Funding Types' : f}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-sm text-mid-gray cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-sage text-forest focus:ring-forest"
            />
            Show archived
          </label>
        </div>
      </div>

      {/* Table */}
      {filteredClients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description={search || statusFilter !== 'All' || fundingFilter !== 'All'
            ? 'Try adjusting your search or filters'
            : 'Get started by adding your first client'}
          action={!search && statusFilter === 'All' && fundingFilter === 'All'
            ? { label: 'Add Client', onClick: openAddForm }
            : undefined}
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sage-pale">
                  <th
                    className="table-header cursor-pointer select-none"
                    onClick={() => handleSort('name')}
                  >
                    <span className="flex items-center gap-1">Name <SortIcon field="name" /></span>
                  </th>
                  <th
                    className="table-header cursor-pointer select-none"
                    onClick={() => handleSort('ndisNumber')}
                  >
                    <span className="flex items-center gap-1">NDIS Number <SortIcon field="ndisNumber" /></span>
                  </th>
                  <th
                    className="table-header cursor-pointer select-none"
                    onClick={() => handleSort('planManagerName')}
                  >
                    <span className="flex items-center gap-1">Plan Manager <SortIcon field="planManagerName" /></span>
                  </th>
                  <th
                    className="table-header cursor-pointer select-none"
                    onClick={() => handleSort('fundingType')}
                  >
                    <span className="flex items-center gap-1">Funding Type <SortIcon field="fundingType" /></span>
                  </th>
                  <th
                    className="table-header cursor-pointer select-none"
                    onClick={() => handleSort('planEndDate')}
                  >
                    <span className="flex items-center gap-1">Plan Expiry <SortIcon field="planEndDate" /></span>
                  </th>
                  <th
                    className="table-header cursor-pointer select-none"
                    onClick={() => handleSort('status')}
                  >
                    <span className="flex items-center gap-1">Status <SortIcon field="status" /></span>
                  </th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((client) => (
                  <tr
                    key={client.id}
                    className={cn(
                      'border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors',
                      client.status === 'Archived' && 'opacity-50'
                    )}
                  >
                    <td className="table-cell">
                      <button
                        onClick={() => navigate(`/clients/${client.id}`)}
                        className="font-medium text-forest hover:text-forest-mid transition-colors text-left"
                      >
                        {client.firstName} {client.lastName}
                      </button>
                    </td>
                    <td className="table-cell font-mono text-sm">{client.ndisNumber}</td>
                    <td className="table-cell">{client.planManagerName || '\u2014'}</td>
                    <td className="table-cell">
                      <span className="badge bg-sage-pale text-forest">{client.fundingType}</span>
                    </td>
                    <td className="table-cell">{formatDate(client.planEndDate)}</td>
                    <td className="table-cell">
                      <StatusBadge status={client.status} />
                    </td>
                    <td className="table-cell">
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === client.id ? null : client.id)}
                          className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors"
                        >
                          <MoreHorizontal size={16} className="text-mid-gray" />
                        </button>
                        {menuOpenId === client.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpenId(null)} />
                            <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-sage-pale py-1 min-w-[140px]">
                              <button
                                onClick={() => openEditForm(client)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-charcoal hover:bg-sage-pale/50 transition-colors"
                              >
                                <Pencil size={14} /> Edit
                              </button>
                              {client.status === 'Archived' ? (
                                <button
                                  onClick={() => handleUnarchive(client)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-forest hover:bg-sage-pale/50 transition-colors"
                                >
                                  <ArchiveRestore size={14} /> Unarchive
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleArchive(client)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-amber-600 hover:bg-amber-50 transition-colors"
                                >
                                  <Archive size={14} /> Archive
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(client)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </>
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

      {/* CSV Import Modal */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setImportModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-charcoal">Import Clients from CSV</h2>
              <button onClick={() => setImportModalOpen(false)} className="p-1.5 rounded-lg hover:bg-sage-pale">
                <X size={18} className="text-mid-gray" />
              </button>
            </div>

            {csvRows.length === 0 && !importResult && (
              <div className="space-y-4">
                <p className="text-sm text-mid-gray">
                  Upload a CSV file with the following columns: First Name, Last Name, DOB, NDIS Number, Address, Suburb, Postcode, Phone, Email, Funding Type, Status
                </p>
                <div className="border-2 border-dashed border-sage-pale rounded-xl p-8 text-center">
                  <Upload size={32} className="mx-auto text-sage mb-3" />
                  <p className="text-sm text-mid-gray mb-3">Drag and drop a CSV file or click to browse</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary"
                  >
                    Choose File
                  </button>
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
                  <button
                    onClick={() => { setCsvRows([]); }}
                    className="text-sm text-mid-gray hover:text-charcoal"
                  >
                    Clear
                  </button>
                </div>

                <div className="overflow-x-auto border border-sage-pale rounded-xl">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-sage-pale bg-sage-pale/30">
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Status</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">First Name</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Last Name</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">NDIS Number</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Email</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Funding</th>
                        <th className="px-3 py-2 text-left font-medium text-charcoal">Errors</th>
                      </tr>
                    </thead>
                    <tbody>
                      {csvRows.map((row, i) => (
                        <tr key={i} className={cn('border-b border-sage-pale/50', row.errors.length > 0 && 'bg-red-50/50')}>
                          <td className="px-3 py-2">
                            {row.errors.length === 0 ? (
                              <CheckCircle2 size={16} className="text-green-500" />
                            ) : (
                              <AlertCircle size={16} className="text-red-500" />
                            )}
                          </td>
                          <td className="px-3 py-2">{row.firstName}</td>
                          <td className="px-3 py-2">{row.lastName}</td>
                          <td className="px-3 py-2 font-mono">{row.ndisNumber}</td>
                          <td className="px-3 py-2">{row.email}</td>
                          <td className="px-3 py-2">{row.fundingType}</td>
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
                    {importing ? 'Importing...' : `Import ${csvRows.filter((r) => r.errors.length === 0).length} Client${csvRows.filter((r) => r.errors.length === 0).length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}

            {importResult && (
              <div className="space-y-4 text-center py-6">
                <CheckCircle2 size={48} className="mx-auto text-green-500" />
                <h3 className="text-lg font-semibold text-charcoal">Import Complete</h3>
                <p className="text-sm text-mid-gray">
                  {importResult.imported} client{importResult.imported !== 1 ? 's' : ''} imported successfully.
                  {importResult.skipped > 0 && ` ${importResult.skipped} row${importResult.skipped !== 1 ? 's' : ''} skipped.`}
                </p>
                <button onClick={() => setImportModalOpen(false)} className="btn-primary">
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-over form */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editingClient ? 'Edit Client' : 'Add New Client'}
        wide
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Details */}
          <fieldset>
            <legend className="text-sm font-semibold text-charcoal mb-3">Personal Details</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">First Name *</label>
                <input {...register('firstName')} className={cn('input-field w-full', errors.firstName && 'border-red-400')} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Last Name *</label>
                <input {...register('lastName')} className={cn('input-field w-full', errors.lastName && 'border-red-400')} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Date of Birth *</label>
                <input type="date" {...register('dateOfBirth')} className={cn('input-field w-full', errors.dateOfBirth && 'border-red-400')} />
                {errors.dateOfBirth && <p className="text-xs text-red-500 mt-1">{errors.dateOfBirth.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">NDIS Number *</label>
                <input {...register('ndisNumber')} placeholder="123456789" className={cn('input-field w-full', errors.ndisNumber && 'border-red-400')} />
                {errors.ndisNumber && <p className="text-xs text-red-500 mt-1">{errors.ndisNumber.message}</p>}
              </div>
            </div>
          </fieldset>

          {/* Contact */}
          <fieldset>
            <legend className="text-sm font-semibold text-charcoal mb-3">Contact</legend>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-mid-gray mb-1 block">Address *</label>
                <input {...register('address')} className={cn('input-field w-full', errors.address && 'border-red-400')} />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Suburb *</label>
                <input {...register('suburb')} className={cn('input-field w-full', errors.suburb && 'border-red-400')} />
                {errors.suburb && <p className="text-xs text-red-500 mt-1">{errors.suburb.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Postcode *</label>
                <input {...register('postcode')} placeholder="3000" className={cn('input-field w-full', errors.postcode && 'border-red-400')} />
                {errors.postcode && <p className="text-xs text-red-500 mt-1">{errors.postcode.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Phone *</label>
                <input {...register('phone')} className={cn('input-field w-full', errors.phone && 'border-red-400')} />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Email *</label>
                <input type="email" {...register('email')} className={cn('input-field w-full', errors.email && 'border-red-400')} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Preferred Communication</label>
                <select {...register('preferredCommunication')} className="input-field w-full">
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="text">Text</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* Emergency Contact */}
          <fieldset>
            <legend className="text-sm font-semibold text-charcoal mb-3">Emergency Contact</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Contact Name</label>
                <input {...register('emergencyContactName')} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Contact Phone</label>
                <input {...register('emergencyContactPhone')} className="input-field w-full" />
              </div>
            </div>
          </fieldset>

          {/* NDIS Funding */}
          <fieldset>
            <legend className="text-sm font-semibold text-charcoal mb-3">NDIS Funding</legend>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-mid-gray mb-1 block">Funding Type *</label>
                <select {...register('fundingType')} className={cn('input-field w-full', errors.fundingType && 'border-red-400')}>
                  <option value="Agency Managed">Agency Managed</option>
                  <option value="Plan Managed">Plan Managed</option>
                  <option value="Self Managed">Self Managed</option>
                </select>
                {errors.fundingType && <p className="text-xs text-red-500 mt-1">{errors.fundingType.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Plan Start Date *</label>
                <input type="date" {...register('planStartDate')} className={cn('input-field w-full', errors.planStartDate && 'border-red-400')} />
                {errors.planStartDate && <p className="text-xs text-red-500 mt-1">{errors.planStartDate.message}</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Plan End Date *</label>
                <input type="date" {...register('planEndDate')} className={cn('input-field w-full', errors.planEndDate && 'border-red-400')} />
                {errors.planEndDate && <p className="text-xs text-red-500 mt-1">{errors.planEndDate.message}</p>}
              </div>
            </div>
          </fieldset>

          {/* Plan Manager */}
          <fieldset>
            <legend className="text-sm font-semibold text-charcoal mb-3">Plan Manager</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Name</label>
                <input {...register('planManagerName')} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Email</label>
                <input type="email" {...register('planManagerEmail')} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Phone</label>
                <input {...register('planManagerPhone')} className="input-field w-full" />
              </div>
            </div>
          </fieldset>

          {/* Support Coordinator */}
          <fieldset>
            <legend className="text-sm font-semibold text-charcoal mb-3">Support Coordinator</legend>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Name</label>
                <input {...register('supportCoordinatorName')} className="input-field w-full" />
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Contact</label>
                <input {...register('supportCoordinatorContact')} className="input-field w-full" />
              </div>
            </div>
          </fieldset>

          {/* Nominated Contact (SMS Reminders) */}
          <fieldset>
            <legend className="text-sm font-semibold text-charcoal mb-3">Nominated Contact (SMS Reminders)</legend>
            <p className="text-xs text-mid-gray mb-3">This person will receive SMS reminders for appointments and overdue invoices.</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Name</label>
                <input {...register('nominatedContactName')} className="input-field w-full" placeholder="e.g. Jane Smith" />
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Phone</label>
                <input {...register('nominatedContactPhone')} className="input-field w-full" placeholder="04xx xxx xxx" />
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Relation</label>
                <input {...register('nominatedContactRelation')} className="input-field w-full" placeholder="e.g. Mother, Plan Manager" />
              </div>
            </div>
          </fieldset>

          {/* Status & Notes */}
          <fieldset>
            <legend className="text-sm font-semibold text-charcoal mb-3">Status & Notes</legend>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Status</label>
                <select {...register('status')} className="input-field w-full">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-mid-gray mb-1 block">Notes</label>
                <textarea {...register('notes')} rows={3} className="input-field w-full resize-none" />
              </div>
            </div>
          </fieldset>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-sage-pale">
            <button type="button" onClick={() => setSlideOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {editingClient ? 'Save Changes' : 'Add Client'}
            </button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}
