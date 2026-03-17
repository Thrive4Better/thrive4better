import { useState, useMemo, useCallback } from 'react';
import {
  TrendingUp, Download, Printer, Calendar, ArrowUpDown,
  ChevronDown, ChevronRight, BarChart3,
} from 'lucide-react';
import {
  format, parseISO, startOfMonth, endOfMonth, startOfYear, subMonths, subQuarters,
  subYears, isWithinInterval, startOfQuarter, endOfQuarter,
} from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import toast from 'react-hot-toast';
import { cn, formatCurrency } from '@/lib/utils';
import { useStore } from '@/stores/useStore';

// ── Types ──

type DatePreset = 'this_month' | 'this_quarter' | 'this_fy' | 'custom';
type CompareMode = 'none' | 'last_month' | 'last_quarter' | 'last_year';

interface PeriodRange {
  start: Date;
  end: Date;
}

// ── Helpers ──

function getFYStart(date: Date): Date {
  const year = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(year, 6, 1);
}

function getFYEnd(date: Date): Date {
  const year = date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear();
  return new Date(year, 5, 30);
}

function getPeriodRange(preset: DatePreset, customStart: string, customEnd: string): PeriodRange {
  const now = new Date();
  switch (preset) {
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
    case 'this_quarter': return { start: startOfQuarter(now), end: endOfQuarter(now) };
    case 'this_fy': return { start: getFYStart(now), end: getFYEnd(now) };
    case 'custom': return { start: parseISO(customStart), end: parseISO(customEnd) };
  }
}

function getComparisonPeriod(range: PeriodRange, mode: CompareMode): PeriodRange | null {
  if (mode === 'none') return null;
  const duration = range.end.getTime() - range.start.getTime();
  switch (mode) {
    case 'last_month': {
      const s = subMonths(range.start, 1);
      return { start: startOfMonth(s), end: endOfMonth(s) };
    }
    case 'last_quarter': {
      const s = subQuarters(range.start, 1);
      return { start: startOfQuarter(s), end: endOfQuarter(s) };
    }
    case 'last_year': {
      const s = subYears(range.start, 1);
      const e = subYears(range.end, 1);
      return { start: s, end: e };
    }
  }
}

function getTransactionsFromStorage() {
  try {
    const saved = localStorage.getItem('t4b_transactions');
    return saved ? JSON.parse(saved) as { date: string; debit: number; credit: number; type: string; accountCode: string; accountName: string }[] : [];
  } catch { return []; }
}

// ── Component ──

