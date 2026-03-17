import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, CheckCircle2, Calendar, DollarSign, AlertCircle,
  Building2, Clock,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import toast from 'react-hot-toast';
import EmptyState from '@/components/ui/EmptyState';
import { cn, formatCurrency, generateId } from '@/lib/utils';
import { useStore } from '@/stores/useStore';

// ── Types ──

interface BASQuarter {
  label: string;
  startMonth: number; // 0-indexed
  endMonth: number;
  year: number;
  key: string;
}

interface BASLodgement {
  id: string;
  quarterKey: string;
  quarterLabel: string;
  gstCollected: number;
  gstPaid: number;
  gstPayable: number;
  paygWithholding: number;
  paygInstalment: number;
  totalAmount: number;
  lodgedDate: string;
  status: 'draft' | 'lodged' | 'paid';
  createdAt: string;
}

// ── Helpers ──

function getFinancialYearQuarters(fyStartYear: number): BASQuarter[] {
  return [
    { label: `Q1 Jul-Sep ${fyStartYear}`, startMonth: 6, endMonth: 8, year: fyStartYear, key: `${fyStartYear}-Q1` },
    { label: `Q2 Oct-Dec ${fyStartYear}`, startMonth: 9, endMonth: 11, year: fyStartYear, key: `${fyStartYear}-Q2` },
    { label: `Q3 Jan-Mar ${fyStartYear + 1}`, startMonth: 0, endMonth: 2, year: fyStartYear + 1, key: `${fyStartYear}-Q3` },
    { label: `Q4 Apr-Jun ${fyStartYear + 1}`, startMonth: 3, endMonth: 5, year: fyStartYear + 1, key: `${fyStartYear}-Q4` },
  ];
}

