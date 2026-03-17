import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { exportToCsv, fmtCurrencyPlain } from '@/lib/export-utils';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal';
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
  Sparkles,
  X,
  Check,
  Eye,
} from 'lucide-react';
import { parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import InvoicePdf from './InvoicePdf';
import type { Invoice, Client } from '@/types';

type InvoiceStatus = 'All' | 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Void' | 'Archived';
type SortField = 'invoiceNumber' | 'clientName' | 'periodStart' | 'lineItems' | 'subtotal' | 'gstAmount' | 'total' | 'dueDate';
type SortDir = 'asc' | 'desc';

// ── Parsed Invoice Preview ──
interface ParsedInvoiceData {
  clientName: string | null;
  serviceType: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  hours: number | null;
  description: string | null;
  supportCategory: string | null;
  confidence: number;
}

export default function InvoiceList() {
  const navigate = useNavigate();
  const { invoices, clients, updateInvoice, getClientById } = useStore();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<InvoiceStatus>('All');
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

  // ── Modal state ──
  const [builderModalOpen, setBuilderModalOpen] = useState(false);
  const [builderEditId, setBuilderEditId] = useState<string | undefined>(undefined);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);

  // ── AI Natural Language Input ──
  const [nlInput, setNlInput] = useState('');
  const [nlParsing, setNlParsing] = useState(false);
  const [nlParsed, setNlParsed] = useState<ParsedInvoiceData | null>(null);

  const handleNlParse = async () => {
    if (!nlInput.trim()) return;

    setNlParsing(true);
    setNlParsed(null);

    try {
      const token = session?.access_token;
      if (!token) {
        toast.error('You must be logged in to use AI parsing');
        return;
      }

      const clientNames = clients
        .filter((c) => c.status === 'Active')
        .map((c) => `${c.firstName} ${c.lastName}`);

      const res = await fetch('/api/parse-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: nlInput, clientNames }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse input');
      }

      setNlParsed(data.parsed);
      toast.success('Parsed successfully! Review the details below.');
    } catch (err) {
      console.error('Parse error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to parse input');
    } finally {
      setNlParsing(false);
    }
  };

  const handleNlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNlParse();
    }
  };

  const handleUseNlParsed = () => {
    if (!nlParsed) return;
    // Open the builder modal with parsed data pre-populated
    // We pass the parsed data via a temporary state
    setBuilderEditId(undefined);
    setBuilderModalOpen(true);
    // Store parsed data for the builder to consume
    setNlParsedForBuilder(nlParsed);
    setNlParsed(null);
    setNlInput('');
  };

  const [nlParsedForBuilder, setNlParsedForBuilder] = useState<ParsedInvoiceData | null>(null);

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

          updateInvoice(invoice.id, { status: 'Sent' });
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
  }, [invoices, activeTab, sortField, sortDir, getClientById, showArchived]);

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
    { label: 'Total Outstanding', value: kpis.outstanding, icon: DollarSign, color: 'text-forest' },
    { label: 'Overdue', value: kpis.overdue, icon: AlertCircle, color: 'text-burgundy' },
    { label: 'Due This Week', value: kpis.dueThisWeek, icon: Clock, color: 'text-amber-600' },
    { label: 'Paid This Month', value: kpis.paidThisMonth, icon: CheckCircle2, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Invoices</h1>
          <p className="text-sm text-mid-gray mt-1">Manage and track NDIS invoices</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              const headers = ['Invoice Number', 'Client Name', 'Invoice Date', 'Due Date', 'Status', 'Subtotal', 'GST', 'Total'];
              const rows = filteredInvoices.map((inv) => {
                const c = getClientById(inv.clientId);
                const clientName = c ? `${c.firstName} ${c.lastName}` : 'Unknown';
                return [
                  inv.invoiceNumber,
                  clientName,
                  inv.invoiceDate,
                  inv.dueDate,
                  inv.status,
                  fmtCurrencyPlain(inv.subtotal),
                  fmtCurrencyPlain(inv.gstAmount),
                  fmtCurrencyPlain(inv.total),
                ];
              });
              exportToCsv('invoices.csv', headers, rows);
            }}
            className="btn-secondary"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button onClick={() => setRatesModalOpen(true)} className="btn-secondary">
            <DollarSign size={16} />
            NDIS Rates
          </button>
          <button onClick={openBuilderNew} className="btn-primary">
            <Plus size={16} />
            New Invoice
          </button>
        </div>
      </div>

      {/* AI Natural Language Input */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles size={16} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-charcoal">Quick Entry with AI</h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Beta</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                onKeyDown={handleNlKeyDown}
                placeholder="Type what happened... e.g. 'Sarah, community access, Monday 10am-1pm'"
                className="input-field flex-1"
                disabled={nlParsing}
              />
              <button
                onClick={handleNlParse}
                disabled={nlParsing || !nlInput.trim()}
                className={cn('btn-primary whitespace-nowrap', (nlParsing || !nlInput.trim()) && 'opacity-50 cursor-not-allowed')}
              >
                {nlParsing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Parse
              </button>
            </div>
          </div>
        </div>

        {/* Parsed Result Preview */}
        {nlParsed && (
          <div className="mt-4 border border-purple-200 rounded-xl bg-purple-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-charcoal">Parsed Result</h4>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  nlParsed.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                  nlParsed.confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {Math.round(nlParsed.confidence * 100)}% confident
                </span>
                <button
                  onClick={() => setNlParsed(null)}
                  className="p-1 hover:bg-purple-200/50 rounded transition-colors"
                >
                  <X size={14} className="text-mid-gray" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {nlParsed.clientName && (
                <div>
                  <span className="text-xs text-mid-gray block">Client</span>
                  <span className="font-medium">{nlParsed.clientName}</span>
                </div>
              )}
              {nlParsed.serviceType && (
                <div>
                  <span className="text-xs text-mid-gray block">Service</span>
                  <span className="font-medium">{nlParsed.serviceType}</span>
                </div>
              )}
              {nlParsed.date && (
                <div>
                  <span className="text-xs text-mid-gray block">Date</span>
                  <span className="font-medium">{formatDate(nlParsed.date)}</span>
                </div>
              )}
              {(nlParsed.startTime || nlParsed.endTime) && (
                <div>
                  <span className="text-xs text-mid-gray block">Time</span>
                  <span className="font-medium">{nlParsed.startTime || '?'} - {nlParsed.endTime || '?'}</span>
                </div>
              )}
              {nlParsed.hours != null && (
                <div>
                  <span className="text-xs text-mid-gray block">Hours</span>
                  <span className="font-medium">{nlParsed.hours}h</span>
                </div>
              )}
              {nlParsed.description && (
                <div className="col-span-2">
                  <span className="text-xs text-mid-gray block">Description</span>
                  <span className="font-medium">{nlParsed.description}</span>
                </div>
              )}
              {nlParsed.supportCategory && (
                <div className="col-span-2">
                  <span className="text-xs text-mid-gray block">Category</span>
                  <span className="font-medium">{nlParsed.supportCategory}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setNlParsed(null)} className="btn-ghost text-sm">
                Dismiss
              </button>
              <button onClick={handleUseNlParsed} className="btn-primary text-sm">
                <Check size={14} />
                Create Invoice with this data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="card flex items-center gap-4">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center bg-sage-pale', kpi.color)}>
              <kpi.icon size={20} />
            </div>
            <div>
              <p className="text-xs text-mid-gray font-medium">{kpi.label}</p>
              <p className="text-lg font-bold text-charcoal">{formatCurrency(kpi.value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Bulk Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-sage-pale rounded-lg p-1">
          {tabs.map((tab) => {
            const count = tab === 'All' ? invoices.length : invoices.filter((i) => i.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSelectedIds(new Set()); }}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  activeTab === tab ? 'bg-white text-forest shadow-sm' : 'text-mid-gray hover:text-charcoal'
                )}
              >
                {tab} <span className="ml-1 text-xs opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-mid-gray cursor-pointer whitespace-nowrap">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded border-sage text-forest focus:ring-forest"
            />
            Show archived/void
          </label>
          {selectedIds.size > 0 && (
            <>
              <button onClick={() => handleBulkAction('Sent')} className="btn-secondary text-sm">
                <Send size={14} />
                Mark as Sent ({selectedIds.size})
              </button>
              <button onClick={() => handleBulkAction('Paid')} className="btn-primary text-sm">
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
                          {invoice.status !== 'Paid' && invoice.status !== 'Void' && invoice.status !== 'Archived' && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-mid-gray hover:text-green-600 transition-colors"
                              title="Mark as Paid"
                            >
                              <CheckCircle2 size={15} />
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
    </div>
  );
}