export default function ProfitAndLoss() {
  const { invoices, shifts } = useStore();

  const [preset, setPreset] = useState<DatePreset>('this_fy');
  const [customStart, setCustomStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [compareMode, setCompareMode] = useState<CompareMode>('none');
  const [expandedSections, setExpandedSections] = useState(new Set(['revenue', 'cos', 'opex']));

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section); else next.add(section);
      return next;
    });
  };

  const period = useMemo(() => getPeriodRange(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const compPeriod = useMemo(() => getComparisonPeriod(period, compareMode), [period, compareMode]);

  const calculatePnL = useCallback((range: PeriodRange) => {
    const { start, end } = range;

    // Revenue from invoices
    const periodInvoices = invoices.filter((inv) => {
      try {
        const d = parseISO(inv.invoiceDate);
        return isWithinInterval(d, { start, end }) && inv.status !== 'Draft';
      } catch { return false; }
    });

    // Revenue by NDIS category
    const revenueByCategory: Record<string, number> = {};
    for (const inv of periodInvoices) {
      for (const item of inv.lineItems) {
        const cat = item.supportCategory || 'Uncategorised';
        revenueByCategory[cat] = (revenueByCategory[cat] || 0) + item.amount;
      }
    }

    const totalRevenue = Object.values(revenueByCategory).reduce((s, v) => s + v, 0);

    // Cost of services from completed shifts
    const periodShifts = shifts.filter((sh) => {
      try {
        const d = parseISO(sh.date);
        return isWithinInterval(d, { start, end }) && sh.status === 'Completed';
      } catch { return false; }
    });

    const directWages = periodShifts.reduce((s, sh) => s + sh.totalAmount, 0);
    // Estimate travel at 5% of service delivery
    const travelCosts = Math.round(directWages * 0.05 * 100) / 100;
    const superContributions = Math.round(directWages * 0.115 * 100) / 100;
    const totalCOS = directWages + travelCosts + superContributions;

    const grossProfit = totalRevenue - totalCOS;

    // Operating expenses from transactions
    const transactions = getTransactionsFromStorage();
    const expensesByAccount: Record<string, number> = {};
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      try {
        const d = parseISO(t.date);
        if (!isWithinInterval(d, { start, end })) continue;
      } catch { continue; }
      const name = t.accountName || t.accountCode;
      expensesByAccount[name] = (expensesByAccount[name] || 0) + t.credit;
    }
    const totalOpex = Object.values(expensesByAccount).reduce((s, v) => s + v, 0);

    const netBeforeTax = grossProfit - totalOpex;
    const taxEstimate = netBeforeTax > 0 ? Math.round(netBeforeTax * 0.25 * 100) / 100 : 0;
    const netAfterTax = netBeforeTax - taxEstimate;

    return {
      revenueByCategory,
      totalRevenue,
      directWages,
      travelCosts,
      superContributions,
      totalCOS,
      grossProfit,
      expensesByAccount,
      totalOpex,
      netBeforeTax,
      taxEstimate,
      netAfterTax,
    };
  }, [invoices, shifts]);

  const current = useMemo(() => calculatePnL(period), [period, calculatePnL]);
  const comparison = useMemo(() => compPeriod ? calculatePnL(compPeriod) : null, [compPeriod, calculatePnL]);

  const pctOf = (value: number, total: number) => total ? `${((value / total) * 100).toFixed(1)}%` : '0.0%';

  // Chart data
  const chartData = useMemo(() => {
    const items = [
      { name: 'Revenue', current: current.totalRevenue, previous: comparison?.totalRevenue || 0 },
      { name: 'Cost of Services', current: current.totalCOS, previous: comparison?.totalCOS || 0 },
      { name: 'Gross Profit', current: current.grossProfit, previous: comparison?.grossProfit || 0 },
      { name: 'Operating Exp.', current: current.totalOpex, previous: comparison?.totalOpex || 0 },
      { name: 'Net Profit', current: current.netAfterTax, previous: comparison?.netAfterTax || 0 },
    ];
    return comparison ? items : items.map(({ previous, ...rest }) => rest);
  }, [current, comparison]);

  const handlePrint = () => { window.print(); };

  const handleExport = () => {
    const lines: string[] = [
      `Profit & Loss Statement`,
      `Period: ${format(period.start, 'dd/MM/yyyy')} to ${format(period.end, 'dd/MM/yyyy')}`,
      `Thrive 4 Better Pty Ltd | ABN 15 694 748 297`,
      '',
      'REVENUE',
    ];
    for (const [cat, amt] of Object.entries(current.revenueByCategory)) {
      lines.push(`  ${cat},${amt.toFixed(2)}`);
    }
    lines.push(`Total Revenue,${current.totalRevenue.toFixed(2)}`);
    lines.push('', 'COST OF SERVICES');
    lines.push(`  Direct Wages,${current.directWages.toFixed(2)}`);
    lines.push(`  Travel Costs,${current.travelCosts.toFixed(2)}`);
    lines.push(`  Superannuation,${current.superContributions.toFixed(2)}`);
    lines.push(`Total Cost of Services,${current.totalCOS.toFixed(2)}`);
    lines.push('', `GROSS PROFIT,${current.grossProfit.toFixed(2)}`);
    lines.push('', 'OPERATING EXPENSES');
    for (const [name, amt] of Object.entries(current.expensesByAccount)) {
      lines.push(`  ${name},${amt.toFixed(2)}`);
    }
    lines.push(`Total Operating Expenses,${current.totalOpex.toFixed(2)}`);
    lines.push('', `NET PROFIT BEFORE TAX,${current.netBeforeTax.toFixed(2)}`);
    lines.push(`Tax Estimate (25%),${current.taxEstimate.toFixed(2)}`);
    lines.push(`NET PROFIT AFTER TAX,${current.netAfterTax.toFixed(2)}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `P&L_${format(period.start, 'yyyyMMdd')}_${format(period.end, 'yyyyMMdd')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('P&L exported');
  };

  const LineRow = ({ label, amount, compAmount, total, bold, indent, border }: {
    label: string; amount: number; compAmount?: number; total: number; bold?: boolean; indent?: boolean; border?: boolean;
  }) => (
    <div className={cn(
      'grid gap-4 px-6 py-2 items-center',
      comparison ? 'grid-cols-[1fr_120px_60px_120px_60px]' : 'grid-cols-[1fr_120px_60px]',
      bold && 'font-bold',
      indent && 'pl-10',
      border && 'border-t border-gray-300 pt-3 mt-1'
    )}>
      <span className={cn('text-sm', bold ? 'text-charcoal' : 'text-mid-gray')}>{label}</span>
      <span className={cn('text-sm text-right', amount < 0 ? 'text-red-600' : 'text-charcoal')}>{formatCurrency(amount)}</span>
      <span className="text-xs text-right text-mid-gray">{pctOf(Math.abs(amount), Math.abs(total))}</span>
      {comparison && compAmount !== undefined && (
        <>
          <span className={cn('text-sm text-right', compAmount < 0 ? 'text-red-600' : 'text-mid-gray')}>{formatCurrency(compAmount)}</span>
          <span className="text-xs text-right text-mid-gray">{pctOf(Math.abs(compAmount), Math.abs(comparison.totalRevenue))}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Profit & Loss</h1>
          <p className="text-sm text-mid-gray mt-1">Income statement for Thrive 4 Better Pty Ltd</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handlePrint} className="btn-ghost flex items-center gap-2">
            <Printer size={16} />
            Print
          </button>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2">
            <Download size={16} />
            Export PDF/CSV
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-2">
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
          </div>
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="input-field" />
              <span className="text-mid-gray">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="input-field" />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-mid-gray">Compare:</span>
            <select
              value={compareMode}
              onChange={(e) => setCompareMode(e.target.value as CompareMode)}
              className="input-field text-sm"
            >
              <option value="none">No comparison</option>
              <option value="last_month">vs Last Month</option>
              <option value="last_quarter">vs Last Quarter</option>
              <option value="last_year">vs Last Year</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-mid-gray mt-2">
          {format(period.start, 'dd MMM yyyy')} - {format(period.end, 'dd MMM yyyy')}
          {compPeriod && ` | Compared with: ${format(compPeriod.start, 'dd MMM yyyy')} - ${format(compPeriod.end, 'dd MMM yyyy')}`}
        </p>
      </div>

      {/* Chart */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-charcoal mb-4">Financial Overview</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} />
              <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              {comparison && <Legend />}
              <Bar dataKey="current" name="Current Period" fill="#2D5A3D" radius={[4, 4, 0, 0]} />
              {comparison && <Bar dataKey="previous" name="Comparison Period" fill="#7A9E7E" radius={[4, 4, 0, 0]} />}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* P&L Statement */}
      <div className="card overflow-hidden">
        {/* Column headers */}
        <div className={cn(
          'grid gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200',
          comparison ? 'grid-cols-[1fr_120px_60px_120px_60px]' : 'grid-cols-[1fr_120px_60px]'
        )}>
          <span className="text-xs font-semibold text-mid-gray uppercase">Account</span>
          <span className="text-xs font-semibold text-mid-gray uppercase text-right">Current</span>
          <span className="text-xs font-semibold text-mid-gray uppercase text-right">%</span>
          {comparison && (
            <>
              <span className="text-xs font-semibold text-mid-gray uppercase text-right">Previous</span>
              <span className="text-xs font-semibold text-mid-gray uppercase text-right">%</span>
            </>
          )}
        </div>

        {/* Revenue */}
        <button onClick={() => toggleSection('revenue')} className="w-full flex items-center gap-2 px-6 py-3 bg-green-50/50 hover:bg-green-50 border-b border-gray-100">
          {expandedSections.has('revenue') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="text-sm font-bold text-green-800">Revenue</span>
        </button>
        {expandedSections.has('revenue') && (
          <>
            {Object.entries(current.revenueByCategory).map(([cat, amt]) => (
              <LineRow
                key={cat}
                label={cat}
                amount={amt}
                compAmount={comparison?.revenueByCategory[cat] || 0}
                total={current.totalRevenue}
                indent
              />
            ))}
          </>
        )}
        <LineRow label="Total Revenue" amount={current.totalRevenue} compAmount={comparison?.totalRevenue} total={current.totalRevenue} bold border />

        {/* Cost of Services */}
        <button onClick={() => toggleSection('cos')} className="w-full flex items-center gap-2 px-6 py-3 bg-amber-50/50 hover:bg-amber-50 border-b border-gray-100 mt-2">
          {expandedSections.has('cos') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="text-sm font-bold text-amber-800">Cost of Services</span>
        </button>
        {expandedSections.has('cos') && (
          <>
            <LineRow label="Direct Support Worker Wages" amount={current.directWages} compAmount={comparison?.directWages} total={current.totalRevenue} indent />
            <LineRow label="Travel Costs" amount={current.travelCosts} compAmount={comparison?.travelCosts} total={current.totalRevenue} indent />
            <LineRow label="Superannuation (11.5%)" amount={current.superContributions} compAmount={comparison?.superContributions} total={current.totalRevenue} indent />
          </>
        )}
        <LineRow label="Total Cost of Services" amount={current.totalCOS} compAmount={comparison?.totalCOS} total={current.totalRevenue} bold border />

        {/* Gross Profit */}
        <div className="px-6 py-3 bg-forest/5 border-y border-forest/20">
          <div className={cn(
            'grid gap-4 items-center',
            comparison ? 'grid-cols-[1fr_120px_60px_120px_60px]' : 'grid-cols-[1fr_120px_60px]'
          )}>
            <span className="text-sm font-bold text-forest">GROSS PROFIT</span>
            <span className={cn('text-sm text-right font-bold', current.grossProfit >= 0 ? 'text-green-700' : 'text-red-600')}>{formatCurrency(current.grossProfit)}</span>
            <span className="text-xs text-right font-medium text-forest">{pctOf(current.grossProfit, current.totalRevenue)}</span>
            {comparison && (
              <>
                <span className={cn('text-sm text-right font-bold', (comparison.grossProfit) >= 0 ? 'text-green-700' : 'text-red-600')}>{formatCurrency(comparison.grossProfit)}</span>
                <span className="text-xs text-right text-mid-gray">{pctOf(comparison.grossProfit, comparison.totalRevenue)}</span>
              </>
            )}
          </div>
        </div>

        {/* Operating Expenses */}
        <button onClick={() => toggleSection('opex')} className="w-full flex items-center gap-2 px-6 py-3 bg-red-50/50 hover:bg-red-50 border-b border-gray-100 mt-2">
          {expandedSections.has('opex') ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="text-sm font-bold text-red-800">Operating Expenses</span>
        </button>
        {expandedSections.has('opex') && (
          <>
            {Object.entries(current.expensesByAccount).length === 0 ? (
              <div className="px-10 py-3 text-xs text-mid-gray italic">No operating expenses recorded for this period.</div>
            ) : (
              Object.entries(current.expensesByAccount).map(([name, amt]) => (
                <LineRow
                  key={name}
                  label={name}
                  amount={amt}
                  compAmount={comparison?.expensesByAccount[name] || 0}
                  total={current.totalRevenue}
                  indent
                />
              ))
            )}
          </>
        )}
        <LineRow label="Total Operating Expenses" amount={current.totalOpex} compAmount={comparison?.totalOpex} total={current.totalRevenue} bold border />

        {/* Net Profit */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-300">
          <LineRow label="NET PROFIT BEFORE TAX" amount={current.netBeforeTax} compAmount={comparison?.netBeforeTax} total={current.totalRevenue} bold />
        </div>
        <LineRow label="Income Tax Estimate (25% company rate)" amount={current.taxEstimate} compAmount={comparison?.taxEstimate} total={current.totalRevenue} indent />

        <div className="px-6 py-4 bg-forest/10 border-t-2 border-forest">
          <div className={cn(
            'grid gap-4 items-center',
            comparison ? 'grid-cols-[1fr_120px_60px_120px_60px]' : 'grid-cols-[1fr_120px_60px]'
          )}>
            <span className="text-base font-bold text-forest">NET PROFIT AFTER TAX</span>
            <span className={cn('text-base text-right font-bold', current.netAfterTax >= 0 ? 'text-green-700' : 'text-red-600')}>{formatCurrency(current.netAfterTax)}</span>
            <span className="text-xs text-right font-bold text-forest">{pctOf(current.netAfterTax, current.totalRevenue)}</span>
            {comparison && (
              <>
                <span className={cn('text-base text-right font-bold', comparison.netAfterTax >= 0 ? 'text-green-700' : 'text-red-600')}>{formatCurrency(comparison.netAfterTax)}</span>
                <span className="text-xs text-right text-mid-gray">{pctOf(comparison.netAfterTax, comparison.totalRevenue)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
