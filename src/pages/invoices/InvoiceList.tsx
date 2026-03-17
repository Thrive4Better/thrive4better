import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { exportToCsv, fmtCurrencyPlain } from '@/lib/export-utils';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal';
import TableFilter from '@/components/ui/TableFilter';
import InvoiceBuilder from './InvoiceBuilder';
import NdisRates from './NdisRates';
import {
  FileText,
  Plus,
  DollarSign,
  AlertCircle,
  Clock,
  CheckCircle2,
  Download,
  ArrowUpDown,
  Pencil,
  Send,
  CreditCard,
  Mail,
  Loader2,
  Archive,
  ArchiveRestore,
  Ban,
  X,
  Eye,
} from 'lucide-react';
import { parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import InvoicePdf from './InvoicePdf';
import type { Invoice, InvoiceApprovalStatus, Client } from '@/types';

type InvoiceStatus = 'All' | 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void' | 'Archived';
type ApprovalFilter = 'all' | 'pending_approval' | 'approved' | 'rejected';
type SortField = 'invoiceNumber' | 'clientName' | 'periodStart' | 'lineItems' | 'subtotal' | 'gstAmount' | 'total' | 'dueDate';

const APPROVAL_LABELS: Record<InvoiceApprovalStatus, string> = {
  draft: 'Draft',
  pending_approval: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  sent: 'Sent to Plan Manager',
};

function ApprovalBadge({ status }: { status?: InvoiceApprovalStatus }) {
  if (!status || status === 'draft') return null;
  const styles: Record<string, string> = {
    pending_approval: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
    sent: 'bg-blue-100 text-blue-800 border-blue-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${styles[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {status === 'pending_approval' && <Clock size={11} />}
      {status === 'approved' && <CheckCircle2 size={11} />}
      {status === 'rejected' && <AlertCircle size={11} />}
      {status === 'sent' && <Send size={11} />}
      {APPROVAL_LABELS[status]}
    </span>
  );
}
type SortDir = 'asc' | 'desc';

export default function InvoiceList() {
  const navigate = useNavigate();
  const { invoices, clients, updateInvoice, getClientById } = useStore();
  const { session, profile, role } = useAuth();

  const [activeTab, setActiveTab] = useState<InvoiceStatus>('All');
  const [approvalFilter, setApprovalFilter] = useState<ApprovalFilter>('all');
  const [sortField, setSortField] = useState<SortField>('invoiceNumber');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // ── Search ──
  const [invoiceSearch, setInvoiceSearch] = useState('');

  // ── Modal state ──
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [builderEditId, setBuilderEditId] = useState<string | undefined>(undefined);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);

  const [nlParsedForBuilder, setNlParsedForBuilder] = useState<any>(null);

  // ── Approval workflow state ──
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [approvalInvoiceId, setApprovalInvoiceId] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalNotes, setApprovalNotes] = useState('');

  const canApprove = role === 'admin' || role === 'manager' || role === 'client';

  const pendingApprovalCount = useMemo(
    () => invoices.filter((i) => i.approvalStatus === 'pending_approval').length,
    [invoices],
  );

  const handleSubmitForApproval = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Submit for Approval?',
      message: 'This will send the invoice to the participant for approval before it can be sent to the plan manager.',
      onConfirm: async () => {
        await updateInvoice(id, { approvalStatus: 'pending_approval' });
        toast.success('Invoice submitted for approval');
        setConfirmModal((m) => ({ ...m, open: false }));
      },
    });
  };

  const openApprovalModal = (id: string, action: 'approve' | 'reject') => {
    setApprovalInvoiceId(id);
    setApprovalAction(action);
    setApprovalNotes('');
    setApprovalModalOpen(true);
  };

  const handleApprovalConfirm = async () => {
    if (!approvalInvoiceId) return;
    const now = new Date().toISOString();
    const approverName = profile?.fullName || 'Unknown';

    if (approvalAction === 'approve') {
      await updateInvoice(approvalInvoiceId, {
        approvalStatus: 'approved',
        approvedBy: approverName,
        approvedAt: now,
        approvalNotes: approvalNotes || undefined,
      });
      toast.success('Invoice approved');
    } else {
      await updateInvoice(approvalInvoiceId, {
        approvalStatus: 'rejected',
        approvedBy: approverName,
        approvedAt: now,
        approvalNotes: approvalNotes || 'Rejected',
      });
      toast.success('Invoice rejected');
    }

    setApprovalModalOpen(false);
    setApprovalInvoiceId(null);
    setApprovalNotes('');
  };

  const handleSendToManager = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Send to Plan Manager?',
      message: 'This invoice has been approved. It will now be marked as sent to the plan manager/coordinator.',
      onConfirm: async () => {
        await updateInvoice(id, { approvalStatus: 'sent', status: 'Sent' });
        toast.success('Invoice sent to plan manager');
        setConfirmModal((m) => ({ ...m, open: false }));
      },
    });
  };

  // ── PDF Download ──
  const handleDownloadPdf = async (invoice: Invoice, client: Client | undefined) => {
    if (!client) {
      toast.error('Client not found for this invoice');
      return;
    }
    setDownloadingId(invoice.id);
    try {
      const blob = await pdf(<InvoicePdf invoice={invoice} client={client} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded Invoice-${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  // ── Email Invoice ──
  const handleSendEmail = async (invoice: Invoice, client: Client | undefined) => {
    if (!client) {
      toast.error('Client not found for this invoice');
      return;
    }
    if (!client.email && !client.planManagerEmail) {
      toast.error('No email address on file for this client');
      return;
    }

    setConfirmModal({
      open: true,
      title: `Send Invoice ${invoice.invoiceNumber}?`,
      message: `This will email the invoice to ${client.fundingType === 'Plan Managed' && client.planManagerEmail ? client.planManagerEmail : client.email}. The invoice status will be updated to "Sent".`,
      onConfirm: async () => {
        setConfirmModal((m) => ({ ...m, open: false }));
        setSendingId(invoice.id);
        try {
          // Generate PDF as base64
          const blob = await pdf(<InvoicePdf invoice={invoice} client={client} />).toBlob();
          const buffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const pdfBase64 = btoa(binary);

          const token = session?.access_token;
          if (!token) {
            toast.error('You must be logged in to send invoices');
            return;
          }

          const res = await fetch('/api/send-invoice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              invoiceId: invoice.id,
              pdfBase64,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to send invoice');
          }

          updateInvoice(invoice.id, { status: 'Sent', approvalStatus: invoice.approvalStatus === 'approved' ? 'sent' : invoice.approvalStatus });
          toast.success(data.message || `Invoice ${invoice.invoiceNumber} sent successfully`);
        } catch (err) {
          console.error('Send invoice error:', err);
          toast.error(err instanceof Error ? err.message : 'Failed to send invoice');
        } finally {
          setSendingId(null);
        }
      },
    });
  };

  // ── KPIs ──
  const kpis = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const outstanding = invoices
      .filter((i) => i.status === 'Sent' || i.status === 'Overdue')
      .reduce((sum, i) => sum + i.total, 0);

    const overdue = invoices
      .filter((i) => i.status === 'Overdue')
      .reduce((sum, i) => sum + i.total, 0);

    const dueThisWeek = invoices
      .filter((i) => {
        if (i.status === 'Paid') return false;
        try {
          const due = parseISO(i.dueDate);
          return isWithinInterval(due, { start: weekStart, end: weekEnd });
        } catch {
          return false;
        }
      })
      .reduce((sum, i) => sum + i.total, 0);

    const paidThisMonth = invoices
      .filter((i) => {
        if (i.status !== 'Paid') return false;
        try {
          const inv = parseISO(i.invoiceDate);
          return isWithinInterval(inv, { start: monthStart, end: monthEnd });
        } catch {
          return false;
        }
      })
      .reduce((sum, i) => sum + i.total, 0);

    return { outstanding, overdue, dueThisWeek, paidThisMonth };
  }, [invoices]);

  // ── Filtered + sorted list ──
  const filteredInvoices = useMemo(() => {
    let list = [...invoices];

    // Hide archived/void by default unless toggled or explicitly filtering
    if (!showArchived && activeTab !== 'Archived' && activeTab !== 'Void') {
      list = list.filter((i) => i.status !== 'Archived' && i.status !== 'Void');
    }

    if (activeTab !== 'All') {
      list = list.filter((i) => i.status === activeTab);
    }

    // Approval filter
    if (approvalFilter !== 'all') {
      list = list.filter((i) => i.approvalStatus === approvalFilter);
    }

    // Keyword search
    if (invoiceSearch.trim()) {
      const q = invoiceSearch.toLowerCase();
      list = list.filter((i) => {
        const client = getClientById(i.clientId);
        const clientName = client ? `${client.firstName} ${client.lastName}`.toLowerCase() : '';
        return (
          i.invoiceNumber.toLowerCase().includes(q) ||
          clientName.includes(q) ||
          i.status.toLowerCase().includes(q)
        );
      });
    }

    const getClientName = (clientId: string) => {
      const c = getClientById(clientId);
      return c ? `${c.lastName}, ${c.firstName}` : '';
    };

    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'invoiceNumber':
          cmp = a.invoiceNumber.localeCompare(b.invoiceNumber);
          break;
        case 'clientName':
          cmp = getClientName(a.clientId).localeCompare(getClientName(b.clientId));
          break;
        case 'periodStart':
          cmp = a.periodStart.localeCompare(b.periodStart);
          break;
        case 'lineItems':
          cmp = a.lineItems.length - b.lineItems.length;
          break;
        case 'subtotal':
          cmp = a.subtotal - b.subtotal;
          break;
        case 'gstAmount':
          cmp = a.gstAmount - b.gstAmount;
          break;
        case 'total':
          cmp = a.total - b.total;
          break;
        case 'dueDate':
          cmp = a.dueDate.localeCompare(b.dueDate);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [invoices, activeTab, sortField, sortDir, getClientById, showArchived, invoiceSearch, approvalFilter]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((i) => i.id)));
    }
  };

  const handleMarkAsPaid = (id: string) => {
    updateInvoice(id, { status: 'Paid' });
    toast.success('Invoice marked as paid');
  };

  const handleVoid = (id: string) => {
    setConfirmModal({
      open: true,
      title: 'Void Invoice?',
      message: 'This will mark the invoice as void. It will be hidden from default views.',
      onConfirm: () => {
        updateInvoice(id, { status: 'Void' });
        toast.success('Invoice voided');
        setConfirmModal((m) => ({ ...m, open: false }));
      },
    });
  };

  const handleArchiveInvoice = (id: string) => {
    updateInvoice(id, { status: 'Archived' });
    toast.success('Invoice archived');
  };

  const handleUnarchiveInvoice = (id: string) => {
    updateInvoice(id, { status: 'Draft' });
    toast.success('Invoice restored to Draft');
  };

  const handleBulkAction = (status: 'Sent' | 'Paid') => {
    const label = status === 'Sent' ? 'sent' : 'paid';
    setConfirmModal({
      open: true,
      title: `Mark ${selectedIds.size} invoice(s) as ${label}?`,
      message: `This will update the status of ${selectedIds.size} selected invoice(s) to "${status}".`,
      onConfirm: () => {
        selectedIds.forEach((id) => updateInvoice(id, { status }));
        toast.success(`${selectedIds.size} invoice(s) marked as ${label}`);
        setSelectedIds(new Set());
        setConfirmModal((m) => ({ ...m, open: false }));
      },
    });
  };

  const openBuilderNew = () => {
    setBuilderEditId(undefined);
    setNlParsedForBuilder(null);
    setBuilderModalOpen(true);
  };

  const openBuilderEdit = (id: string) => {
    setBuilderEditId(id);
    setNlParsedForBuilder(null);
    setBuilderModalOpen(true);
  };

  const closeBuilderModal = () => {
    setBuilderModalOpen(false);
    setBuilderEditId(undefined);
    setNlParsedForBuilder(null);
  };

  const tabs: InvoiceStatus[] = ['All', 'Draft', 'Sent', 'Paid', 'Overdue', 'Void', 'Archived'];

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="table-header cursor-pointer select-none hover:text-charcoal"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <ArrowUpDown size={12} className={cn(sortField === field ? 'text-forest' : 'text-mid-gray/40')} />
      </span>
    </th>
  );

  const kpiCards = [
    { label: 'Total Outstanding', value: kpis.outstanding, icon: DollarSign, color: 'text-forest', isCount: false },
    { label: 'Overdue', value: kpis.overdue, icon: AlertCircle, color: 'text-burgundy', isCount: false },
    { label: 'Pending Approval', value: pendingApprovalCount, icon: Clock, color: 'text-amber-600', isCount: true },
    { label: 'Paid This Month', value: kpis.paidThisMonth, icon: CheckCircle2, color: 'text-green-600', isCount: false },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-charcoal">Invoices</h1>
          <p className="text-sm text-mid-gray mt-1">Manage and track NDIS invoices</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => {
              const headers = ['Invoice Number', 'Client Name', 'Invoice Date', 'Due Date', 'Status', 'Approval Status', 'Subtotal', 'GST', 'Total'];
              const rows = filteredInvoices.map((inv) => {
                const c = getClientById(inv.clientId);
                const clientName = c ? `${c.firstName} ${c.lastName}` : 'Unknown';
                return [
                  inv.invoiceNumber,
                  clientName,
                  inv.invoiceDate,
                  inv.dueDate,
                  inv.status,
                  inv.approvalStatus ? APPROVAL_LABELS[inv.approvalStatus] : '',
                  fmtCurrencyPlain(inv.subtotal),
                  fmtCurrencyPlain(inv.gstAmount),
                  fmtCurrencyPlain(inv.total),
                ];
              });
              exportToCsv('invoices.csv', headers, rows);
            }}
            className="btn-secondary min-h-[44px]"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button onClick={() => setRatesModalOpen(true)} className="btn-secondary min-h-[44px]">
            <DollarSign size={16} />
            <span className="hidden sm:inline">NDIS Rates</span>
            <span className="sm:hidden">Rates</span>
          </button>
          <button onClick={openBuilderNew} className="btn-primary min-h-[44px]">
            <Plus size={16} />
            New Invoice
          </button>
        </div>
      </div>

      {/* Invoice Search */}
      <TableFilter
        searchValue={invoiceSearch}
        onSearchChange={setInvoiceSearch}
        searchPlaceholder="Search by invoice #, client name, status..."
        onClearFilters={() => setInvoiceSearch('')}
        resultCount={filteredInvoices.length}
        totalCount={invoices.length}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div
            key={kpi.label}
            className={cn(
              'card flex items-center gap-4',
              kpi.label === 'Pending Approval' && pendingApprovalCount > 0 && 'ring-2 ring-amber-300 cursor-pointer',
            )}
            onClick={kpi.label === 'Pending Approval' && pendingApprovalCount > 0 ? () => setApprovalFilter('pending_approval') : undefined}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-sage-pale', kpi.color)}>
              <kpi.icon size={20} />
            </div>
            <div>
              <p className="text-xs text-mid-gray font-medium">{kpi.label}</p>
              <p className="text-lg font-bold text-charcoal">
                {kpi.isCount ? kpi.value : formatCurrency(kpi.value)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Bulk Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <div className="flex gap-1 bg-sage-pale rounded-lg p-1 w-max">
            {tabs.map((tab) => {
              const count = tab === 'All' ? invoices.length : invoices.filter((i) => i.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
                  className={cn(
                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] sm:min-h-0',
                    activeTab === tab ? 'bg-white text-forest shadow-sm' : 'text-mid-gray hover:text-charcoal'
                  )}
                >
                  {tab} <span className="ml-1 text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <label className="flex items-center gap-2 text-sm text-mid-gray cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-sage text-forest focus:ring-forest"
            />
            Show archived/void
          </label>
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value as ApprovalFilter)}
            className="text-sm border border-sage-light rounded-lg px-2 py-1.5 text-charcoal focus:ring-forest focus:border-forest bg-white"
          >
            <option value="all">All Approval States</option>
            <option value="pending_approval">Pending Approval ({invoices.filter(i => i.approvalStatus === 'pending_approval').length})</option>
            <option value="approved">Approved ({invoices.filter(i => i.approvalStatus === 'approved').length})</option>
            <option value="rejected">Rejected ({invoices.filter(i => i.approvalStatus === 'rejected').length})</option>
          </select>
          {selectedIds.size > 0 && (
            <>
              <button onClick={() => handleBulkAction('Sent')} className="btn-secondary text-sm min-h-[44px]">
                <Send size={14} />
                Mark as Sent ({selectedIds.size})
              </button>
              <button onClick={() => handleBulkAction('Paid')} className="btn-primary text-sm min-h-[44px]">
                <CreditCard size={14} />
                Mark as Paid ({selectedIds.size})
              </button>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description={activeTab === 'All' ? 'Create your first invoice to get started.' : `No ${activeTab.toLowerCase()} invoices.`}
            action={{ label: 'New Invoice', onClick: openBuilderNew }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-sage-pale/50 border-b border-sage-light">
                <tr>
                  <th className="table-header w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-sage-light text-forest focus:ring-forest/30"
                    />
                  </th>
                  <SortHeader field="invoiceNumber">Invoice #</SortHeader>
                  <SortHeader field="clientName">Client</SortHeader>
                  <SortHeader field="periodStart">Period</SortHeader>
                  <SortHeader field="lineItems">Items</SortHeader>
                  <SortHeader field="subtotal">Subtotal</SortHeader>
                  <SortHeader field="gstAmount">GST</SortHeader>
                  <SortHeader field="total">Total</SortHeader>
                  <th className="table-header">Status</th>
                  <th className="table-header">Approval</th>
                  <SortHeader field="dueDate">Due Date</SortHeader>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-pale">
                {filteredInvoices.map((invoice) => {
                  const client = getClientById(invoice.clientId);
                  const clientName = client ? `${client.firstName} ${client.lastName}` : 'Unknown';
                  return (
                    <tr
                      key={invoice.id}
                      className={cn(
                        'hover:bg-sage-pale/30 transition-colors',
                        (invoice.status === 'Archived' || invoice.status === 'Void') && 'opacity-50'
                      )}
                    >
                      <td className="table-cell">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(invoice.id)}
                          onChange={() => toggleSelect(invoice.id)}
                          className="rounded border-sage-light text-forest focus:ring-forest/30"
                        />
                      </td>
                      <td className="table-cell font-medium text-forest">{invoice.invoiceNumber}</td>
                      <td className="table-cell">{clientName}</td>
                      <td className="table-cell text-sm">
                        {formatDate(invoice.periodStart)} &ndash; {formatDate(invoice.periodEnd)}
                      </td>
                      <td className="table-cell text-center">{invoice.lineItems.length}</td>
                      <td className="table-cell">{formatCurrency(invoice.subtotal)}</td>
                      <td className="table-cell">{formatCurrency(invoice.gstAmount)}</td>
                      <td className="table-cell font-semibold">{formatCurrency(invoice.total)}</td>
                      <td className="table-cell">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="table-cell">
                        <ApprovalBadge status={invoice.approvalStatus} />
                      </td>
                      <td className="table-cell">{formatDate(invoice.dueDate)}</td>
                      <td className="table-cell">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openBuilderEdit(invoice.id)}
                            className="p-1.5 rounded-lg hover:bg-sage-pale text-mid-gray hover:text-forest transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDownloadPdf(invoice, client)}
                            disabled={downloadingId === invoice.id}
                            className="p-1.5 rounded-lg hover:bg-sage-pale text-mid-gray hover:text-forest transition-colors disabled:opacity-50"
                            title="Download PDF"
                          >
                            {downloadingId === invoice.id ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                          </button>
                          <button
                            onClick={() => handleSendEmail(invoice, client)}
                            disabled={sendingId === invoice.id}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-mid-gray hover:text-blue-600 transition-colors disabled:opacity-50"
                            title="Send Invoice Email"
                          >
                            {sendingId === invoice.id ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                          </button>
                          {/* Approval workflow buttons */}
                          {invoice.status === 'Draft' && (!invoice.approvalStatus || invoice.approvalStatus === 'draft' || invoice.approvalStatus === 'rejected') && (
                            <button
                              onClick={() => handleSubmitForApproval(invoice.id)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-mid-gray hover:text-amber-600 transition-colors"
                              title="Submit for Approval"
                            >
                              <Eye size={15} />
                            </button>
                          )}
                          {canApprove && invoice.approvalStatus === 'pending_approval' && (
                            <>
                              <button
                                onClick={() => openApprovalModal(invoice.id, 'approve')}
                                className="p-1.5 rounded-lg hover:bg-green-50 text-mid-gray hover:text-green-600 transition-colors"
                                title="Approve Invoice"
                              >
                                <CheckCircle2 size={15} />
                              </button>
                              <button
                                onClick={() => openApprovalModal(invoice.id, 'reject')}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-mid-gray hover:text-red-500 transition-colors"
                                title="Reject Invoice"
                              >
                                <X size={15} />
                              </button>
                            </>
                          )}
                          {invoice.approvalStatus === 'approved' && invoice.status !== 'Sent' && invoice.status !== 'Paid' && (
                            <button
                              onClick={() => handleSendToManager(invoice.id)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-mid-gray hover:text-blue-600 transition-colors"
                              title="Send to Plan Manager"
                            >
                              <Send size={15} />
                            </button>
                          )}
                          {invoice.status !== 'Paid' && invoice.status !== 'Void' && invoice.status !== 'Archived' && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-mid-gray hover:text-green-600 transition-colors"
                              title="Mark as Paid"
                            >
                              <CreditCard size={15} />
                            </button>
                          )}
                          {invoice.status !== 'Void' && invoice.status !== 'Archived' && (
                            <button
                              onClick={() => handleVoid(invoice.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-mid-gray hover:text-red-500 transition-colors"
                              title="Void Invoice"
                            >
                              <Ban size={15} />
                            </button>
                          )}
                          {invoice.status === 'Archived' || invoice.status === 'Void' ? (
                            <button
                              onClick={() => handleUnarchiveInvoice(invoice.id)}
                              className="p-1.5 rounded-lg hover:bg-sage-pale text-mid-gray hover:text-forest transition-colors"
                              title="Restore"
                            >
                              <ArchiveRestore size={15} />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleArchiveInvoice(invoice.id)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-mid-gray hover:text-amber-600 transition-colors"
                              title="Archive"
                            >
                              <Archive size={15} />
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
        )}
      </div>

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal((m) => ({ ...m, open: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />

      {/* Invoice Builder Modal */}
      {builderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={closeBuilderModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[95vw] xl:max-w-[1400px] mx-4 h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-sage-pale bg-sage-pale/30 flex-shrink-0">
              <h2 className="text-lg font-semibold text-charcoal">
                {builderEditId ? 'Edit Invoice' : 'New Invoice'}
              </h2>
              <button
                onClick={closeBuilderModal}
                className="p-2 hover:bg-sage-pale rounded-lg transition-colors"
              >
                <X size={18} className="text-mid-gray" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <InvoiceBuilder
                modalMode
                editId={builderEditId}
                onClose={closeBuilderModal}
                initialParsedData={nlParsedForBuilder}
              />
            </div>
          </div>
        </div>
      )}

      {/* NDIS Rates Modal */}
      {ratesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setRatesModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-[95vw] xl:max-w-[1200px] mx-4 h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-sage-pale bg-sage-pale/30 flex-shrink-0">
              <h2 className="text-lg font-semibold text-charcoal">NDIS Support Item Rates</h2>
              <button
                onClick={() => setRatesModalOpen(false)}
                className="p-2 hover:bg-sage-pale rounded-lg transition-colors"
              >
                <X size={18} className="text-mid-gray" />
              </button>
            </div>
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              <NdisRates modalMode onClose={() => setRatesModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Invoice Approval Modal */}
      {approvalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setApprovalModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className={cn(
              'px-6 py-4',
              approvalAction === 'approve' ? 'bg-emerald-50 border-b border-emerald-100' : 'bg-red-50 border-b border-red-100',
            )}>
              <h2 className={cn(
                'text-lg font-semibold',
                approvalAction === 'approve' ? 'text-emerald-800' : 'text-red-800',
              )}>
                {approvalAction === 'approve' ? 'Approve Invoice' : 'Reject Invoice'}
              </h2>
              <p className="text-sm mt-1 opacity-70">
                {approvalAction === 'approve'
                  ? 'Once approved, this invoice can be sent to the plan manager.'
                  : 'Please provide a reason for rejecting this invoice.'}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {(() => {
                const inv = invoices.find((i) => i.id === approvalInvoiceId);
                const client = inv ? getClientById(inv.clientId) : undefined;
                return inv ? (
                  <div className="bg-sage-pale/50 rounded-lg p-3 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-mid-gray">Invoice</span>
                      <span className="font-medium text-charcoal">{inv.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-mid-gray">Client</span>
                      <span className="font-medium text-charcoal">
                        {client ? `${client.firstName} ${client.lastName}` : 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-mid-gray">Total</span>
                      <span className="font-bold text-charcoal">{formatCurrency(inv.total)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-mid-gray">Period</span>
                      <span className="text-charcoal">{formatDate(inv.periodStart)} - {formatDate(inv.periodEnd)}</span>
                    </div>
                  </div>
                ) : null;
              })()}
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">
                  {approvalAction === 'approve' ? 'Notes (optional)' : 'Reason for rejection'}
                </label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={3}
                  className="w-full border border-sage-light rounded-lg px-3 py-2 text-sm focus:ring-forest focus:border-forest"
                  placeholder={approvalAction === 'approve' ? 'Any notes about this approval...' : 'e.g. Hours do not match the agreed schedule...'}
                  required={approvalAction === 'reject'}
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setApprovalModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprovalConfirm}
                  disabled={approvalAction === 'reject' && !approvalNotes.trim()}
                  className={cn(
                    'flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                    approvalAction === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-red-600 hover:bg-red-700',
                  )}
                >
                  {approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
