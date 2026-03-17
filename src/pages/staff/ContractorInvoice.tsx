import { useState, useMemo, useCallback, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import {
  Plus, Trash2, FileText, Send, Download, Clock, AlertTriangle,
  Import, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';

import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, generateId, cn } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ContractorInvoicePdf from './ContractorInvoicePdf';
import type { ContractorInvoice as ContractorInvoiceType, ContractorInvoiceLineItem, ShiftLog } from '@/types';

const STORAGE_KEY_LOGS = 't4b_shiftLogs';

function loadShiftLogs(): ShiftLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOGS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

interface ContractorDetails {
  abn: string;
  address: string;
  bankName: string;
  accountName: string;
  bsb: string;
  accountNumber: string;
}

function loadContractorDetails(carerId: string): ContractorDetails {
  try {
    const raw = localStorage.getItem(`t4b_contractor_details_${carerId}`);
    return raw ? JSON.parse(raw) : { abn: '', address: '', bankName: '', accountName: '', bsb: '', accountNumber: '' };
  } catch {
    return { abn: '', address: '', bankName: '', accountName: '', bsb: '', accountNumber: '' };
  }
}

function saveContractorDetails(carerId: string, details: ContractorDetails) {
  localStorage.setItem(`t4b_contractor_details_${carerId}`, JSON.stringify(details));
}

function getNextContractorInvoiceNumber(invoices: ContractorInvoiceType[]): string {
  const year = new Date().getFullYear();
  const existing = invoices
    .map(i => {
      const match = i.invoiceNumber.match(/CI-(\d{4})-(\d+)/);
      if (match && parseInt(match[1]) === year) return parseInt(match[2]);
      return 0;
    })
    .filter(n => n > 0);
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `CI-${year}-${String(next).padStart(4, '0')}`;
}

export default function ContractorInvoice() {
  const { carers, clients, contractorInvoices, addContractorInvoice, updateContractorInvoice } = useStore();
  const { profile } = useAuth();

  const carerId = profile?.carerId || '';
  const carer = carers.find((c) => c.id === carerId);
  const carerName = carer ? `${carer.firstName} ${carer.lastName}` : profile?.fullName || 'Unknown';

  const myInvoices = useMemo(
    () => contractorInvoices
      .filter((i) => i.carerId === carerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [contractorInvoices, carerId],
  );

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const defaultDueDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const [invoiceDate, setInvoiceDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [registeredForGst, setRegisteredForGst] = useState(false);
  const [notes, setNotes] = useState('');

  // Contractor details
  const savedDetails = loadContractorDetails(carerId);
  const [abn, setAbn] = useState(savedDetails.abn);
  const [address, setAddress] = useState(savedDetails.address);
  const [bankName, setBankName] = useState(savedDetails.bankName);
  const [accountName, setAccountName] = useState(savedDetails.accountName);
  const [bsb, setBsb] = useState(savedDetails.bsb);
  const [accountNumber, setAccountNumber] = useState(savedDetails.accountNumber);

  // Line items
  const [lineItems, setLineItems] = useState<ContractorInvoiceLineItem[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const subtotal = useMemo(() => lineItems.reduce((sum, li) => sum + li.amount, 0), [lineItems]);
  const gstAmount = registeredForGst ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
  const total = subtotal + gstAmount;

  const resetForm = useCallback(() => {
    setInvoiceDate(today);
    setDueDate(defaultDueDate);
    setPeriodStart('');
    setPeriodEnd('');
    setRegisteredForGst(false);
    setNotes('');
    setLineItems([]);
    setShowForm(false);
    setEditingId(null);
  }, [today, defaultDueDate]);

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: generateId(),
      description: '',
      hours: 0,
      rate: 0,
      amount: 0,
    }]);
  };

  const updateLineItem = (id: string, field: keyof ContractorInvoiceLineItem, value: string | number) => {
    setLineItems(items => items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };
      if (field === 'hours' || field === 'rate') {
        updated.amount = Math.round(updated.hours * updated.rate * 100) / 100;
      }
      return updated;
    }));
  };

  const removeLineItem = (id: string) => {
    setLineItems(items => items.filter(item => item.id !== id));
  };

  const handleImportShifts = () => {
    if (!periodStart || !periodEnd) {
      toast.error('Please set the service period dates first');
      return;
    }

    const allLogs = loadShiftLogs();
    const myLogs = allLogs.filter(log => {
      if (log.carerId !== carerId) return false;
      return log.date >= periodStart && log.date <= periodEnd;
    });

    if (myLogs.length === 0) {
      toast.error('No logged shifts found for this period');
      return;
    }

    const imported: ContractorInvoiceLineItem[] = myLogs.map(log => {
      const [sh, sm] = log.startTime.split(':').map(Number);
      const [eh, em] = log.endTime.split(':').map(Number);
      const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
      const hours = Math.round((totalMinutes / 60) * 100) / 100;

      const clientName = (() => {
        const client = clients.find(c => c.id === log.clientId);
        return client ? `${client.firstName} ${client.lastName}` : 'Unknown Client';
      })();

      return {
        id: generateId(),
        description: `${log.activityType} - ${clientName} (${formatDate(log.date)})`,
        hours,
        rate: 0,
        amount: 0,
        shiftLogId: log.id,
      };
    });

    setLineItems(prev => [...prev, ...imported]);
    toast.success(`Imported ${imported.length} shift(s)`);
  };

  const handleSubmit = (asDraft: boolean) => {
    if (!carerId) {
      toast.error('No linked carer profile found');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    if (!periodStart || !periodEnd) {
      toast.error('Please set the service period');
      return;
    }

    // Save contractor details for reuse
    saveContractorDetails(carerId, { abn, address, bankName, accountName, bsb, accountNumber });

    const status = asDraft ? 'Draft' : 'Submitted';

    if (editingId) {
      updateContractorInvoice(editingId, {
        invoiceDate,
        dueDate,
        periodStart,
        periodEnd,
        contractorAbn: abn,
        contractorAddress: address,
        contractorBankName: bankName,
        contractorAccountName: accountName,
        contractorBsb: bsb,
        contractorAccountNumber: accountNumber,
        registeredForGst,
        lineItems,
        subtotal,
        gstAmount,
        total,
        status,
        notes,
        submittedAt: !asDraft ? new Date().toISOString() : undefined,
      });
      toast.success(asDraft ? 'Invoice saved as draft' : 'Invoice submitted successfully');
    } else {
      const invoice: ContractorInvoiceType = {
        id: generateId(),
        carerId,
        invoiceNumber: getNextContractorInvoiceNumber(contractorInvoices),
        invoiceDate,
        dueDate,
        periodStart,
        periodEnd,
        contractorAbn: abn,
        contractorAddress: address,
        contractorBankName: bankName,
        contractorAccountName: accountName,
        contractorBsb: bsb,
        contractorAccountNumber: accountNumber,
        registeredForGst,
        lineItems,
        subtotal,
        gstAmount,
        total,
        status,
        submittedAt: !asDraft ? new Date().toISOString() : undefined,
        notes,
        createdAt: new Date().toISOString(),
      };
      addContractorInvoice(invoice);
      toast.success(asDraft ? 'Invoice saved as draft' : 'Invoice submitted successfully');
    }

    resetForm();
  };

  const handleEdit = (invoice: ContractorInvoiceType) => {
    if (invoice.status !== 'Draft') {
      toast.error('Only draft invoices can be edited');
      return;
    }
    setEditingId(invoice.id);
    setInvoiceDate(invoice.invoiceDate);
    setDueDate(invoice.dueDate);
    setPeriodStart(invoice.periodStart);
    setPeriodEnd(invoice.periodEnd);
    setAbn(invoice.contractorAbn);
    setAddress(invoice.contractorAddress);
    setBankName(invoice.contractorBankName);
    setAccountName(invoice.contractorAccountName);
    setBsb(invoice.contractorBsb);
    setAccountNumber(invoice.contractorAccountNumber);
    setRegisteredForGst(invoice.registeredForGst);
    setLineItems(invoice.lineItems);
    setNotes(invoice.notes || '');
    setShowForm(true);
  };

  const handleDownloadPdf = async (invoice: ContractorInvoiceType) => {
    setDownloadingId(invoice.id);
    try {
      const blob = await pdf(
        <ContractorInvoicePdf invoice={invoice} carerName={carerName} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ContractorInvoice-${invoice.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${invoice.invoiceNumber}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">My Invoices</h1>
          <p className="text-sm text-mid-gray mt-1">Create and submit invoices to Thrive 4 Better</p>
        </div>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            New Invoice
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="card p-0 overflow-hidden">
          {/* Form header */}
          <div className="bg-[#2D5A3D] px-6 py-4">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? 'Edit Invoice' : 'New Tax Invoice'}
            </h2>
            <p className="text-sm text-white/70">Invoice to Thrive 4 Better Pty Ltd</p>
          </div>

          <div className="p-6 space-y-6">
            {/* Invoice & Period Details */}
            <div>
              <h3 className="text-sm font-semibold text-[#2D5A3D] uppercase tracking-wider mb-3">Invoice Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Invoice Date</label>
                  <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Due Date</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Period Start</label>
                  <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Period End</label>
                  <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input-field" />
                </div>
              </div>
            </div>

            {/* Contractor Details */}
            <div className="border-l-4 border-[#2D5A3D] bg-[#FDF8F0] rounded-r-lg p-5">
              <h3 className="text-sm font-semibold text-[#2D5A3D] uppercase tracking-wider mb-3">Your Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">ABN</label>
                  <input
                    type="text" value={abn} onChange={(e) => setAbn(e.target.value)}
                    className="input-field" placeholder="XX XXX XXX XXX"
                  />
                  {!abn && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-amber-600">
                      <AlertTriangle size={12} />
                      <span>Without an ABN, Thrive 4 Better must withhold 47% for tax purposes.</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Address</label>
                  <input
                    type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                    className="input-field" placeholder="Your business address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Bank Name</label>
                  <input
                    type="text" value={bankName} onChange={(e) => setBankName(e.target.value)}
                    className="input-field" placeholder="e.g. Commonwealth Bank"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Account Name</label>
                  <input
                    type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)}
                    className="input-field" placeholder="Account holder name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">BSB</label>
                  <input
                    type="text" value={bsb} onChange={(e) => setBsb(e.target.value)}
                    className="input-field" placeholder="XXX-XXX"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal mb-1">Account Number</label>
                  <input
                    type="text" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)}
                    className="input-field" placeholder="XXXX XXXX"
                  />
                </div>
              </div>

              {/* GST Toggle */}
              <div className="mt-4 flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox" checked={registeredForGst}
                    onChange={(e) => setRegisteredForGst(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2D5A3D]"></div>
                </label>
                <span className="text-sm font-medium text-charcoal">Registered for GST</span>
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  registeredForGst
                    ? 'bg-green-100 text-green-700'
                    : 'bg-amber-100 text-amber-700'
                )}>
                  {registeredForGst ? 'GST Inclusive' : 'No GST'}
                </span>
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#2D5A3D] uppercase tracking-wider">Line Items</h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleImportShifts}
                    className="btn-secondary text-sm flex items-center gap-1"
                  >
                    <Import size={14} />
                    Import from Logged Shifts
                  </button>
                  <button onClick={addLineItem} className="btn-secondary text-sm flex items-center gap-1">
                    <Plus size={14} />
                    Add Line
                  </button>
                </div>
              </div>

              {lineItems.length === 0 ? (
                <div className="border border-dashed border-sage rounded-lg py-8 text-center">
                  <p className="text-sm text-mid-gray">No line items yet. Add items or import from your logged shifts.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#2D5A3D] text-white">
                        <th className="text-left text-xs font-semibold uppercase tracking-wider px-3 py-2 rounded-tl-lg">Description</th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider px-3 py-2 w-24">Hours</th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider px-3 py-2 w-28">Rate ($)</th>
                        <th className="text-right text-xs font-semibold uppercase tracking-wider px-3 py-2 w-28">Amount</th>
                        <th className="px-3 py-2 w-12 rounded-tr-lg"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sage-pale">
                      {lineItems.map((item, idx) => (
                        <tr key={item.id} className={idx % 2 === 1 ? 'bg-[#FDF8F0]' : ''}>
                          <td className="px-3 py-2">
                            <input
                              type="text" value={item.description}
                              onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                              className="input-field text-sm" placeholder="Service description"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" step="0.25" min="0" value={item.hours || ''}
                              onChange={(e) => updateLineItem(item.id, 'hours', parseFloat(e.target.value) || 0)}
                              className="input-field text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number" step="0.01" min="0" value={item.rate || ''}
                              onChange={(e) => updateLineItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                              className="input-field text-sm text-right"
                            />
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-semibold text-charcoal">
                            {formatCurrency(item.amount)}
                          </td>
                          <td className="px-3 py-2">
                            <button onClick={() => removeLineItem(item.id)} className="p-1 hover:bg-red-50 rounded text-mid-gray hover:text-red-500">
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
              {lineItems.length > 0 && (
                <div className="flex justify-end mt-4">
                  <div className="w-72 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-mid-gray">Subtotal</span>
                      <span className="text-charcoal">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-mid-gray">GST (10%)</span>
                      <span className="text-charcoal">{formatCurrency(gstAmount)}</span>
                    </div>
                    <div className="border-t border-sage-pale pt-2" />
                    <div className="flex justify-between items-center bg-[#2D5A3D] text-white rounded-lg px-4 py-3">
                      <span className="font-semibold">Total</span>
                      <span className="text-lg font-bold">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Notes (optional)</label>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                rows={3} className="input-field" placeholder="Any additional notes..."
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2 border-t border-sage-pale">
              <button onClick={() => handleSubmit(false)} className="btn-primary flex items-center gap-2">
                <Send size={16} />
                Submit Invoice
              </button>
              <button onClick={() => handleSubmit(true)} className="btn-secondary flex items-center gap-2">
                <FileText size={16} />
                Save as Draft
              </button>
              <button onClick={resetForm} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Invoices */}
      <div>
        <h2 className="text-lg font-semibold text-charcoal mb-3">Invoice History</h2>
        {myInvoices.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            description="Create your first invoice to get started."
          />
        ) : (
          <div className="space-y-3">
            {myInvoices.map((invoice) => (
              <div key={invoice.id} className="card p-0 overflow-hidden">
                {/* Invoice row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-sage-pale/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)}
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="text-sm font-semibold text-forest">{invoice.invoiceNumber}</span>
                      <div className="text-xs text-mid-gray mt-0.5">
                        {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-bold text-charcoal">{formatCurrency(invoice.total)}</span>
                    <StatusBadge status={invoice.status} />
                    {expandedId === invoice.id ? <ChevronUp size={16} className="text-mid-gray" /> : <ChevronDown size={16} className="text-mid-gray" />}
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === invoice.id && (
                  <div className="border-t border-sage-pale p-4 bg-sage-pale/20">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                      <div>
                        <span className="text-xs text-mid-gray block">Invoice Date</span>
                        <span className="font-medium">{formatDate(invoice.invoiceDate)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-mid-gray block">Due Date</span>
                        <span className="font-medium">{formatDate(invoice.dueDate)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-mid-gray block">Subtotal</span>
                        <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-mid-gray block">GST</span>
                        <span className="font-medium">{formatCurrency(invoice.gstAmount)}</span>
                      </div>
                    </div>

                    {/* Line items summary */}
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-mid-gray uppercase mb-2">Line Items</h4>
                      <div className="space-y-1">
                        {invoice.lineItems.map((li) => (
                          <div key={li.id} className="flex justify-between text-sm">
                            <span className="text-charcoal">{li.description}</span>
                            <span className="text-mid-gray">{li.hours}h x {formatCurrency(li.rate)} = {formatCurrency(li.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {invoice.rejectionReason && (
                      <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">
                          <strong>Rejection Reason:</strong> {invoice.rejectionReason}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {invoice.status === 'Draft' && (
                        <button onClick={() => handleEdit(invoice)} className="btn-secondary text-sm flex items-center gap-1">
                          <FileText size={14} />
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadPdf(invoice)}
                        disabled={downloadingId === invoice.id}
                        className="btn-secondary text-sm flex items-center gap-1"
                      >
                        <Download size={14} />
                        Download PDF
                      </button>
                      {invoice.status === 'Draft' && (
                        <button
                          onClick={() => {
                            updateContractorInvoice(invoice.id, {
                              status: 'Submitted',
                              submittedAt: new Date().toISOString(),
                            });
                            toast.success('Invoice submitted');
                          }}
                          className="btn-primary text-sm flex items-center gap-1"
                        >
                          <Send size={14} />
                          Submit
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
