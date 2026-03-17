import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { formatCurrency, formatDate, generateId, cn, getNextInvoiceNumber } from '@/lib/utils';
import type { Invoice, InvoiceLineItem, Shift, Client } from '@/types';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Download,
  CalendarRange,
  Search,
  Check,
  X,
  Eye,
  Loader2,
} from 'lucide-react';
import { format, addDays, parseISO, isWithinInterval } from 'date-fns';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';
import InvoicePdf from './InvoicePdf';

// ── Import from Roster Modal ──
interface RosterModalProps {
  open: boolean;
  onClose: () => void;
  shifts: Shift[];
  getClientById: (id: string) => Client | undefined;
  onImport: (shifts: Shift[]) => void;
}

function ImportFromRosterModal({ open, onClose, shifts, getClientById, onImport }: RosterModalProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  if (!open) return null;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === shifts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(shifts.map((s) => s.id)));
    }
  };

  const handleImport = () => {
    const selectedShifts = shifts.filter((s) => selected.has(s.id));
    onImport(selectedShifts);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-sage-pale">
          <div>
            <h2 className="text-lg font-semibold text-charcoal">Import from Roster</h2>
            <p className="text-sm text-mid-gray mt-0.5">Select completed shifts to add as invoice line items</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sage-pale rounded-lg transition-colors">
            <X size={18} className="text-mid-gray" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {shifts.length === 0 ? (
            <div className="text-center py-12">
              <CalendarRange size={40} className="mx-auto text-mid-gray/40 mb-3" />
              <p className="text-sm text-mid-gray">No completed shifts found for this client in the selected billing period.</p>
              <p className="text-xs text-mid-gray/70 mt-1">Check the client and billing period dates above.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-sm text-mid-gray">
                  <input
                    type="checkbox"
                    checked={selected.size === shifts.length && shifts.length > 0}
                    onChange={toggleAll}
                    className="rounded border-sage-light text-forest focus:ring-forest/30"
                  />
                  Select all ({shifts.length} shifts)
                </label>
                <span className="text-sm font-medium text-forest">
                  {selected.size} selected
                </span>
              </div>

              <div className="space-y-2">
                {shifts.map((shift) => {
                  const client = getClientById(shift.clientId);
                  return (
                    <label
                      key={shift.id}
                      className={cn(
                        'flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer',
                        selected.has(shift.id)
                          ? 'border-forest bg-sage-pale/50'
                          : 'border-sage-light hover:border-sage'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(shift.id)}
                        onChange={() => toggle(shift.id)}
                        className="rounded border-sage-light text-forest focus:ring-forest/30"
                      />
                      <div className="flex-1 grid grid-cols-5 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-mid-gray block">Date</span>
                          <span className="font-medium">{formatDate(shift.date)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-mid-gray block">Service</span>
                          <span>{shift.serviceType}</span>
                        </div>
                        <div>
                          <span className="text-xs text-mid-gray block">Hours</span>
                          <span>{shift.hours}h</span>
                        </div>
                        <div>
                          <span className="text-xs text-mid-gray block">Rate</span>
                          <span>{formatCurrency(shift.hourlyRate)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-mid-gray block">Amount</span>
                          <span className="font-semibold text-forest">{formatCurrency(shift.totalAmount)}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-sage-pale bg-sage-pale/30">
          <p className="text-sm text-mid-gray">
            {selected.size > 0
              ? `Total: ${formatCurrency(shifts.filter((s) => selected.has(s.id)).reduce((sum, s) => sum + s.totalAmount, 0))}`
              : 'No shifts selected'}
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button
              onClick={handleImport}
              disabled={selected.size === 0}
              className={cn('btn-primary', selected.size === 0 && 'opacity-50 cursor-not-allowed')}
            >
              <Check size={16} />
              Import {selected.size} Shift{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main InvoiceBuilder ──
export default function InvoiceBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);

  const {
    invoices,
    clients,
    shifts,
    addInvoice,
    updateInvoice,
    getClientById,
  } = useStore();

  const existingInvoice = useMemo(() => {
    if (!id) return null;
    return invoices.find((i) => i.id === id) ?? null;
  }, [id, invoices]);

  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultDueDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');

  // ── Form state ──
  const [invoiceNumber, setInvoiceNumber] = useState(
    existingInvoice?.invoiceNumber ?? getNextInvoiceNumber(invoices)
  );
  const [invoiceDate, setInvoiceDate] = useState(existingInvoice?.invoiceDate ?? today);
  const [dueDate, setDueDate] = useState(existingInvoice?.dueDate ?? defaultDueDate);
  const [clientId, setClientId] = useState(existingInvoice?.clientId ?? '');
  const [periodStart, setPeriodStart] = useState(existingInvoice?.periodStart ?? '');
  const [periodEnd, setPeriodEnd] = useState(existingInvoice?.periodEnd ?? '');
  const [referenceNumber, setReferenceNumber] = useState(existingInvoice?.referenceNumber ?? '');
  const [notesToClient, setNotesToClient] = useState(existingInvoice?.notesToClient ?? '');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(existingInvoice?.lineItems ?? []);
  const [gstApplicable, setGstApplicable] = useState(existingInvoice?.gstApplicable ?? false);
  const [clientSearch, setClientSearch] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const activeClients = useMemo(
    () => clients.filter((c) => c.status === 'Active'),
    [clients]
  );

  const filteredClients = useMemo(() => {
    if (!clientSearch) return activeClients;
    const q = clientSearch.toLowerCase();
    return activeClients.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.ndisNumber.includes(q)
    );
  }, [activeClients, clientSearch]);

  const selectedClient = useMemo(() => (clientId ? getClientById(clientId) : undefined), [clientId, getClientById]);

  // ── Calculations ──
  const subtotal = useMemo(() => lineItems.reduce((sum, li) => sum + li.amount, 0), [lineItems]);
  const gstAmount = gstApplicable ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const total = subtotal + gstAmount;

  // ── Line item helpers ──
  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: generateId(),
        date: '',
        description: '',
        ndisLineItemCode: '',
        supportCategory: '',
        hours: 0,
        rate: 0,
        amount: 0,
      },
    ]);
  };

  const updateLineItem = (itemId: string, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems((prev) =>
      prev.map((li) => {
        if (li.id !== itemId) return li;
        const updated = { ...li, [field]: value };
        if (field === 'hours' || field === 'rate') {
          updated.amount = Math.round(updated.hours * updated.rate * 100) / 100;
        }
        return updated;
      })
    );
  };

  const removeLineItem = (itemId: string) => {
    setLineItems((prev) => prev.filter((li) => li.id !== itemId));
  };

  // ── Import from roster ──
  const availableShifts = useMemo(() => {
    if (!clientId || !periodStart || !periodEnd) return [];
    const existingShiftIds = new Set(lineItems.filter((li) => li.shiftId).map((li) => li.shiftId));
    return shifts.filter((s) => {
      if (s.clientId !== clientId) return false;
      if (s.status !== 'Completed') return false;
      if (existingShiftIds.has(s.id)) return false;
      try {
        const shiftDate = parseISO(s.date);
        return isWithinInterval(shiftDate, { start: parseISO(periodStart), end: parseISO(periodEnd) });
      } catch {
        return false;
      }
    });
  }, [clientId, periodStart, periodEnd, shifts, lineItems]);

  const handleImportShifts = useCallback(
    (selectedShifts: Shift[]) => {
      const newItems: InvoiceLineItem[] = selectedShifts.map((s) => ({
        id: generateId(),
        date: s.date,
        description: `${s.serviceType}${s.notes ? ' - ' + s.notes : ''}`,
        ndisLineItemCode: s.ndisLineItemCode,
        supportCategory: s.supportCategory,
        hours: s.hours,
        rate: s.hourlyRate,
        amount: s.totalAmount,
        shiftId: s.id,
      }));
      setLineItems((prev) => [...prev, ...newItems]);
      toast.success(`Imported ${selectedShifts.length} shift(s)`);
    },
    []
  );

  // ── Build current invoice object for PDF ──
  const buildCurrentInvoice = (): Invoice => ({
    id: existingInvoice?.id ?? '',
    invoiceNumber,
    clientId,
    invoiceDate,
    dueDate,
    periodStart,
    periodEnd,
    referenceNumber,
    notesToClient,
    lineItems,
    subtotal,
    gstApplicable,
    gstAmount,
    total,
    status: existingInvoice?.status ?? 'Draft',
    createdAt: existingInvoice?.createdAt ?? new Date().toISOString(),
  });

  // ── PDF Download ──
  const handleDownloadPdf = async () => {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    setDownloadingPdf(true);
    try {
      const invoice = buildCurrentInvoice();
      const blob = await pdf(<InvoicePdf invoice={invoice} client={selectedClient} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded Invoice-${invoiceNumber}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingPdf(false);
    }
  };

  // ── Preview PDF ──
  const handlePreviewPdf = async () => {
    if (!selectedClient) {
      toast.error('Please select a client first');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    setPreviewLoading(true);
    setPreviewModalOpen(true);
    try {
      const invoice = buildCurrentInvoice();
      const blob = await pdf(<InvoicePdf invoice={invoice} client={selectedClient} />).toBlob();
      const url = URL.createObjectURL(blob);
      // Revoke previous URL if exists
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (err) {
      console.error('PDF preview error:', err);
      toast.error('Failed to generate PDF preview');
      setPreviewModalOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreviewModal = () => {
    setPreviewModalOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  // ── Save ──
  const handleSave = async () => {
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    if (!periodStart || !periodEnd) {
      toast.error('Please set the billing period');
      return;
    }

    const invoiceData = {
      clientId,
      invoiceDate,
      dueDate,
      periodStart,
      periodEnd,
      referenceNumber,
      notesToClient,
      lineItems,
      subtotal,
      gstApplicable,
      gstAmount,
      total,
      invoiceNumber,
      status: existingInvoice?.status ?? 'Draft',
    };

    if (isEditing && existingInvoice) {
      await updateInvoice(existingInvoice.id, invoiceData);
      toast.success('Invoice updated');
    } else {
      const newInvoice = await addInvoice(invoiceData);
      toast.success(`Invoice ${newInvoice.invoiceNumber} created`);
      navigate(`/invoices/${newInvoice.id}/edit`, { replace: true });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/invoices')} className="p-2 hover:bg-sage-pale rounded-lg transition-colors">
            <ArrowLeft size={18} className="text-mid-gray" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-charcoal">
              {isEditing ? `Edit Invoice ${invoiceNumber}` : 'New Invoice'}
            </h1>
            <p className="text-sm text-mid-gray">
              {isEditing ? 'Update invoice details' : 'Create a new NDIS invoice'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── LEFT PANEL (60%) ── */}
        <div className="w-[60%] space-y-6">
          {/* Invoice Details */}
          <div className="card space-y-4">
            <h2 className="text-sm font-semibold text-mid-gray uppercase tracking-wider">Invoice Details</h2>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Invoice Number</label>
                <input type="text" value={invoiceNumber} readOnly className="input-field bg-sage-pale/30" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            {/* Client Selector */}
            <div className="relative">
              <label className="block text-sm font-medium text-charcoal mb-1">Client</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
                <input
                  type="text"
                  placeholder="Search by name or NDIS number..."
                  value={clientDropdownOpen ? clientSearch : (selectedClient ? `${selectedClient.firstName} ${selectedClient.lastName} (${selectedClient.ndisNumber})` : '')}
                  onFocus={() => {
                    setClientDropdownOpen(true);
                    setClientSearch('');
                  }}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="input-field pl-9"
                />
                {clientId && !clientDropdownOpen && (
                  <button
                    onClick={() => { setClientId(''); setClientDropdownOpen(true); setClientSearch(''); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-mid-gray hover:text-charcoal"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              {clientDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setClientDropdownOpen(false)} />
                  <div className="absolute z-20 mt-1 w-full bg-white border border-sage-light rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredClients.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-mid-gray">No clients found</div>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            setClientId(c.id);
                            setClientDropdownOpen(false);
                            setClientSearch('');
                          }}
                          className={cn(
                            'w-full text-left px-4 py-2.5 text-sm hover:bg-sage-pale transition-colors flex justify-between items-center',
                            c.id === clientId && 'bg-sage-pale/50'
                          )}
                        >
                          <span className="font-medium">{c.firstName} {c.lastName}</span>
                          <span className="text-xs text-mid-gray">{c.ndisNumber}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Billing Period */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Period Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Period End</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Reference / PO Number</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Optional"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Notes to Client</label>
              <textarea
                value={notesToClient}
                onChange={(e) => setNotesToClient(e.target.value)}
                rows={3}
                placeholder="Any additional notes..."
                className="input-field resize-none"
              />
            </div>
          </div>

          {/* Line Items */}
          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-mid-gray uppercase tracking-wider">Line Items</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!clientId) {
                      toast.error('Please select a client first');
                      return;
                    }
                    if (!periodStart || !periodEnd) {
                      toast.error('Please set the billing period first');
                      return;
                    }
                    setRosterModalOpen(true);
                  }}
                  className="btn-secondary text-sm"
                >
                  <CalendarRange size={14} />
                  Import from Roster
                </button>
                <button onClick={addLineItem} className="btn-primary text-sm">
                  <Plus size={14} />
                  Add Line Item
                </button>
              </div>
            </div>

            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-mid-gray text-sm">
                No line items yet. Add items manually or import from the roster.
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6">
                <table className="w-full min-w-[800px]">
                  <thead className="border-b border-sage-pale">
                    <tr>
                      <th className="table-header">Date</th>
                      <th className="table-header">Description</th>
                      <th className="table-header">NDIS Code</th>
                      <th className="table-header">Category</th>
                      <th className="table-header w-20">Hours</th>
                      <th className="table-header w-24">Rate ($)</th>
                      <th className="table-header w-24">Amount ($)</th>
                      <th className="table-header w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sage-pale">
                    {lineItems.map((item) => (
                      <tr key={item.id} className="group">
                        <td className="px-4 py-2">
                          <input
                            type="date"
                            value={item.date}
                            onChange={(e) => updateLineItem(item.id, 'date', e.target.value)}
                            className="input-field text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                            placeholder="Description"
                            className="input-field text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.ndisLineItemCode}
                            onChange={(e) => updateLineItem(item.id, 'ndisLineItemCode', e.target.value)}
                            placeholder="e.g. 01_011_0107_1_1"
                            className="input-field text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={item.supportCategory}
                            onChange={(e) => updateLineItem(item.id, 'supportCategory', e.target.value)}
                            placeholder="Category"
                            className="input-field text-xs"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            value={item.hours || ''}
                            onChange={(e) => updateLineItem(item.id, 'hours', parseFloat(e.target.value) || 0)}
                            className="input-field text-xs text-right"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.rate || ''}
                            onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                            className="input-field text-xs text-right"
                          />
                        </td>
                        <td className="px-4 py-2 text-right text-sm font-medium text-charcoal">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-4 py-2">
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="p-1 rounded hover:bg-red-50 text-mid-gray hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-sage-pale pt-4 space-y-2">
              <div className="flex justify-end items-center gap-8 text-sm">
                <span className="text-mid-gray">Subtotal</span>
                <span className="font-medium w-28 text-right">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-end items-center gap-8 text-sm">
                <label className="flex items-center gap-2 text-mid-gray cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gstApplicable}
                    onChange={(e) => setGstApplicable(e.target.checked)}
                    className="rounded border-sage-light text-forest focus:ring-forest/30"
                  />
                  Apply GST (10%)
                </label>
                <span className="font-medium w-28 text-right">{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-end items-center gap-8 text-base border-t border-sage-pale pt-2">
                <span className="font-semibold text-charcoal">Total</span>
                <span className="font-bold text-forest w-28 text-right text-lg">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (40%) — Live Preview ── */}
        <div className="w-[40%] space-y-4">
          <div className="card p-0 overflow-hidden sticky top-4">
            {/* Preview Header */}
            <div className="bg-forest text-white px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Thrive 4 Better</h2>
                  <p className="text-xs text-white/70 mt-0.5">ABN: 12 345 678 901</p>
                  <p className="text-xs text-white/70">123 Smith Street, Fitzroy VIC 3065</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">INVOICE</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-mid-gray font-medium">Invoice Number</p>
                  <p className="font-semibold">{invoiceNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-mid-gray font-medium">Invoice Date</p>
                  <p className="font-semibold">{invoiceDate ? formatDate(invoiceDate) : '--'}</p>
                </div>
                <div>
                  <p className="text-mid-gray font-medium">Due Date</p>
                  <p className="font-semibold">{dueDate ? formatDate(dueDate) : '--'}</p>
                </div>
                <div className="text-right">
                  <p className="text-mid-gray font-medium">Billing Period</p>
                  <p className="font-semibold">
                    {periodStart && periodEnd
                      ? `${formatDate(periodStart)} - ${formatDate(periodEnd)}`
                      : '--'}
                  </p>
                </div>
              </div>

              {/* Client Details */}
              <div className="bg-sage-pale/50 rounded-lg p-3">
                <p className="text-mid-gray font-medium mb-1">Bill To</p>
                {selectedClient ? (
                  <>
                    <p className="font-semibold">{selectedClient.firstName} {selectedClient.lastName}</p>
                    <p className="text-mid-gray">{selectedClient.address}</p>
                    <p className="text-mid-gray">{selectedClient.suburb} {selectedClient.postcode}</p>
                    <p className="text-mid-gray mt-1">NDIS: {selectedClient.ndisNumber}</p>
                  </>
                ) : (
                  <p className="text-mid-gray italic">Select a client</p>
                )}
              </div>

              {referenceNumber && (
                <div>
                  <p className="text-mid-gray font-medium">Reference</p>
                  <p className="font-semibold">{referenceNumber}</p>
                </div>
              )}

              {/* Line Items Preview */}
              {lineItems.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-sage-light">
                        <th className="text-left py-1.5 font-semibold text-mid-gray">Date</th>
                        <th className="text-left py-1.5 font-semibold text-mid-gray">Description</th>
                        <th className="text-right py-1.5 font-semibold text-mid-gray">Hrs</th>
                        <th className="text-right py-1.5 font-semibold text-mid-gray">Rate</th>
                        <th className="text-right py-1.5 font-semibold text-mid-gray">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-pale">
                      {lineItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-1.5">{item.date ? formatDate(item.date) : '--'}</td>
                          <td className="py-1.5 max-w-[140px] truncate">{item.description || '--'}</td>
                          <td className="py-1.5 text-right">{item.hours}</td>
                          <td className="py-1.5 text-right">{formatCurrency(item.rate)}</td>
                          <td className="py-1.5 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals */}
              <div className="border-t border-sage-light pt-3 space-y-1">
                <div className="flex justify-between">
                  <span className="text-mid-gray">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {gstApplicable && (
                  <div className="flex justify-between">
                    <span className="text-mid-gray">GST (10%)</span>
                    <span className="font-medium">{formatCurrency(gstAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-forest pt-1">
                  <span className="font-bold text-forest">Total</span>
                  <span className="font-bold text-forest">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-sage-pale/50 rounded-lg p-3 mt-3">
                <p className="font-semibold mb-1">Payment Details</p>
                <div className="grid grid-cols-3 gap-2 text-mid-gray">
                  <div>
                    <span className="block font-medium text-charcoal">BSB</span>
                    063-123
                  </div>
                  <div>
                    <span className="block font-medium text-charcoal">Account</span>
                    1234 5678
                  </div>
                  <div>
                    <span className="block font-medium text-charcoal">Name</span>
                    Thrive 4 Better Pty Ltd
                  </div>
                </div>
              </div>

              {notesToClient && (
                <div>
                  <p className="text-mid-gray font-medium mb-0.5">Notes</p>
                  <p className="text-charcoal whitespace-pre-line">{notesToClient}</p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handlePreviewPdf}
              disabled={previewLoading}
              className="btn-ghost flex-1"
            >
              {previewLoading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
              Preview
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="btn-secondary flex-1"
            >
              {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download PDF
            </button>
            <button onClick={handleSave} className="btn-primary flex-1">
              <Save size={16} />
              Save Invoice
            </button>
          </div>
        </div>
      </div>

      {/* Roster Import Modal */}
      <ImportFromRosterModal
        open={rosterModalOpen}
        onClose={() => setRosterModalOpen(false)}
        shifts={availableShifts}
        getClientById={getClientById}
        onImport={handleImportShifts}
      />

      {/* PDF Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={closePreviewModal} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl mx-4 h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-sage-pale">
              <h2 className="text-lg font-semibold text-charcoal">Invoice Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="btn-secondary text-sm"
                >
                  {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Download
                </button>
                <button
                  onClick={closePreviewModal}
                  className="p-2 hover:bg-sage-pale rounded-lg transition-colors"
                >
                  <X size={18} className="text-mid-gray" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-hidden p-4 bg-gray-100">
              {previewLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <Loader2 size={32} className="animate-spin text-forest mx-auto mb-3" />
                    <p className="text-sm text-mid-gray">Generating preview...</p>
                  </div>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full rounded-lg border border-sage-light"
                  title="Invoice PDF Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-mid-gray">Failed to load preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
