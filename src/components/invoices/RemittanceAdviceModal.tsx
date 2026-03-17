import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { X, Download, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';

import { useStore } from '@/stores/useStore';
import { formatCurrency, formatDate, generateId, cn } from '@/lib/utils';
import RemittanceAdvicePdf from '@/pages/invoices/RemittanceAdvicePdf';
import type { RemittanceAdvice, ContractorInvoice } from '@/types';

function getNextRemittanceNumber(advices: RemittanceAdvice[]): string {
  const year = new Date().getFullYear();
  const existing = advices
    .map(a => {
      const match = a.remittanceNumber.match(/RA-(\d{4})-(\d+)/);
      if (match && parseInt(match[1]) === year) return parseInt(match[2]);
      return 0;
    })
    .filter(n => n > 0);
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  return `RA-${year}-${String(next).padStart(4, '0')}`;
}

interface RemittanceAdviceModalProps {
  carerId: string;
  onClose: () => void;
}

export default function RemittanceAdviceModal({ carerId, onClose }: RemittanceAdviceModalProps) {
  const {
    contractorInvoices, remittanceAdvices, carers,
    addRemittanceAdvice, updateContractorInvoice,
  } = useStore();

  const carer = carers.find(c => c.id === carerId);
  const carerName = carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown';

  // Eligible invoices: Approved or Paid for this carer
  const eligibleInvoices = useMemo(
    () => contractorInvoices.filter(
      i => i.carerId === carerId && (i.status === 'Approved' || i.status === 'Paid')
    ),
    [contractorInvoices, carerId],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [withholdingTax, setWithholdingTax] = useState(0);
  const [notes, setNotes] = useState('');
  const [downloading, setDownloading] = useState(false);

  const selectedInvoices = useMemo(
    () => eligibleInvoices.filter(i => selectedIds.has(i.id)),
    [eligibleInvoices, selectedIds],
  );

  const subtotal = useMemo(() => selectedInvoices.reduce((sum, i) => sum + i.subtotal, 0), [selectedInvoices]);
  const gstAmount = useMemo(() => selectedInvoices.reduce((sum, i) => sum + i.gstAmount, 0), [selectedInvoices]);
  const totalPaid = subtotal + gstAmount - withholdingTax;

  const periodStart = useMemo(() => {
    if (selectedInvoices.length === 0) return '';
    return selectedInvoices.reduce((min, i) => i.periodStart < min ? i.periodStart : min, selectedInvoices[0].periodStart);
  }, [selectedInvoices]);

  const periodEnd = useMemo(() => {
    if (selectedInvoices.length === 0) return '';
    return selectedInvoices.reduce((max, i) => i.periodEnd > max ? i.periodEnd : max, selectedInvoices[0].periodEnd);
  }, [selectedInvoices]);

  const toggleInvoice = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const buildRemittance = (): RemittanceAdvice => ({
    id: generateId(),
    remittanceNumber: getNextRemittanceNumber(remittanceAdvices),
    contractorInvoiceIds: Array.from(selectedIds),
    carerId,
    paymentDate,
    paymentMethod,
    paymentReference,
    periodStart,
    periodEnd,
    subtotal,
    gstAmount,
    withholdingTax,
    totalPaid,
    notes: notes || undefined,
    createdAt: new Date().toISOString(),
  });

  const getContractorInfo = () => {
    // Get contractor info from the first selected invoice
    const firstInv = selectedInvoices[0];
    return {
      address: firstInv?.contractorAddress,
      abn: firstInv?.contractorAbn,
    };
  };

  const handleDownloadPdf = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one invoice');
      return;
    }
    setDownloading(true);
    try {
      const remittance = buildRemittance();
      const contractorInfo = getContractorInfo();
      const blob = await pdf(
        <RemittanceAdvicePdf
          remittance={remittance}
          invoices={selectedInvoices}
          contractorName={carerName}
          contractorAddress={contractorInfo.address}
          contractorAbn={contractorInfo.abn}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RemittanceAdvice-${remittance.remittanceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Remittance advice PDF downloaded');
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleSave = () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one invoice');
      return;
    }
    if (!paymentReference.trim()) {
      toast.error('Please enter a payment reference');
      return;
    }

    const remittance = buildRemittance();
    addRemittanceAdvice(remittance);

    // Mark selected invoices as Paid
    selectedIds.forEach(id => {
      updateContractorInvoice(id, { status: 'Paid' });
    });

    toast.success('Remittance advice created and invoices marked as paid');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white shadow-xl flex flex-col h-full w-[600px]"
        style={{ animation: 'slideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sage-pale">
          <div>
            <h3 className="text-lg font-semibold text-charcoal">Issue Remittance Advice</h3>
            <p className="text-sm text-mid-gray">For {carerName}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-sage-pale transition-colors">
            <X size={20} className="text-mid-gray" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Select Invoices */}
          <div>
            <h4 className="text-sm font-semibold text-[#2D5A3D] uppercase tracking-wider mb-2">Select Invoices to Include</h4>
            {eligibleInvoices.length === 0 ? (
              <p className="text-sm text-mid-gray">No approved invoices available for this contractor.</p>
            ) : (
              <div className="space-y-2">
                {eligibleInvoices.map((inv) => (
                  <label
                    key={inv.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                      selectedIds.has(inv.id)
                        ? 'border-[#2D5A3D] bg-[#E8F0EC]'
                        : 'border-sage-pale hover:bg-sage-pale/30'
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(inv.id)}
                      onChange={() => toggleInvoice(inv.id)}
                      className="rounded border-sage text-forest focus:ring-forest"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-forest">{inv.invoiceNumber}</span>
                        <span className="text-sm font-bold text-charcoal">{formatCurrency(inv.total)}</span>
                      </div>
                      <div className="text-xs text-mid-gray mt-0.5">
                        {formatDate(inv.periodStart)} - {formatDate(inv.periodEnd)}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Payment Details */}
          <div>
            <h4 className="text-sm font-semibold text-[#2D5A3D] uppercase tracking-wider mb-2">Payment Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Payment Date</label>
                <input
                  type="date" value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-field"
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-charcoal mb-1">Payment Reference</label>
                <input
                  type="text" value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  className="input-field" placeholder="e.g. EFT reference number"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-charcoal mb-1">Withholding Tax ($)</label>
                <input
                  type="number" step="0.01" min="0" value={withholdingTax || ''}
                  onChange={(e) => setWithholdingTax(parseFloat(e.target.value) || 0)}
                  className="input-field" placeholder="0.00"
                />
                <p className="text-xs text-mid-gray mt-1">Apply 47% withholding if no ABN was provided</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Notes (optional)</label>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3} className="input-field" placeholder="Additional notes..."
            />
          </div>

          {/* Totals Summary */}
          {selectedIds.size > 0 && (
            <div className="border-l-4 border-[#2D5A3D] bg-[#E8F0EC] rounded-r-lg p-4">
              <h4 className="text-sm font-semibold text-[#2D5A3D] mb-3">Payment Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-mid-gray">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mid-gray">GST</span>
                  <span>{formatCurrency(gstAmount)}</span>
                </div>
                {withholdingTax > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Withholding Tax</span>
                    <span>-{formatCurrency(withholdingTax)}</span>
                  </div>
                )}
                <div className="border-t border-sage pt-1" />
                <div className="flex justify-between font-bold text-base">
                  <span className="text-[#2D5A3D]">Total Paid</span>
                  <span className="text-[#2D5A3D]">{formatCurrency(totalPaid)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-sage-pale px-6 py-4 flex gap-3">
          <button
            onClick={handleDownloadPdf}
            disabled={selectedIds.size === 0 || downloading}
            className={cn('btn-secondary flex items-center gap-2 flex-1', selectedIds.size === 0 && 'opacity-50 cursor-not-allowed')}
          >
            <Download size={16} />
            Download PDF
          </button>
          <button
            onClick={handleSave}
            disabled={selectedIds.size === 0}
            className={cn('btn-primary flex items-center gap-2 flex-1', selectedIds.size === 0 && 'opacity-50 cursor-not-allowed')}
          >
            <Send size={16} />
            Save & Mark Paid
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
