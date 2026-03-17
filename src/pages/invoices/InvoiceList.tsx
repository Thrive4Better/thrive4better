import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { exportToCsv, fmtCurrencyPlain } from '@/lib/export-utils';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmModal from '@/components/ui/ConfirmModal';
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
} from 'lucide-react';
import { parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import InvoicePdf from './InvoicePdf';
import type { Invoice, Client } from '@/types';

type InvoiceStatus = 'All' | 'Draft' | 'Sent' | 'Paid' | 'Overdue';
type SortField = 'invoiceNumber' | 'clientName' | 'periodStart' | 'lineItems' | 'subtotal' | 'gstAmount' | 'total' | 'dueDate';
type SortDir = 'asc' | 'desc';

export default function InvoiceList() {
  const navigate = useNavigate();
  const { invoices, clients, updateInvoice, getClientById } = useStore();
  const { session } = useAuth();

  const [activeTab, setActiveTab] = useState<InvoiceStatus>('All');
  const [sortField, setSortField] = useState<SortField>('invoiceNumber');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({
    open: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

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
    let list = activeTab === 'All' ? invoices : invoices.filter((i) => i.status === activeTab);

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
  }, [invoices, activeTab, sortField, sortDir, getClientById]);

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

  const tabs: InvoiceStatus[] = ['All', 'Draft', 'Sent', 'Paid', 'Overdue'];

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
          <button onClick={() => navigate('/invoices/rates')} className="btn-secondary">
            <DollarSign size={16} />
            NDIS Rates
          </button>
          <button onClick={() => navigate('/invoices/new')} className="btn-primary">
            <Plus size={16} />
            New Invoice
          </button>
        </div>
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

        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <button onClick={() => handleBulkAction('Sent')} className="btn-secondary text-sm">
              <Send size={14} />
              Mark as Sent ({selectedIds.size})
            </button>
            <button onClick={() => handleBulkAction('Paid')} className="btn-primary text-sm">
              <CreditCard size={14} />
              Mark as Paid ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices found"
            description={activeTab === 'All' ? 'Create your first invoice to get started.' : `No ${activeTab.toLowerCase()} invoices.`}
            action={{ label: 'New Invoice', onClick: () => navigate('/invoices/new') }}
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
                      className="hover:bg-sage-pale/30 transition-colors"
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
                            onClick={() => navigate(`/invoices/${invoice.id}/edit`)}
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
                          {invoice.status !== 'Paid' && (
                            <button
                              onClick={() => handleMarkAsPaid(invoice.id)}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-mid-gray hover:text-green-600 transition-colors"
                              title="Mark as Paid"
                            >
                              <CheckCircle2 size={15} />
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
    </div>
  );
}