function getCurrentFYStartYear(): number {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

function getTransactionsFromStorage(): { date: string; debit: number; credit: number; type: string; accountCode: string }[] {
  try {
    const saved = localStorage.getItem('t4b_transactions');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// ── Component ──

export default function BASReport() {
  const { invoices, shifts } = useStore();

  const [lodgements, setLodgements] = useState<BASLodgement[]>(() => {
    const saved = localStorage.getItem('t4b_bas_lodgements');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => { localStorage.setItem('t4b_bas_lodgements', JSON.stringify(lodgements)); }, [lodgements]);

  const currentFY = getCurrentFYStartYear();
  const [selectedFY, setSelectedFY] = useState(currentFY);
  const [selectedQuarterKey, setSelectedQuarterKey] = useState('');

  const quarters = useMemo(() => getFinancialYearQuarters(selectedFY), [selectedFY]);

  // If no quarter selected, pick current
  useEffect(() => {
    if (!selectedQuarterKey && quarters.length > 0) {
      const now = new Date();
      const month = now.getMonth();
      let qKey = quarters[0].key;
      if (month >= 6 && month <= 8) qKey = quarters[0].key;
      else if (month >= 9 && month <= 11) qKey = quarters[1].key;
      else if (month >= 0 && month <= 2) qKey = quarters[2].key;
      else qKey = quarters[3].key;
      setSelectedQuarterKey(qKey);
    }
  }, [quarters, selectedQuarterKey]);

  const selectedQuarter = quarters.find((q) => q.key === selectedQuarterKey);

  // Calculate BAS figures
  const basData = useMemo(() => {
    if (!selectedQuarter) return { gstCollected: 0, gstPaid: 0, gstPayable: 0, paygWithholding: 0, paygInstalment: 0, totalAmount: 0, revenueBreakdown: [] as { category: string; amount: number; gst: number }[] };

    const qStart = new Date(selectedQuarter.year, selectedQuarter.startMonth, 1);
    const qEnd = endOfMonth(new Date(selectedQuarter.year, selectedQuarter.endMonth, 1));

    // GST collected from invoices in the quarter
    const quarterInvoices = invoices.filter((inv) => {
      try {
        const d = parseISO(inv.invoiceDate);
        return isWithinInterval(d, { start: qStart, end: qEnd });
      } catch { return false; }
    });

    const gstCollected = quarterInvoices
      .filter((inv) => inv.gstApplicable)
      .reduce((sum, inv) => sum + inv.gstAmount, 0);

    const totalRevenue = quarterInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);

    // Revenue breakdown by support category
    const categoryMap: Record<string, { amount: number; gst: number }> = {};
    for (const inv of quarterInvoices) {
      for (const item of inv.lineItems) {
        const cat = item.supportCategory || 'Uncategorised';
        if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, gst: 0 };
        categoryMap[cat].amount += item.amount;
      }
      if (inv.gstApplicable) {
        const cat = inv.lineItems[0]?.supportCategory || 'Uncategorised';
        if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, gst: 0 };
        categoryMap[cat].gst += inv.gstAmount;
      }
    }
    const revenueBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      amount: data.amount,
      gst: data.gst,
    }));

    // GST paid on expenses (from transactions)
    const transactions = getTransactionsFromStorage();
    const expenseTransactions = transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: qStart, end: qEnd });
      } catch { return false; }
    });
    const totalExpenses = expenseTransactions.reduce((s, t) => s + t.credit, 0);
    // Estimate GST on expenses at 1/11 (standard for GST-inclusive)
    const gstPaid = Math.round((totalExpenses / 11) * 100) / 100;

    const gstPayable = gstCollected - gstPaid;

    // PAYG estimates from wage expenses
    const wageShifts = shifts.filter((sh) => {
      if (sh.status !== 'Completed') return false;
      try {
        const d = parseISO(sh.date);
        return isWithinInterval(d, { start: qStart, end: qEnd });
      } catch { return false; }
    });
    const totalWages = wageShifts.reduce((s, sh) => s + sh.totalAmount, 0);
    // Rough PAYG withholding estimate (average ~20% for support workers)
    const paygWithholding = Math.round(totalWages * 0.20 * 100) / 100;
    // PAYG instalment (estimated at 2% of revenue for small business)
    const paygInstalment = Math.round(totalRevenue * 0.02 * 100) / 100;

    const totalAmount = gstPayable + paygWithholding + paygInstalment;

    return { gstCollected, gstPaid, gstPayable, paygWithholding, paygInstalment, totalAmount, revenueBreakdown };
  }, [selectedQuarter, invoices, shifts]);

  const existingLodgement = lodgements.find((l) => l.quarterKey === selectedQuarterKey);

  const handleLodge = () => {
    if (existingLodgement) {
      setLodgements((prev) =>
        prev.map((l) => l.quarterKey === selectedQuarterKey
          ? { ...l, status: 'lodged', lodgedDate: format(new Date(), 'yyyy-MM-dd'), ...basData }
          : l
        )
      );
    } else {
      const lodgement: BASLodgement = {
        id: generateId(),
        quarterKey: selectedQuarterKey,
        quarterLabel: selectedQuarter?.label || '',
        gstCollected: basData.gstCollected,
        gstPaid: basData.gstPaid,
        gstPayable: basData.gstPayable,
        paygWithholding: basData.paygWithholding,
        paygInstalment: basData.paygInstalment,
        totalAmount: basData.totalAmount,
        lodgedDate: format(new Date(), 'yyyy-MM-dd'),
        status: 'lodged',
        createdAt: new Date().toISOString(),
      };
      setLodgements((prev) => [...prev, lodgement]);
    }
    toast.success('BAS marked as lodged');
  };

  const markPaid = (id: string) => {
    setLodgements((prev) => prev.map((l) => l.id === id ? { ...l, status: 'paid' } : l));
    toast.success('BAS marked as paid');
  };

  const exportCsv = () => {
    const headers = ['Field', 'Amount'];
    const rows = [
      ['GST on Sales (1A)', basData.gstCollected.toFixed(2)],
      ['GST on Purchases (1B)', basData.gstPaid.toFixed(2)],
      ['GST Payable/Refundable', basData.gstPayable.toFixed(2)],
      ['PAYG Withholding (W1)', basData.paygWithholding.toFixed(2)],
      ['PAYG Instalment (T1)', basData.paygInstalment.toFixed(2)],
      ['Total BAS Amount', basData.totalAmount.toFixed(2)],
    ];
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BAS_${selectedQuarterKey}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('BAS exported to CSV');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">BAS Preparation</h1>
          <p className="text-sm text-mid-gray mt-1">Business Activity Statement - GST and PAYG reporting</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCsv} className="btn-ghost flex items-center gap-2">
            <Download size={16} />
            Export CSV
          </button>
          {!existingLodgement || existingLodgement.status === 'draft' ? (
            <button onClick={handleLodge} className="btn-primary flex items-center gap-2">
              <CheckCircle2 size={16} />
              Mark as Lodged
            </button>
          ) : null}
        </div>
      </div>

      {/* Business Info */}
      <div className="card p-4 bg-cream/50 flex items-center gap-4">
        <Building2 size={20} className="text-forest" />
        <div>
          <p className="text-sm font-semibold text-charcoal">Thrive 4 Better Pty Ltd</p>
          <p className="text-xs text-mid-gray">ABN 15 694 748 297 | 20 Zelkova Cct, Fraser Rise VIC 3336</p>
        </div>
      </div>

      {/* Quarter Selection */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-mid-gray mb-1">Financial Year</label>
            <select
              value={selectedFY}
              onChange={(e) => { setSelectedFY(parseInt(e.target.value)); setSelectedQuarterKey(''); }}
              className="input-field"
            >
              {[currentFY, currentFY - 1, currentFY - 2].map((y) => (
                <option key={y} value={y}>{y}/{y + 1}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            {quarters.map((q) => (
              <button
                key={q.key}
                onClick={() => setSelectedQuarterKey(q.key)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  selectedQuarterKey === q.key
                    ? 'bg-forest text-white'
                    : 'bg-gray-100 text-mid-gray hover:bg-gray-200'
                )}
              >
                {q.label}
              </button>
            ))}
          </div>
          {existingLodgement && (
            <span className={cn(
              'text-xs px-3 py-1 rounded-full font-medium ml-auto',
              existingLodgement.status === 'paid' ? 'bg-green-100 text-green-700' :
              existingLodgement.status === 'lodged' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            )}>
              {existingLodgement.status === 'paid' ? 'Paid' : existingLodgement.status === 'lodged' ? 'Lodged' : 'Draft'}
            </span>
          )}
        </div>
      </div>

      {selectedQuarter && (
        <>
          {/* GST Section */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 bg-forest/5 border-b border-forest/10">
              <h2 className="text-lg font-bold text-charcoal">GST Section</h2>
              <p className="text-xs text-mid-gray">Goods and Services Tax for {selectedQuarter.label}</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-6">
                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide">1A - GST on Sales</p>
                  <p className="text-2xl font-bold text-green-800 mt-2">{formatCurrency(basData.gstCollected)}</p>
                  <p className="text-xs text-green-600 mt-1">GST collected on invoices</p>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-xs font-medium text-red-700 uppercase tracking-wide">1B - GST on Purchases</p>
                  <p className="text-2xl font-bold text-red-800 mt-2">{formatCurrency(basData.gstPaid)}</p>
                  <p className="text-xs text-red-600 mt-1">GST paid on expenses (estimated)</p>
                </div>
                <div className={cn('p-4 rounded-xl border', basData.gstPayable >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200')}>
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: basData.gstPayable >= 0 ? '#92400e' : '#1e40af' }}>
                    {basData.gstPayable >= 0 ? 'GST Payable to ATO' : 'GST Refundable from ATO'}
                  </p>
                  <p className="text-2xl font-bold mt-2" style={{ color: basData.gstPayable >= 0 ? '#92400e' : '#1e40af' }}>
                    {formatCurrency(Math.abs(basData.gstPayable))}
                  </p>
                  <p className="text-xs mt-1" style={{ color: basData.gstPayable >= 0 ? '#b45309' : '#2563eb' }}>
                    1A minus 1B
                  </p>
                </div>
              </div>

              {/* Revenue breakdown */}
              {basData.revenueBreakdown.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-charcoal mb-2">Revenue Breakdown by Category</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left text-xs font-semibold text-mid-gray py-2">Category</th>
                          <th className="text-right text-xs font-semibold text-mid-gray py-2">Revenue</th>
                          <th className="text-right text-xs font-semibold text-mid-gray py-2">GST</th>
                        </tr>
                      </thead>
                      <tbody>
                        {basData.revenueBreakdown.map((item) => (
                          <tr key={item.category} className="border-b border-gray-100">
                            <td className="text-sm text-charcoal py-2">{item.category}</td>
                            <td className="text-sm text-charcoal text-right py-2">{formatCurrency(item.amount)}</td>
                            <td className="text-sm text-charcoal text-right py-2">{formatCurrency(item.gst)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PAYG Section */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 bg-burgundy/5 border-b border-burgundy/10">
              <h2 className="text-lg font-bold text-charcoal">PAYG Section</h2>
              <p className="text-xs text-mid-gray">Pay As You Go withholding and instalments</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-purple-50 border border-purple-200">
                  <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">W1 - PAYG Withholding</p>
                  <p className="text-2xl font-bold text-purple-800 mt-2">{formatCurrency(basData.paygWithholding)}</p>
                  <p className="text-xs text-purple-600 mt-1">Tax withheld from employee wages (estimated at 20%)</p>
                </div>
                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                  <p className="text-xs font-medium text-indigo-700 uppercase tracking-wide">T1 - PAYG Instalment</p>
                  <p className="text-2xl font-bold text-indigo-800 mt-2">{formatCurrency(basData.paygInstalment)}</p>
                  <p className="text-xs text-indigo-600 mt-1">Instalment based on revenue (estimated at 2%)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Total BAS Amount */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-charcoal">Total BAS Amount</h2>
                <p className="text-xs text-mid-gray mt-1">GST payable + PAYG withholding + PAYG instalment</p>
              </div>
              <div className="text-right">
                <p className={cn('text-3xl font-bold', basData.totalAmount >= 0 ? 'text-red-600' : 'text-green-700')}>
                  {formatCurrency(Math.abs(basData.totalAmount))}
                </p>
                <p className="text-sm text-mid-gray mt-1">
                  {basData.totalAmount >= 0 ? 'Payable to ATO' : 'Refundable from ATO'}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-mid-gray">GST Payable</span>
                  <span className="font-medium text-charcoal">{formatCurrency(basData.gstPayable)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mid-gray">PAYG Withholding</span>
                  <span className="font-medium text-charcoal">{formatCurrency(basData.paygWithholding)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-mid-gray">PAYG Instalment</span>
                  <span className="font-medium text-charcoal">{formatCurrency(basData.paygInstalment)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Historical Lodgements */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-charcoal">Lodgement History</h2>
        </div>
        {lodgements.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No BAS lodgements"
            description="Prepare and lodge your first BAS above."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">Quarter</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">GST Payable</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">PAYG W/H</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">PAYG Inst.</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">Total</th>
                  <th className="text-left text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">Lodged</th>
                  <th className="text-left text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {lodgements.slice().reverse().map((l) => (
                  <tr key={l.id} className="border-b border-gray-100 hover:bg-cream/30">
                    <td className="px-6 py-3 text-sm font-medium text-charcoal">{l.quarterLabel}</td>
                    <td className="px-6 py-3 text-sm text-right text-charcoal">{formatCurrency(l.gstPayable)}</td>
                    <td className="px-6 py-3 text-sm text-right text-charcoal">{formatCurrency(l.paygWithholding)}</td>
                    <td className="px-6 py-3 text-sm text-right text-charcoal">{formatCurrency(l.paygInstalment)}</td>
                    <td className="px-6 py-3 text-sm text-right font-bold text-charcoal">{formatCurrency(l.totalAmount)}</td>
                    <td className="px-6 py-3 text-sm text-mid-gray">{l.lodgedDate ? format(parseISO(l.lodgedDate), 'dd MMM yyyy') : '-'}</td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        l.status === 'paid' ? 'bg-green-100 text-green-700' :
                        l.status === 'lodged' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      )}>
                        {l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      {l.status === 'lodged' && (
                        <button onClick={() => markPaid(l.id)} className="text-xs text-forest font-medium hover:underline">
                          Mark Paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
