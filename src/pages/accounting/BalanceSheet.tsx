import { useState, useMemo } from 'react';
import {
  Scale, Download, Printer, Calendar, CheckCircle2, AlertTriangle,
} from 'lucide-react';
import { format, parseISO, isWithinInterval } from 'date-fns';
import toast from 'react-hot-toast';
import { cn, formatCurrency } from '@/lib/utils';
import { useStore } from '@/stores/useStore';

// ── Helpers ──

interface AccountBalance {
  code: string;
  name: string;
  balance: number;
}

function getChartOfAccounts(): { code: string; name: string; type: string; subType: string; balance: number; isArchived: boolean }[] {
  try {
    const saved = localStorage.getItem('t4b_chart_of_accounts');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

function getTransactions(): { date: string; debit: number; credit: number; accountCode: string; accountName: string }[] {
  try {
    const saved = localStorage.getItem('t4b_transactions');
    return saved ? JSON.parse(saved) : [];
  } catch { return []; }
}

// ── Component ──

export default function BalanceSheet() {
  const { invoices } = useStore();

  const [asAtDate, setAsAtDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const balanceData = useMemo(() => {
    const accounts = getChartOfAccounts().filter((a) => !a.isArchived);
    const transactions = getTransactions();
    const asAt = parseISO(asAtDate);

    // Calculate balances from chart of accounts + transactions up to asAtDate
    const balanceMap: Record<string, number> = {};
    for (const a of accounts) {
      balanceMap[a.code] = a.balance;
    }
    for (const t of transactions) {
      try {
        const d = parseISO(t.date);
        if (d <= asAt) {
          if (!balanceMap[t.accountCode]) balanceMap[t.accountCode] = 0;
          balanceMap[t.accountCode] += t.debit - t.credit;
        }
      } catch { /* skip */ }
    }

    const getAccountsByType = (type: string, subType?: string): AccountBalance[] => {
      return accounts
        .filter((a) => a.type === type && (!subType || a.subType === subType))
        .map((a) => ({ code: a.code, name: a.name, balance: balanceMap[a.code] || 0 }))
        .filter((a) => Math.abs(a.balance) > 0.001 || true); // show all
    };

    // Calculate accounts receivable from unpaid invoices
    const unpaidInvoiceTotal = invoices
      .filter((inv) => (inv.status === 'Sent' || inv.status === 'Overdue'))
      .reduce((s, inv) => s + inv.total, 0);

    // Calculate GST liability from invoices with GST
    const gstLiability = invoices
      .filter((inv) => inv.gstApplicable && inv.status !== 'Draft')
      .reduce((s, inv) => s + inv.gstAmount, 0);

    // Assets
    const currentAssets = getAccountsByType('Asset', 'Current Asset');
    // Override accounts receivable with live data
    const arIdx = currentAssets.findIndex((a) => a.code === '1-1100');
    if (arIdx >= 0) {
      currentAssets[arIdx].balance = unpaidInvoiceTotal;
    } else if (unpaidInvoiceTotal > 0) {
      currentAssets.push({ code: '1-1100', name: 'Accounts Receivable', balance: unpaidInvoiceTotal });
    }
    const fixedAssets = getAccountsByType('Asset', 'Fixed Asset');
    const totalCurrentAssets = currentAssets.reduce((s, a) => s + a.balance, 0);
    const totalFixedAssets = fixedAssets.reduce((s, a) => s + a.balance, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    // Liabilities
    const currentLiabilities = getAccountsByType('Liability', 'Current Liability');
    // Override GST payable with live data
    const gstIdx = currentLiabilities.findIndex((a) => a.code === '2-1010');
    if (gstIdx >= 0) {
      currentLiabilities[gstIdx].balance = gstLiability;
    } else if (gstLiability > 0) {
      currentLiabilities.push({ code: '2-1010', name: 'GST Payable', balance: gstLiability });
    }
    const longTermLiabilities = getAccountsByType('Liability', 'Long-term Liability');
    const totalCurrentLiabilities = currentLiabilities.reduce((s, a) => s + a.balance, 0);
    const totalLongTermLiabilities = longTermLiabilities.reduce((s, a) => s + a.balance, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    // Equity
    const equity = getAccountsByType('Equity');
    // Calculate current year P&L
    const currentYearPnL = (() => {
      const paidInvoiceRevenue = invoices
        .filter((inv) => inv.status === 'Paid')
        .reduce((s, inv) => s + inv.subtotal, 0);
      const expenses = transactions
        .filter((t) => {
          if (t.accountCode.startsWith('5-')) return true;
          return false;
        })
        .reduce((s, t) => s + t.credit, 0);
      return paidInvoiceRevenue - expenses;
    })();

    equity.push({ code: 'CYP', name: 'Current Year Profit/Loss', balance: currentYearPnL });

    const totalEquity = equity.reduce((s, a) => s + a.balance, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

    return {
      currentAssets, fixedAssets, totalCurrentAssets, totalFixedAssets, totalAssets,
      currentLiabilities, longTermLiabilities, totalCurrentLiabilities, totalLongTermLiabilities, totalLiabilities,
      equity, totalEquity, totalLiabilitiesAndEquity, isBalanced,
    };
  }, [asAtDate, invoices]);

  const handlePrint = () => { window.print(); };

  const handleExport = () => {
    const lines: string[] = [
      'Balance Sheet',
      `As at ${format(parseISO(asAtDate), 'dd/MM/yyyy')}`,
      'Thrive 4 Better Pty Ltd | ABN 15 694 748 297',
      '',
      'ASSETS',
      'Current Assets',
    ];
    for (const a of balanceData.currentAssets) lines.push(`  ${a.name},${a.balance.toFixed(2)}`);
    lines.push(`Total Current Assets,${balanceData.totalCurrentAssets.toFixed(2)}`);
    lines.push('', 'Fixed Assets');
    for (const a of balanceData.fixedAssets) lines.push(`  ${a.name},${a.balance.toFixed(2)}`);
    lines.push(`Total Fixed Assets,${balanceData.totalFixedAssets.toFixed(2)}`);
    lines.push(`TOTAL ASSETS,${balanceData.totalAssets.toFixed(2)}`);
    lines.push('', 'LIABILITIES', 'Current Liabilities');
    for (const a of balanceData.currentLiabilities) lines.push(`  ${a.name},${a.balance.toFixed(2)}`);
    lines.push(`Total Current Liabilities,${balanceData.totalCurrentLiabilities.toFixed(2)}`);
    lines.push('', 'Long-term Liabilities');
    for (const a of balanceData.longTermLiabilities) lines.push(`  ${a.name},${a.balance.toFixed(2)}`);
    lines.push(`Total Long-term Liabilities,${balanceData.totalLongTermLiabilities.toFixed(2)}`);
    lines.push(`TOTAL LIABILITIES,${balanceData.totalLiabilities.toFixed(2)}`);
    lines.push('', 'EQUITY');
    for (const a of balanceData.equity) lines.push(`  ${a.name},${a.balance.toFixed(2)}`);
    lines.push(`TOTAL EQUITY,${balanceData.totalEquity.toFixed(2)}`);
    lines.push('', `TOTAL LIABILITIES + EQUITY,${balanceData.totalLiabilitiesAndEquity.toFixed(2)}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BalanceSheet_${asAtDate}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Balance Sheet exported');
  };

  const Section = ({ title, items, total, totalLabel, bgColor }: {
    title: string; items: AccountBalance[]; total: number; totalLabel: string; bgColor: string;
  }) => (
    <div className="mb-4">
      <div className={cn('px-6 py-2 rounded-lg mb-1', bgColor)}>
        <h4 className="text-xs font-bold text-charcoal uppercase tracking-wide">{title}</h4>
      </div>
      {items.map((a) => (
        <div key={a.code} className="flex items-center justify-between px-6 py-1.5 hover:bg-cream/30">
          <div className="flex items-center gap-2">
            <span className="text-xs text-mid-gray font-mono w-14">{a.code}</span>
            <span className="text-sm text-charcoal">{a.name}</span>
          </div>
          <span className={cn('text-sm font-medium', a.balance < 0 ? 'text-red-600' : 'text-charcoal')}>
            {formatCurrency(a.balance)}
          </span>
        </div>
      ))}
      <div className="flex items-center justify-between px-6 py-2 border-t border-gray-200 mt-1">
        <span className="text-sm font-bold text-charcoal">{totalLabel}</span>
        <span className="text-sm font-bold text-charcoal">{formatCurrency(total)}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Balance Sheet</h1>
          <p className="text-sm text-mid-gray mt-1">Statement of financial position</p>
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

      {/* Date selector */}
      <div className="card p-4 flex items-center gap-4">
        <Calendar size={16} className="text-mid-gray" />
        <span className="text-sm font-medium text-charcoal">As at:</span>
        <input type="date" value={asAtDate} onChange={(e) => setAsAtDate(e.target.value)} className="input-field" />
        <div className="ml-auto text-xs text-mid-gray">
          Thrive 4 Better Pty Ltd | ABN 15 694 748 297
        </div>
      </div>

      {/* Balance check */}
      {balanceData.isBalanced ? (
        <div className="card p-4 bg-green-50 border-green-200 flex items-center gap-3">
          <CheckCircle2 size={20} className="text-green-700" />
          <p className="text-sm text-green-800 font-medium">
            Balance sheet is balanced. Total Assets ({formatCurrency(balanceData.totalAssets)}) = Total Liabilities + Equity ({formatCurrency(balanceData.totalLiabilitiesAndEquity)})
          </p>
        </div>
      ) : (
        <div className="card p-4 bg-red-50 border-red-200 flex items-center gap-3">
          <AlertTriangle size={20} className="text-red-600" />
          <p className="text-sm text-red-800 font-medium">
            Balance sheet is out of balance by {formatCurrency(Math.abs(balanceData.totalAssets - balanceData.totalLiabilitiesAndEquity))}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Assets */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-charcoal mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            Assets
          </h2>

          <Section title="Current Assets" items={balanceData.currentAssets} total={balanceData.totalCurrentAssets} totalLabel="Total Current Assets" bgColor="bg-blue-50" />
          <Section title="Fixed Assets" items={balanceData.fixedAssets} total={balanceData.totalFixedAssets} totalLabel="Total Fixed Assets" bgColor="bg-blue-50" />

          <div className="flex items-center justify-between px-6 py-3 bg-blue-100 rounded-lg mt-4">
            <span className="text-base font-bold text-blue-900">TOTAL ASSETS</span>
            <span className="text-base font-bold text-blue-900">{formatCurrency(balanceData.totalAssets)}</span>
          </div>
        </div>

        {/* Right: Liabilities + Equity */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-charcoal mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            Liabilities & Equity
          </h2>

          <Section title="Current Liabilities" items={balanceData.currentLiabilities} total={balanceData.totalCurrentLiabilities} totalLabel="Total Current Liabilities" bgColor="bg-red-50" />
          <Section title="Long-term Liabilities" items={balanceData.longTermLiabilities} total={balanceData.totalLongTermLiabilities} totalLabel="Total Long-term Liabilities" bgColor="bg-red-50" />

          <div className="flex items-center justify-between px-6 py-2 border-t-2 border-gray-300 mt-2 mb-4">
            <span className="text-sm font-bold text-charcoal">TOTAL LIABILITIES</span>
            <span className="text-sm font-bold text-red-700">{formatCurrency(balanceData.totalLiabilities)}</span>
          </div>

          <Section title="Equity" items={balanceData.equity} total={balanceData.totalEquity} totalLabel="Total Equity" bgColor="bg-purple-50" />

          <div className="flex items-center justify-between px-6 py-3 bg-purple-100 rounded-lg mt-4">
            <span className="text-base font-bold text-purple-900">TOTAL LIABILITIES + EQUITY</span>
            <span className="text-base font-bold text-purple-900">{formatCurrency(balanceData.totalLiabilitiesAndEquity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
