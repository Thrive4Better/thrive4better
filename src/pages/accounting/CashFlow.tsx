import { useState, useMemo } from 'react';
import {
  Banknote, Download, Printer, Calendar, TrendingUp, TrendingDown, ArrowRight,
} from 'lucide-react';
import {
  format, parseISO, startOfMonth, endOfMonth, isWithinInterval,
  startOfQuarter, endOfQuarter, eachMonthOfInterval,
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, LineChart, Line,
} from 'recharts';
import toast from 'react-hot-toast';
import { cn, formatCurrency } from '@/lib/utils';
import { useStore } from '@/stores/useStore';

// ── Types ──

type DatePreset = 'this_month' | 'this_quarter' | 'this_fy' | 'custom';

function getFYStart(date: Date): Date {
  const year = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(year, 6, 1);
}

function getFYEnd(date: Date): Date {
  const year = date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear();
  return new Date(year, 5, 30);
}

function getTransactionsFromStorage(): { date: string; debit: number; credit: number; type: string; accountCode: string; accountName: string }[] {
  try {
    const saved = localStorage.getItem('t4b_transactions');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function getAccountBalance(code: string): number {
  try {
    const saved = localStorage.getItem('t4b_chart_of_accounts');
    if (!saved) return 0;
    const accounts = JSON.parse(saved) as { code: string; balance: number }[];
    return accounts.find((a) => a.code === code)?.balance || 0;
  } catch { return 0; }
}

// ── Component ──

export default function CashFlow() {
  const { invoices, shifts } = useStore();

  const [preset, setPreset] = useState<DatePreset>('this_fy');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const period = useMemo(() => {
    const now = new Date();
    switch (preset) {
      case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'this_quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
      case 'this_fy': return { start: getFYStart(now), end: getFYEnd(now) };
      case 'custom': return { start: parseISO(customStart), end: parseISO(customEnd) };
    }
  }, [preset, customStart, customEnd]);

  const cashFlowData = useMemo(() => {
    const { start, end } = period;
    const transactions = getTransactionsFromStorage();

    // ── Operating Activities ──

    // Receipts from NDIS (paid invoices in period)
    const ndisReceipts = invoices
      .filter((inv) => {
        if (inv.status !== 'Paid') return false;
        try {
          const d = parseISO(inv.invoiceDate);
          return isWithinInterval(d, { start, end });
        } catch { return false; }
      })
      .reduce((s, inv) => s + inv.total, 0);

    // Other receipts (income transactions not from invoices)
    const incomeTransactions = transactions
      .filter((t) => {
        if (t.type !== 'income') return false;
        try {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start, end });
        } catch { return false; }
      })
      .reduce((s, t) => s + t.debit, 0);
    // Avoid double counting - income transactions may include invoice payments
    const otherReceipts = Math.max(0, incomeTransactions - ndisReceipts);

    // Payments to employees (from shifts or wage transactions)
    const completedShifts = shifts.filter((sh) => {
      if (sh.status !== 'Completed') return false;
      try {
        const d = parseISO(sh.date);
        return isWithinInterval(d, { start, end });
      } catch { return false; }
    });
    const wagePayments = completedShifts.reduce((s, sh) => s + sh.totalAmount, 0);
    const superPayments = Math.round(wagePayments * 0.115 * 100) / 100;

    // GST paid/collected
    const gstCollected = invoices
      .filter((inv) => {
        if (!inv.gstApplicable || inv.status === 'Draft') return false;
        try {
          const d = parseISO(inv.invoiceDate);
          return isWithinInterval(d, { start, end });
        } catch { return false; }
      })
      .reduce((s, inv) => s + inv.gstAmount, 0);

    const expenseTransactions = transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start, end });
      } catch { return false; }
    });
    const totalExpenses = expenseTransactions.reduce((s, t) => s + t.credit, 0);
    const gstPaid = Math.round((totalExpenses / 11) * 100) / 100;

    // Other operating expenses
    const otherOperatingPayments = totalExpenses - gstPaid;

    const totalOperatingReceipts = ndisReceipts + otherReceipts;
    const totalOperatingPayments = wagePayments + superPayments + gstPaid + otherOperatingPayments;
    const netOperating = totalOperatingReceipts - totalOperatingPayments;

    // ── Investing Activities ──
    // Capital purchases from fixed asset account transactions
    const investingTransactions = transactions.filter((t) => {
      if (!t.accountCode.startsWith('1-2')) return false; // Fixed assets
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start, end });
      } catch { return false; }
    });
    const equipmentPurchases = investingTransactions.reduce((s, t) => s + (t.debit - t.credit), 0);
    const netInvesting = -Math.abs(equipmentPurchases);

    // ── Financing Activities ──
    const financingTransactions = transactions.filter((t) => {
      if (!t.accountCode.startsWith('2-2') && !t.accountCode.startsWith('3-')) return false;
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start, end });
      } catch { return false; }
    });
    const loanProceeds = financingTransactions.filter((t) => t.debit > 0).reduce((s, t) => s + t.debit, 0);
    const loanRepayments = financingTransactions.filter((t) => t.credit > 0).reduce((s, t) => s + t.credit, 0);
    const ownerDrawings = transactions
      .filter((t) => t.accountCode === '3-1010')
      .filter((t) => {
        try {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start, end });
        } catch { return false; }
      })
      .reduce((s, t) => s + t.debit, 0);
    const netFinancing = loanProceeds - loanRepayments - ownerDrawings;

    // ── Cash Position ──
    const netChange = netOperating + netInvesting + netFinancing;
    const openingCash = getAccountBalance('1-1000');
    const closingCash = openingCash + netChange;

    return {
      // Operating
      ndisReceipts, otherReceipts, totalOperatingReceipts,
      wagePayments, superPayments, gstCollected, gstPaid, otherOperatingPayments, totalOperatingPayments,
      netOperating,
      // Investing
      equipmentPurchases, netInvesting,
      // Financing
      loanProceeds, loanRepayments, ownerDrawings, netFinancing,
      // Summary
      netChange, openingCash, closingCash,
    };
  }, [period, invoices, shifts]);

  // Monthly trend chart
  const monthlyTrend = useMemo(() => {
    try {
      const months = eachMonthOfInterval({ start: period.start, end: period.end });
      return months.map((month) => {
        const mStart = startOfMonth(month);
        const mEnd = endOfMonth(month);

        const receipts = invoices
          .filter((inv) => {
            if (inv.status !== 'Paid') return false;
            try { return isWithinInterval(parseISO(inv.invoiceDate), { start: mStart, end: mEnd }); } catch { return false; }
          })
          .reduce((s, inv) => s + inv.total, 0);

        const payments = shifts
          .filter((sh) => {
            if (sh.status !== 'Completed') return false;
            try { return isWithinInterval(parseISO(sh.date), { start: mStart, end: mEnd }); } catch { return false; }
          })
          .reduce((s, sh) => s + sh.totalAmount, 0);

        return {
          month: format(month, 'MMM yy'),
          receipts,
          payments,
          net: receipts - payments,
        };
      });
    } catch { return []; }
  }, [period, invoices, shifts]);

  const handlePrint = () => { window.print(); };

  const handleExport = () => {
    const lines: string[] = [
      'Cash Flow Statement',
      `${format(period.start, 'dd/MM/yyyy')} to ${format(period.end, 'dd/MM/yyyy')}`,
      'Thrive 4 Better Pty Ltd | ABN 15 694 748 297',
      '',
      'OPERATING ACTIVITIES',
      'Cash Receipts',
      `  NDIS Service Revenue,${cashFlowData.ndisReceipts.toFixed(2)}`,
      `  Other Receipts,${cashFlowData.otherReceipts.toFixed(2)}`,
      `Total Cash Receipts,${cashFlowData.totalOperatingReceipts.toFixed(2)}`,
      '',
      'Cash Payments',
      `  Payments to Employees,${cashFlowData.wagePayments.toFixed(2)}`,
      `  Superannuation,${cashFlowData.superPayments.toFixed(2)}`,
      `  GST Paid,${cashFlowData.gstPaid.toFixed(2)}`,
      `  Other Operating Payments,${cashFlowData.otherOperatingPayments.toFixed(2)}`,
      `Total Cash Payments,${cashFlowData.totalOperatingPayments.toFixed(2)}`,
      `Net Cash from Operating,${cashFlowData.netOperating.toFixed(2)}`,
      '',
      'INVESTING ACTIVITIES',
      `  Equipment Purchases,${cashFlowData.equipmentPurchases.toFixed(2)}`,
      `Net Cash from Investing,${cashFlowData.netInvesting.toFixed(2)}`,
      '',
      'FINANCING ACTIVITIES',
      `  Loan Proceeds,${cashFlowData.loanProceeds.toFixed(2)}`,
      `  Loan Repayments,${cashFlowData.loanRepayments.toFixed(2)}`,
      `  Owner Drawings,${cashFlowData.ownerDrawings.toFixed(2)}`,
      `Net Cash from Financing,${cashFlowData.netFinancing.toFixed(2)}`,
      '',
      `NET CHANGE IN CASH,${cashFlowData.netChange.toFixed(2)}`,
      `Opening Cash,${cashFlowData.openingCash.toFixed(2)}`,
      `Closing Cash,${cashFlowData.closingCash.toFixed(2)}`,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `CashFlow_${format(period.start, 'yyyyMMdd')}_${format(period.end, 'yyyyMMdd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Cash flow exported');
  };

  const FlowRow = ({ label, amount, indent, bold, border }: {
    label: string; amount: number; indent?: boolean; bold?: boolean; border?: boolean;
  }) => (
    <div className={cn(
      'flex items-center justify-between px-6 py-2',
      indent && 'pl-10',
      bold && 'font-bold',
      border && 'border-t border-gray-300 pt-3 mt-1'
    )}>
      <span className={cn('text-sm', bold ? 'text-charcoal' : 'text-mid-gray')}>{label}</span>
      <span className={cn('text-sm font-medium', amount < 0 ? 'text-red-600' : amount > 0 ? 'text-green-700' : 'text-charcoal')}>
        {amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
      </span>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Cash Flow Statement</h1>
          <p className="text-sm text-mid-gray mt-1">Cash receipts and payments for the period</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="btn-ghost flex items-center gap-2">
            <Printer size={16} />
            Print
          </button>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {([
            { key: 'this_month', label: 'This Month' },
            { key: 'this_quarter', label: 'This Quarter' },
            { key: 'this_fy', label: 'This FY' },
            { key: 'custom', label: 'Custom' },
          ] as { key: DatePreset; label: string }[]).map((p) => (
            <button
              key={p.key}
              onClick={() => setPreset(p.key)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                preset === p.key ? 'bg-forest text-white' : 'bg-gray-100 text-mid-gray hover:bg-gray-200'
              )}
            >
              {p.label}
            </button>
          ))}
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input-field" />
              <span className="text-mid-gray">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input-field" />
            </div>
          )}
        </div>
        <p className="text-xs text-mid-gray mt-2">
          {format(period.start, 'dd MMM yyyy')} - {format(period.end, 'dd MMM yyyy')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp size={20} className="text-green-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-mid-gray">Total Receipts</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(cashFlowData.totalOperatingReceipts)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <TrendingDown size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-mid-gray">Total Payments</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(cashFlowData.totalOperatingPayments)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', cashFlowData.netChange >= 0 ? 'bg-green-100' : 'bg-red-100')}>
              <Banknote size={20} className={cashFlowData.netChange >= 0 ? 'text-green-700' : 'text-red-600'} />
            </div>
            <div>
              <p className="text-xs font-medium text-mid-gray">Net Change</p>
              <p className={cn('text-lg font-bold', cashFlowData.netChange >= 0 ? 'text-green-700' : 'text-red-600')}>
                {formatCurrency(cashFlowData.netChange)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <Banknote size={20} className="text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-mid-gray">Closing Cash</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(cashFlowData.closingCash)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      {monthlyTrend.length > 1 && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-charcoal mb-4">Monthly Cash Flow Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="receipts" name="Receipts" fill="#2D5A3D" radius={[4, 4, 0, 0]} />
                <Bar dataKey="payments" name="Payments" fill="#8B2252" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Cash Flow Statement */}
      <div className="card overflow-hidden">
        {/* Operating Activities */}
        <div className="px-6 py-3 bg-green-50 border-b border-green-200">
          <h3 className="text-sm font-bold text-green-800">Operating Activities</h3>
        </div>
        <div className="py-2">
          <div className="px-6 py-1 text-xs font-semibold text-mid-gray uppercase tracking-wide">Cash Receipts</div>
          <FlowRow label="NDIS Service Revenue" amount={cashFlowData.ndisReceipts} indent />
          <FlowRow label="Other Receipts" amount={cashFlowData.otherReceipts} indent />
          <FlowRow label="Total Cash Receipts" amount={cashFlowData.totalOperatingReceipts} bold border />

          <div className="px-6 py-1 mt-2 text-xs font-semibold text-mid-gray uppercase tracking-wide">Cash Payments</div>
          <FlowRow label="Payments to Employees" amount={-cashFlowData.wagePayments} indent />
          <FlowRow label="Superannuation" amount={-cashFlowData.superPayments} indent />
          <FlowRow label="GST Paid" amount={-cashFlowData.gstPaid} indent />
          <FlowRow label="Other Operating Payments" amount={-cashFlowData.otherOperatingPayments} indent />
          <FlowRow label="Total Cash Payments" amount={-cashFlowData.totalOperatingPayments} bold border />
        </div>
        <div className="px-6 py-3 bg-green-50/50 border-y border-green-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-green-800">Net Cash from Operating Activities</span>
            <span className={cn('text-sm font-bold', cashFlowData.netOperating >= 0 ? 'text-green-700' : 'text-red-600')}>
              {formatCurrency(cashFlowData.netOperating)}
            </span>
          </div>
        </div>

        {/* Investing Activities */}
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200 mt-2">
          <h3 className="text-sm font-bold text-blue-800">Investing Activities</h3>
        </div>
        <div className="py-2">
          <FlowRow label="Equipment / Asset Purchases" amount={-cashFlowData.equipmentPurchases} indent />
        </div>
        <div className="px-6 py-3 bg-blue-50/50 border-y border-blue-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-blue-800">Net Cash from Investing Activities</span>
            <span className={cn('text-sm font-bold', cashFlowData.netInvesting >= 0 ? 'text-green-700' : 'text-red-600')}>
              {formatCurrency(cashFlowData.netInvesting)}
            </span>
          </div>
        </div>

        {/* Financing Activities */}
        <div className="px-6 py-3 bg-purple-50 border-b border-purple-200 mt-2">
          <h3 className="text-sm font-bold text-purple-800">Financing Activities</h3>
        </div>
        <div className="py-2">
          <FlowRow label="Loan Proceeds" amount={cashFlowData.loanProceeds} indent />
          <FlowRow label="Loan Repayments" amount={-cashFlowData.loanRepayments} indent />
          <FlowRow label="Owner Drawings" amount={-cashFlowData.ownerDrawings} indent />
        </div>
        <div className="px-6 py-3 bg-purple-50/50 border-y border-purple-100">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-purple-800">Net Cash from Financing Activities</span>
            <span className={cn('text-sm font-bold', cashFlowData.netFinancing >= 0 ? 'text-green-700' : 'text-red-600')}>
              {formatCurrency(cashFlowData.netFinancing)}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="p-6 bg-forest/5 border-t-2 border-forest">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-forest">Net Change in Cash</span>
              <span className={cn('text-base font-bold', cashFlowData.netChange >= 0 ? 'text-green-700' : 'text-red-600')}>
                {formatCurrency(cashFlowData.netChange)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-forest/20">
              <span className="text-sm text-mid-gray">Opening Cash Position</span>
              <span className="text-sm font-medium text-charcoal">{formatCurrency(cashFlowData.openingCash)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-mid-gray">Add: Net Change in Cash</span>
                <ArrowRight size={14} className="text-mid-gray" />
              </div>
              <span className={cn('text-sm font-medium', cashFlowData.netChange >= 0 ? 'text-green-700' : 'text-red-600')}>
                {formatCurrency(cashFlowData.netChange)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-3 border-t-2 border-forest">
              <span className="text-lg font-bold text-forest">Closing Cash Position</span>
              <span className="text-lg font-bold text-forest">{formatCurrency(cashFlowData.closingCash)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
