import { useState, useMemo } from 'react';
import {
  FileText, Download, Check, X, MessageSquare,
  ChevronDown, ChevronUp, Send, Eye, Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { pdf } from '@react-pdf/renderer';

import { useStore } from '@/stores/useStore';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { notifyContractorInvoiceApproved, notifyContractorInvoiceRejected } from '@/lib/notifications';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';
import ContractorInvoicePdf from '@/pages/staff/ContractorInvoicePdf';
import RemittanceAdviceModal from '@/components/invoices/RemittanceAdviceModal';
import type { ContractorInvoice } from '@/types';

type StatusFilter = 'All' | 'Submitted' | 'Approved' | 'Paid' | 'Rejected' | 'Draft';

export default function ContractorInvoices() {
  const {
    contractorInvoices, carers, updateContractorInvoice,
  } = useStore();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [remittanceModalOpen, setRemittanceModalOpen] = useState(false);
  const [remittanceCarerId, setRemittanceCarerId] = useState<string | null>(null);

  const getCarerName = (carerId: string) => {
    const carer = carers.find(c => c.id === carerId);
    return carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown';
  };

  const filteredInvoices = useMemo(() => {
    let list = [...contractorInvoices].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    if (statusFilter !== 'All') {
      list = list.filter(i => i.status === statusFilter);
    }
    return list;
  }, [contractorInvoices, statusFilter]);

  const kpis = useMemo(() => {
    const submitted = contractorInvoices.filter(i => i.status === 'Submitted').length;
    const approved = contractorInvoices.filter(i => i.status === 'Approved').length;
    const totalOwed = contractorInvoices
      .filter(i => i.status === 'Approved')
      .reduce((sum, i) => sum + i.total, 0);
    const totalPaid = contractorInvoices
      .filter(i => i.status === 'Paid')
      .reduce((sum, i) => sum + i.total, 0);
    return { submitted, approved, totalOwed, totalPaid };
  }, [contractorInvoices]);

  const handleApprove = (invoice: ContractorInvoice) => {
    updateContractorInvoice(invoice.id, {
      status: 'Approved',
      approvedAt: new Date().toISOString(),
      approvedBy: 'Admin',
    });
    toast.success(`Invoice ${invoice.invoiceNumber} approved`);
    // Notify the contractor
    const carer = carers.find(c => c.id === invoice.carerId);
    if (carer?.email) {
      notifyContractorInvoiceApproved(
        carer.email, carer.phone, `${carer.firstName} ${carer.lastName}`,
        invoice.invoiceNumber, formatCurrency(invoice.total),
        new Date().toLocaleDateString('en-AU')
      ).catch(() => {});
    }
  };

  const handleReject = (invoice: ContractorInvoice) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }
    updateContractorInvoice(invoice.id, {
      status: 'Rejected',
      rejectionReason: rejectionReason.trim(),
    });
    setRejectingId(null);
    setRejectionReason('');
    toast.success(`Invoice ${invoice.invoiceNumber} rejected`);
    // Notify the contractor
    const carer = carers.find(c => c.id === invoice.carerId);
    if (carer?.email) {
      notifyContractorInvoiceRejected(
        carer.email, carer.phone, `${carer.firstName} ${carer.lastName}`,
        invoice.invoiceNumber, formatCurrency(invoice.total),
        rejectionReason.trim()
      ).catch(() => {});
    }
  };

  const handleDownloadPdf = async (invoice: ContractorInvoice) => {
    setDownloadingId(invoice.id);
    try {
      const carerName = getCarerName(invoice.carerId);
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

  const handleIssueRemittance = (carerId: string) => {
    setRemittanceCarerId(carerId);
    setRemittanceModalOpen(true);
  };

  const tabs: StatusFilter[] = ['All', 'Submitted', 'Approved', 'Paid', 'Rejected', 'Draft'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Contractor Invoices</h1>
        <p className="text-sm text-mid-gray mt-1">Review and manage invoices from subcontractors</p>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600">
            <Send size={20} />
          </div>
          <div>
            <p className="text-xs text-mid-gray font-medium">Pending Review</p>
            <p className="text-lg font-bold text-charcoal">{kpis.submitted}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-100 text-emerald-600">
            <Check size={20} />
          </div>
          <div>
            <p className="text-xs text-mid-gray font-medium">Approved</p>
            <p className="text-lg font-bold text-charcoal">{kpis.approved}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600">
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs text-mid-gray font-medium">Total Owed</p>
            <p className="text-lg font-bold text-charcoal">{formatCurrency(kpis.totalOwed)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100 text-green-600">
            <Check size={20} />
          </div>
          <div>
            <p className="text-xs text-mid-gray font-medium">Total Paid</p>
            <p className="text-lg font-bold text-charcoal">{formatCurrency(kpis.totalPaid)}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-sage-pale rounded-lg p-1">
        {tabs.map((tab) => {
          const count = tab === 'All'
            ? contractorInvoices.length
            : contractorInvoices.filter(i => i.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                statusFilter === tab ? 'bg-white text-forest shadow-sm' : 'text-mid-gray hover:text-charcoal'
              )}
            >
              {tab} <span className="ml-1 text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No contractor invoices"
          description={statusFilter === 'All' ? 'No contractor invoices have been submitted yet.' : `No ${statusFilter.toLowerCase()} invoices.`}
        />
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice) => (
            <div key={invoice.id} className="card p-0 overflow-hidden">
              {/* Invoice row */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-sage-pale/30 transition-colors"
                onClick={() => setExpandedId(expandedId === invoice.id ? null : invoice.id)}
              >
                <div className="flex items-center gap-6">
                  <div>
                    <span className="text-sm font-semibold text-forest">{invoice.invoiceNumber}</span>
                    <div className="text-xs text-mid-gray mt-0.5">{getCarerName(invoice.carerId)}</div>
                  </div>
                  <div className="text-xs text-mid-gray">
                    {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}
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
                  {/* Details grid */}
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
                      <span className="text-xs text-mid-gray block">ABN</span>
                      <span className="font-medium">{invoice.contractorAbn || 'Not provided'}</span>
                    </div>
                    <div>
                      <span className="text-xs text-mid-gray block">GST</span>
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium inline-block',
                        invoice.registeredForGst ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      )}>
                        {invoice.registeredForGst ? 'Registered' : 'Not Registered'}
                      </span>
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="mb-4">
                    <h4 className="text-xs font-semibold text-mid-gray uppercase mb-2">Line Items</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[#2D5A3D] text-white">
                            <th className="text-left text-xs font-semibold uppercase px-3 py-2">Description</th>
                            <th className="text-right text-xs font-semibold uppercase px-3 py-2">Hours</th>
                            <th className="text-right text-xs font-semibold uppercase px-3 py-2">Rate</th>
                            <th className="text-right text-xs font-semibold uppercase px-3 py-2">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-sage-pale">
                          {invoice.lineItems.map((li, idx) => (
                            <tr key={li.id} className={idx % 2 === 1 ? 'bg-[#FDF8F0]' : ''}>
                              <td className="px-3 py-2">{li.description}</td>
                              <td className="px-3 py-2 text-right">{li.hours}</td>
                              <td className="px-3 py-2 text-right">{formatCurrency(li.rate)}</td>
                              <td className="px-3 py-2 text-right font-semibold">{formatCurrency(li.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end mb-4">
                    <div className="w-64 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-mid-gray">Subtotal</span>
                        <span>{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-mid-gray">GST</span>
                        <span>{formatCurrency(invoice.gstAmount)}</span>
                      </div>
                      <div className="border-t border-sage-pale pt-1" />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total</span>
                        <span>{formatCurrency(invoice.total)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bank details */}
                  {(invoice.contractorBsb || invoice.contractorAccountNumber) && (
                    <div className="border-l-4 border-[#7A9E7E] bg-[#FDF8F0] rounded-r-lg p-3 mb-4">
                      <h4 className="text-xs font-semibold text-[#2D5A3D] uppercase mb-2">Payment Details</h4>
                      <div className="flex gap-6 text-sm">
                        {invoice.contractorBankName && (
                          <div><span className="text-xs text-mid-gray block">Bank</span>{invoice.contractorBankName}</div>
                        )}
                        {invoice.contractorAccountName && (
                          <div><span className="text-xs text-mid-gray block">Account Name</span>{invoice.contractorAccountName}</div>
                        )}
                        {invoice.contractorBsb && (
                          <div><span className="text-xs text-mid-gray block">BSB</span>{invoice.contractorBsb}</div>
                        )}
                        {invoice.contractorAccountNumber && (
                          <div><span className="text-xs text-mid-gray block">Account #</span>{invoice.contractorAccountNumber}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {invoice.notes && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-mid-gray uppercase mb-1">Notes</h4>
                      <p className="text-sm text-mid-gray">{invoice.notes}</p>
                    </div>
                  )}

                  {invoice.rejectionReason && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-sm text-red-700"><strong>Rejection Reason:</strong> {invoice.rejectionReason}</p>
                    </div>
                  )}

                  {/* Rejection reason input */}
                  {rejectingId === invoice.id && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-red-700 mb-2">Rejection Reason</h4>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        rows={3}
                        className="input-field text-sm mb-2"
                        placeholder="Please provide a reason for rejecting this invoice..."
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleReject(invoice)} className="btn-danger text-sm">
                          Confirm Rejection
                        </button>
                        <button onClick={() => { setRejectingId(null); setRejectionReason(''); }} className="btn-ghost text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleDownloadPdf(invoice)}
                      disabled={downloadingId === invoice.id}
                      className="btn-secondary text-sm flex items-center gap-1"
                    >
                      <Download size={14} />
                      Download PDF
                    </button>

                    {invoice.status === 'Submitted' && (
                      <>
                        <button onClick={() => handleApprove(invoice)} className="btn-primary text-sm flex items-center gap-1">
                          <Check size={14} />
                          Approve
                        </button>
                        <button
                          onClick={() => setRejectingId(invoice.id)}
                          className="bg-red-50 text-red-700 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                        >
                          <X size={14} />
                          Reject
                        </button>
                      </>
                    )}

                    {(invoice.status === 'Approved' || invoice.status === 'Paid') && (
                      <button
                        onClick={() => handleIssueRemittance(invoice.carerId)}
                        className="btn-secondary text-sm flex items-center gap-1"
                      >
                        <MessageSquare size={14} />
                        Issue Remittance
                      </button>
                    )}

                    {invoice.status === 'Approved' && (
                      <button
                        onClick={() => {
                          updateContractorInvoice(invoice.id, { status: 'Paid' });
                          toast.success(`Invoice ${invoice.invoiceNumber} marked as paid`);
                        }}
                        className="bg-green-50 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                      >
                        <Check size={14} />
                        Mark as Paid
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Remittance Advice Modal */}
      {remittanceModalOpen && remittanceCarerId && (
        <RemittanceAdviceModal
          carerId={remittanceCarerId}
          onClose={() => { setRemittanceModalOpen(false); setRemittanceCarerId(null); }}
        />
      )}
    </div>
  );
}
