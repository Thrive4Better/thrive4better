import { useState, useEffect, useMemo } from 'react';
import {
  FileText, Download, CheckCircle2, Calendar, DollarSign, AlertCircle,
  Building2, Clock, ChevronDown, ChevronUp, Info, HelpCircle,
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import toast from 'react-hot-toast';
import EmptyState from '@/components/ui/EmptyState';
import { cn, formatCurrency, generateId } from '@/lib/utils';
import { useStore } from '@/stores/useStore';
import {
  loadAccountingCategories,
  type AccountingCategory,
} from '@/data/accountingCategories';

// ── Types ──

interface BASQuarter {
  label: string;
  startMonth: number; // 0-indexed
  endMonth: number;
  year: number;
  key: string;
}

interface BASData {
  // GST Section - Sales (G1-G9)
  g1TotalSales: number;
  g2ExportSales: number;
  g3OtherGSTFreeSales: number;
  g4InputTaxedSales: number;
  g5TotalGSTFreeSales: number; // G2+G3+G4
  g6TotalSalesSubjectToGST: number; // G1-G5
  g7Adjustments: number;
  g8TotalSalesAfterAdj: number; // G6+G7
  g9GSTOnSales: number; // G8 / 11

  // GST Section - Purchases (G10-G20)
  g10CapitalPurchases: number;
  g11NonCapitalPurchases: number;
  g12TotalPurchases: number; // G10+G11
  g13InputTaxedPurchases: number;
  g14PurchasesWithoutGST: number;
  g15PrivateUsePurchases: number;
  g16TotalNonCreditable: number; // G13+G14+G15
  g17PurchasesSubjectToGST: number; // G12-G16
  g18PurchaseAdjustments: number;
  g19TotalPurchasesAfterAdj: number; // G17+G18
  g20GSTOnPurchases: number; // G19 / 11

  // Summary labels (1A/1B)
  label1A: number; // GST on sales (from G9)
  label1B: number; // GST on purchases (from G20)

  // PAYG Withholding
  w1TotalWagesPaid: number;
  w2AmountWithheld: number;

  // PAYG Instalment
  t1InstalmentIncome: number;
  t2InstalmentRate: number; // percentage
  label5A: number; // PAYG instalment amount

  // Deferred instalment
  label7DeferredInstalment: number;

  // Totals
  label8A: number; // Total amount owing
  label8B: number; // Refund amount
  label9: number; // Net payment/refund

  // NDIS-specific breakdown
  ndisGSTFreeIncome: number;
  ndisGSTApplicableIncome: number;
  totalSuperGuarantee: number;

  // Revenue breakdown
  revenueBreakdown: { category: string; amount: number; gst: number; gstFree: boolean }[];
}

interface BASLodgement {
  id: string;
  quarterKey: string;
  quarterLabel: string;
  label1A: number;
  label1B: number;
  gstPayable: number;
  w2AmountWithheld: number;
  label5A: number;
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

function getTransactionsFromStorage(): { date: string; debit: number; credit: number; type: string; accountCode: string; description?: string; categoryId?: string; taxType?: string }[] {
  try {
    const saved = localStorage.getItem('t4b_transactions');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

// Super guarantee rate for 2025-26
const SUPER_RATE = 0.115;
// Default PAYG instalment rate for small business
const DEFAULT_PAYG_INSTALMENT_RATE = 0.02;

// NDIS GST-free support categories (most NDIS supports are GST-free)
const GST_FREE_CATEGORIES = [
  'Daily Living',
  'Community Access',
  'SIL',
  'Social/Rec',
  'Core Supports',
  'Capacity Building',
  'Capital Supports',
  'Assistance with Daily Life',
  'Transport',
  'Improved Living Arrangements',
  'Finding and Keeping a Job',
  'Improved Relationships',
  'Improved Health and Wellbeing',
  'Improved Learning',
  'Improved Life Choices',
  'Improved Daily Living',
];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Tooltip Component ──

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex ml-1">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={() => setShow(!show)}
        className="text-mid-gray hover:text-forest transition-colors"
      >
        <HelpCircle size={14} />
      </button>
      {show && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 px-3 py-2 text-xs text-white bg-charcoal rounded-lg shadow-lg">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-charcoal" />
        </span>
      )}
    </span>
  );
}

// ── BAS Row Component ──

function BASRow({
  label,
  sublabel,
  value,
  bold,
  highlight,
  tooltip,
  indent,
  editable,
  onEdit,
}: {
  label: string;
  sublabel?: string;
  value: number;
  bold?: boolean;
  highlight?: 'green' | 'red' | 'amber' | 'blue';
  tooltip?: string;
  indent?: boolean;
  editable?: boolean;
  onEdit?: (val: number) => void;
}) {
  const bgClass = highlight === 'green' ? 'bg-green-50' :
    highlight === 'red' ? 'bg-red-50' :
    highlight === 'amber' ? 'bg-amber-50' :
    highlight === 'blue' ? 'bg-blue-50' : '';

  return (
    <div className={cn(
      'flex items-center justify-between py-2.5 px-4 border-b border-gray-100 last:border-b-0',
      bgClass,
      indent && 'pl-8',
    )}>
      <div className="flex items-center gap-1 min-w-0">
        <span className={cn('text-sm text-charcoal', bold && 'font-semibold')}>
          {label}
        </span>
        {tooltip && <Tooltip text={tooltip} />}
        {sublabel && <span className="text-xs text-mid-gray ml-2">({sublabel})</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {editable && onEdit ? (
          <input
            type="number"
            value={value}
            onChange={(e) => onEdit(parseFloat(e.target.value) || 0)}
            className="w-32 text-right text-sm font-mono bg-white border border-gray-200 rounded-lg px-2 py-1 focus:border-forest focus:ring-1 focus:ring-forest/20"
            step="0.01"
          />
        ) : (
          <span className={cn(
            'text-sm font-mono tabular-nums',
            bold ? 'font-bold text-charcoal' : 'text-charcoal',
            value < 0 && 'text-red-600',
          )}>
            {formatCurrency(Math.abs(value))}
            {value < 0 && ' CR'}
          </span>
        )}
      </div>
    </div>
  );
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
  const [showGSTDetail, setShowGSTDetail] = useState(true);
  const [showPAYGDetail, setShowPAYGDetail] = useState(true);

  // Manual adjustments
  const [g7Adj, setG7Adj] = useState(0);
  const [g18Adj, setG18Adj] = useState(0);
  const [g15Private, setG15Private] = useState(0);
  const [deferredInstalment, setDeferredInstalment] = useState(0);

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

  // Calculate BAS figures - full ATO-compliant calculation
  const basData = useMemo<BASData>(() => {
    const empty: BASData = {
      g1TotalSales: 0, g2ExportSales: 0, g3OtherGSTFreeSales: 0, g4InputTaxedSales: 0,
      g5TotalGSTFreeSales: 0, g6TotalSalesSubjectToGST: 0, g7Adjustments: 0,
      g8TotalSalesAfterAdj: 0, g9GSTOnSales: 0,
      g10CapitalPurchases: 0, g11NonCapitalPurchases: 0, g12TotalPurchases: 0,
      g13InputTaxedPurchases: 0, g14PurchasesWithoutGST: 0, g15PrivateUsePurchases: 0,
      g16TotalNonCreditable: 0, g17PurchasesSubjectToGST: 0, g18PurchaseAdjustments: 0,
      g19TotalPurchasesAfterAdj: 0, g20GSTOnPurchases: 0,
      label1A: 0, label1B: 0,
      w1TotalWagesPaid: 0, w2AmountWithheld: 0,
      t1InstalmentIncome: 0, t2InstalmentRate: DEFAULT_PAYG_INSTALMENT_RATE, label5A: 0,
      label7DeferredInstalment: 0, label8A: 0, label8B: 0, label9: 0,
      ndisGSTFreeIncome: 0, ndisGSTApplicableIncome: 0, totalSuperGuarantee: 0,
      revenueBreakdown: [],
    };

    if (!selectedQuarter) return empty;

    const qStart = new Date(selectedQuarter.year, selectedQuarter.startMonth, 1);
    const qEnd = endOfMonth(new Date(selectedQuarter.year, selectedQuarter.endMonth, 1));

    // ── SALES / REVENUE ──

    const quarterInvoices = invoices.filter((inv) => {
      try {
        const d = parseISO(inv.invoiceDate);
        return isWithinInterval(d, { start: qStart, end: qEnd });
      } catch { return false; }
    });

    // Categorize revenue using accounting category tax types
    const acctCategories = loadAccountingCategories();
    const acctCatMap = new Map(acctCategories.map((c) => [c.id, c]));

    let gstApplicableRevenue = 0;
    let gstFreeRevenue = 0;
    let gstCollected = 0;
    const categoryMap: Record<string, { amount: number; gst: number; gstFree: boolean }> = {};

    for (const inv of quarterInvoices) {
      for (const item of inv.lineItems) {
        const cat = item.supportCategory || 'Uncategorised';

        // Determine GST status: prefer accounting category tax type, fall back to support category heuristic
        let isGSTFree = false;
        const acctCat = (item as { accountingCategoryId?: string }).accountingCategoryId
          ? acctCatMap.get((item as { accountingCategoryId?: string }).accountingCategoryId!)
          : undefined;

        if (acctCat) {
          // Use accounting category's tax type for classification
          isGSTFree = acctCat.taxType === 'GST Free' || acctCat.taxType === 'BAS Excluded';
        } else {
          // Fallback: use support category heuristic
          isGSTFree = GST_FREE_CATEGORIES.some(
            (c) => cat.toLowerCase().includes(c.toLowerCase())
          );
        }

        if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, gst: 0, gstFree: isGSTFree };

        if (isGSTFree) {
          gstFreeRevenue += item.amount;
          categoryMap[cat].amount += item.amount;
        } else {
          // GST-applicable: the amount includes GST
          if (inv.gstApplicable) {
            gstApplicableRevenue += item.amount;
            categoryMap[cat].amount += item.amount;
          } else {
            gstFreeRevenue += item.amount;
            categoryMap[cat].amount += item.amount;
          }
        }
      }

      if (inv.gstApplicable) {
        gstCollected += inv.gstAmount;
        const cat = inv.lineItems[0]?.supportCategory || 'Uncategorised';
        if (!categoryMap[cat]) categoryMap[cat] = { amount: 0, gst: 0, gstFree: false };
        categoryMap[cat].gst += inv.gstAmount;
      }
    }

    const revenueBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
      category,
      amount: data.amount,
      gst: data.gst,
      gstFree: data.gstFree,
    }));

    // G1: Total sales including GST
    const g1 = round2(gstApplicableRevenue + gstCollected + gstFreeRevenue);

    // G2: Export sales (typically 0 for NDIS providers)
    const g2 = 0;

    // G3: Other GST-free sales (NDIS income is generally GST-free)
    const g3 = round2(gstFreeRevenue);

    // G4: Input taxed sales (some NDIS services may be input-taxed)
    const g4 = 0;

    // G5: G2 + G3 + G4
    const g5 = round2(g2 + g3 + g4);

    // G6: Total sales subject to GST (G1 - G5)
    const g6 = round2(g1 - g5);

    // G7: Adjustments (manual)
    const g7 = g7Adj;

    // G8: Total sales subject to GST after adjustments (G6 + G7)
    const g8 = round2(g6 + g7);

    // G9: GST on sales (G8 / 11)
    const g9 = round2(g8 / 11);

    // ── PURCHASES / EXPENSES ──

    const transactions = getTransactionsFromStorage();
    const expenseTransactions = transactions.filter((t) => {
      if (t.type !== 'expense') return false;
      try {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: qStart, end: qEnd });
      } catch { return false; }
    });

    // Categorize purchases using tax types from accounting categories
    let capitalPurchases = 0;
    let nonCapitalPurchases = 0;
    let purchasesWithoutGST = 0;
    let inputTaxedPurchases = 0;

    for (const t of expenseTransactions) {
      const amount = t.credit || t.debit || 0;
      const code = (t.accountCode || '').toString();
      const desc = (t.description || '').toLowerCase();

      // Use tax type from transaction (set via accounting category) if available
      const txnTaxType = t.taxType || '';
      const txnCat = t.categoryId ? acctCatMap.get(t.categoryId) : undefined;
      const effectiveTaxType = txnTaxType || txnCat?.taxType || '';

      if (effectiveTaxType) {
        // Classify using the accounting category tax type
        if (effectiveTaxType === 'BAS Excluded') {
          purchasesWithoutGST += amount;
        } else if (effectiveTaxType === 'GST Free') {
          purchasesWithoutGST += amount;
        } else if (effectiveTaxType === 'GST on Expenses') {
          // Check if it's a capital purchase
          if (code.startsWith('1') && (desc.includes('equipment') || desc.includes('vehicle') || desc.includes('furniture') || desc.includes('computer') || desc.includes('asset'))) {
            capitalPurchases += amount;
          } else {
            nonCapitalPurchases += amount;
          }
        } else {
          nonCapitalPurchases += amount;
        }
      } else {
        // Fallback: original heuristic logic
        // Capital purchases (asset accounts typically start with 1)
        if (code.startsWith('1') && (desc.includes('equipment') || desc.includes('vehicle') || desc.includes('furniture') || desc.includes('computer') || desc.includes('asset'))) {
          capitalPurchases += amount;
        }
        // Wages/salary - no GST
        else if (code.startsWith('6') && (desc.includes('wage') || desc.includes('salary') || desc.includes('super'))) {
          purchasesWithoutGST += amount;
        }
        // Insurance, bank fees - typically no GST or input taxed
        else if (desc.includes('insurance') || desc.includes('bank fee') || desc.includes('interest')) {
          inputTaxedPurchases += amount;
        }
        // All other expenses - non-capital purchases
        else {
          nonCapitalPurchases += amount;
        }
      }
    }

    // G10: Capital purchases (including GST)
    const g10 = round2(capitalPurchases);

    // G11: Non-capital purchases (including GST)
    const g11 = round2(nonCapitalPurchases);

    // G12: G10 + G11
    const g12 = round2(g10 + g11);

    // G13: Purchases for making input taxed sales
    const g13 = round2(inputTaxedPurchases);

    // G14: Purchases without GST in the price
    const g14 = round2(purchasesWithoutGST);

    // G15: Estimated purchases for private use (manual)
    const g15 = g15Private;

    // G16: G13 + G14 + G15
    const g16 = round2(g13 + g14 + g15);

    // G17: Total purchases subject to GST (G12 - G16)
    const g17 = round2(g12 - g16);

    // G18: Adjustments (manual)
    const g18 = g18Adj;

    // G19: Total purchases subject to GST after adjustments (G17 + G18)
    const g19 = round2(g17 + g18);

    // G20: GST on purchases (G19 / 11)
    const g20 = round2(g19 / 11);

    // 1A: GST on sales (from G9)
    const label1A = g9;

    // 1B: GST on purchases (from G20)
    const label1B = g20;

    // ── PAYG WITHHOLDING ──

    const wageShifts = shifts.filter((sh) => {
      if (sh.status !== 'Completed') return false;
      try {
        const d = parseISO(sh.date);
        return isWithinInterval(d, { start: qStart, end: qEnd });
      } catch { return false; }
    });

    // W1: Total salary/wages paid
    const w1 = round2(wageShifts.reduce((s, sh) => s + sh.totalAmount, 0));

    // W2: Amount withheld (estimated at average marginal rate ~20% for support workers)
    const w2 = round2(w1 * 0.20);

    // Super guarantee
    const totalSuper = round2(w1 * SUPER_RATE);

    // ── PAYG INSTALMENT ──

    // T1: Instalment income (total business revenue for the quarter)
    const t1 = round2(g1);

    // T2: Instalment rate
    const t2 = DEFAULT_PAYG_INSTALMENT_RATE;

    // 5A: PAYG instalment
    const label5A = round2(t1 * t2);

    // 7: Deferred company/fund instalment
    const label7 = deferredInstalment;

    // ── TOTALS ──

    // Net GST
    const netGST = round2(label1A - label1B);

    // Total amount = GST payable + PAYG withholding + PAYG instalment - deferred
    const totalOwing = round2(netGST + w2 + label5A - label7);

    // 8A / 8B
    const label8A = totalOwing >= 0 ? totalOwing : 0;
    const label8B = totalOwing < 0 ? Math.abs(totalOwing) : 0;

    // 9: Net payment/refund
    const label9 = totalOwing;

    return {
      g1TotalSales: g1, g2ExportSales: g2, g3OtherGSTFreeSales: g3, g4InputTaxedSales: g4,
      g5TotalGSTFreeSales: g5, g6TotalSalesSubjectToGST: g6, g7Adjustments: g7,
      g8TotalSalesAfterAdj: g8, g9GSTOnSales: g9,
      g10CapitalPurchases: g10, g11NonCapitalPurchases: g11, g12TotalPurchases: g12,
      g13InputTaxedPurchases: g13, g14PurchasesWithoutGST: g14, g15PrivateUsePurchases: g15,
      g16TotalNonCreditable: g16, g17PurchasesSubjectToGST: g17, g18PurchaseAdjustments: g18,
      g19TotalPurchasesAfterAdj: g19, g20GSTOnPurchases: g20,
      label1A, label1B,
      w1TotalWagesPaid: w1, w2AmountWithheld: w2,
      t1InstalmentIncome: t1, t2InstalmentRate: t2, label5A,
      label7DeferredInstalment: label7, label8A, label8B, label9,
      ndisGSTFreeIncome: gstFreeRevenue, ndisGSTApplicableIncome: gstApplicableRevenue,
      totalSuperGuarantee: totalSuper,
      revenueBreakdown,
    };
  }, [selectedQuarter, invoices, shifts, g7Adj, g18Adj, g15Private, deferredInstalment]);

  const existingLodgement = lodgements.find((l) => l.quarterKey === selectedQuarterKey);

  const handleLodge = () => {
    const gstPayable = round2(basData.label1A - basData.label1B);
    if (existingLodgement) {
      setLodgements((prev) =>
        prev.map((l) => l.quarterKey === selectedQuarterKey
          ? {
              ...l,
              status: 'lodged',
              lodgedDate: format(new Date(), 'yyyy-MM-dd'),
              label1A: basData.label1A,
              label1B: basData.label1B,
              gstPayable,
              w2AmountWithheld: basData.w2AmountWithheld,
              label5A: basData.label5A,
              totalAmount: basData.label9,
            }
          : l
        )
      );
    } else {
      const lodgement: BASLodgement = {
        id: generateId(),
        quarterKey: selectedQuarterKey,
        quarterLabel: selectedQuarter?.label || '',
        label1A: basData.label1A,
        label1B: basData.label1B,
        gstPayable,
        w2AmountWithheld: basData.w2AmountWithheld,
        label5A: basData.label5A,
        totalAmount: basData.label9,
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
    const headers = ['ATO Label', 'Description', 'Amount'];
    const rows = [
      // GST Section - Sales
      ['G1', 'Total sales (including GST)', basData.g1TotalSales.toFixed(2)],
      ['G2', 'Export sales', basData.g2ExportSales.toFixed(2)],
      ['G3', 'Other GST-free sales', basData.g3OtherGSTFreeSales.toFixed(2)],
      ['G4', 'Input taxed sales', basData.g4InputTaxedSales.toFixed(2)],
      ['G5', 'G2+G3+G4', basData.g5TotalGSTFreeSales.toFixed(2)],
      ['G6', 'Total sales subject to GST (G1-G5)', basData.g6TotalSalesSubjectToGST.toFixed(2)],
      ['G7', 'Adjustments', basData.g7Adjustments.toFixed(2)],
      ['G8', 'Total sales subject to GST after adjustments (G6+G7)', basData.g8TotalSalesAfterAdj.toFixed(2)],
      ['G9', 'GST on sales (G8 divided by 11)', basData.g9GSTOnSales.toFixed(2)],
      // GST Section - Purchases
      ['G10', 'Capital purchases (including GST)', basData.g10CapitalPurchases.toFixed(2)],
      ['G11', 'Non-capital purchases (including GST)', basData.g11NonCapitalPurchases.toFixed(2)],
      ['G12', 'G10+G11', basData.g12TotalPurchases.toFixed(2)],
      ['G13', 'Purchases for making input taxed sales', basData.g13InputTaxedPurchases.toFixed(2)],
      ['G14', 'Purchases without GST in the price', basData.g14PurchasesWithoutGST.toFixed(2)],
      ['G15', 'Estimated purchases for private use or not deductible', basData.g15PrivateUsePurchases.toFixed(2)],
      ['G16', 'G13+G14+G15', basData.g16TotalNonCreditable.toFixed(2)],
      ['G17', 'Total purchases subject to GST (G12-G16)', basData.g17PurchasesSubjectToGST.toFixed(2)],
      ['G18', 'Adjustments', basData.g18PurchaseAdjustments.toFixed(2)],
      ['G19', 'Total purchases subject to GST after adjustments (G17+G18)', basData.g19TotalPurchasesAfterAdj.toFixed(2)],
      ['G20', 'GST on purchases (G19 divided by 11)', basData.g20GSTOnPurchases.toFixed(2)],
      // Summary
      ['1A', 'GST on sales', basData.label1A.toFixed(2)],
      ['1B', 'GST on purchases', basData.label1B.toFixed(2)],
      // PAYG Withholding
      ['W1', 'Total salary wages and other payments', basData.w1TotalWagesPaid.toFixed(2)],
      ['W2', 'Amount withheld from payments in W1', basData.w2AmountWithheld.toFixed(2)],
      // PAYG Instalment
      ['T1', 'Instalment income', basData.t1InstalmentIncome.toFixed(2)],
      ['T2', 'Instalment rate (%)', (basData.t2InstalmentRate * 100).toFixed(2)],
      ['5A', 'PAYG instalment', basData.label5A.toFixed(2)],
      ['7', 'Deferred company/fund instalment', basData.label7DeferredInstalment.toFixed(2)],
      // Totals
      ['8A', 'Total amount owing', basData.label8A.toFixed(2)],
      ['8B', 'Refund amount', basData.label8B.toFixed(2)],
      ['9', 'ATO payment/refund', basData.label9.toFixed(2)],
      // NDIS-specific
      ['', 'NDIS GST-free income', basData.ndisGSTFreeIncome.toFixed(2)],
      ['', 'NDIS GST-applicable income', basData.ndisGSTApplicableIncome.toFixed(2)],
      ['', 'Super guarantee liability (11.5%)', basData.totalSuperGuarantee.toFixed(2)],
    ];
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `BAS_${selectedQuarterKey}_ATO_Compliant.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('ATO-compliant BAS exported to CSV');
  };

  const gstPayable = round2(basData.label1A - basData.label1B);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">BAS Preparation</h1>
          <p className="text-sm text-mid-gray mt-1">Business Activity Statement - ATO Compliant GST, PAYG Withholding & PAYG Instalment</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={exportCsv} className="btn-ghost flex items-center gap-2">
            <Download size={16} />
            Export ATO CSV
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

      {/* NDIS Provider Note */}
      <div className="card p-4 bg-blue-50 border border-blue-200 flex items-start gap-3">
        <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">NDIS Provider GST Information</p>
          <p className="text-xs text-blue-700 mt-1">
            Most NDIS supports are GST-free under Division 38 of the GST Act. This includes personal care, community participation,
            and capacity building supports. Some services like plan management fees may attract GST. Income has been automatically
            categorised based on support categories. Review the GST-free classification in the breakdown below.
          </p>
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
          {/* ── GST Summary Cards ── */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 bg-green-50 border border-green-200">
              <p className="text-xs font-medium text-green-700 uppercase tracking-wide">1A - GST on Sales</p>
              <p className="text-2xl font-bold text-green-800 mt-2">{formatCurrency(basData.label1A)}</p>
              <p className="text-xs text-green-600 mt-1">From G9 calculation</p>
            </div>
            <div className="card p-4 bg-red-50 border border-red-200">
              <p className="text-xs font-medium text-red-700 uppercase tracking-wide">1B - GST on Purchases</p>
              <p className="text-2xl font-bold text-red-800 mt-2">{formatCurrency(basData.label1B)}</p>
              <p className="text-xs text-red-600 mt-1">From G20 calculation</p>
            </div>
            <div className={cn('card p-4 border', gstPayable >= 0 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200')}>
              <p className={cn('text-xs font-medium uppercase tracking-wide', gstPayable >= 0 ? 'text-amber-700' : 'text-blue-700')}>
                {gstPayable >= 0 ? 'Net GST Payable' : 'Net GST Refundable'}
              </p>
              <p className={cn('text-2xl font-bold mt-2', gstPayable >= 0 ? 'text-amber-800' : 'text-blue-800')}>
                {formatCurrency(Math.abs(gstPayable))}
              </p>
              <p className={cn('text-xs mt-1', gstPayable >= 0 ? 'text-amber-600' : 'text-blue-600')}>
                1A minus 1B
              </p>
            </div>
          </div>

          {/* ── GST Detailed Section (G1-G20) ── */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowGSTDetail(!showGSTDetail)}
              className="w-full px-6 py-4 bg-forest/5 border-b border-forest/10 flex items-center justify-between"
            >
              <div>
                <h2 className="text-lg font-bold text-charcoal text-left">GST Calculation Worksheet (G1-G20)</h2>
                <p className="text-xs text-mid-gray text-left">ATO Business Activity Statement - GST section</p>
              </div>
              {showGSTDetail ? <ChevronUp size={20} className="text-mid-gray" /> : <ChevronDown size={20} className="text-mid-gray" />}
            </button>

            {showGSTDetail && (
              <div className="divide-y divide-gray-100">
                {/* Sales section */}
                <div className="px-6 py-3 bg-forest/5">
                  <h3 className="text-sm font-semibold text-forest uppercase tracking-wide">Sales and Income</h3>
                </div>

                <BASRow label="G1" sublabel="Total sales including any GST" value={basData.g1TotalSales} bold
                  tooltip="Total of all sales for the period including GST. For NDIS providers this includes both GST-free and GST-applicable income." />
                <BASRow label="G2" sublabel="Export sales" value={basData.g2ExportSales} indent
                  tooltip="Sales that are GST-free because they are exports. Usually $0 for NDIS providers." />
                <BASRow label="G3" sublabel="Other GST-free sales" value={basData.g3OtherGSTFreeSales} indent
                  tooltip="GST-free sales other than exports. For NDIS providers, most support services are GST-free under Division 38." />
                <BASRow label="G4" sublabel="Input taxed sales" value={basData.g4InputTaxedSales} indent
                  tooltip="Sales that are input taxed (e.g., financial supplies, residential rent)." />
                <BASRow label="G5" sublabel="G2 + G3 + G4" value={basData.g5TotalGSTFreeSales} bold highlight="blue"
                  tooltip="Total of all sales that are not subject to GST." />
                <BASRow label="G6" sublabel="Total sales subject to GST (G1 minus G5)" value={basData.g6TotalSalesSubjectToGST} bold
                  tooltip="Your taxable sales - the amount of sales on which GST applies." />
                <BASRow label="G7" sublabel="Adjustments" value={basData.g7Adjustments} editable onEdit={setG7Adj}
                  tooltip="Adjustments for bad debts recovered, changes of use, or other GST adjustments on sales." />
                <BASRow label="G8" sublabel="Total sales subject to GST after adjustments (G6 + G7)" value={basData.g8TotalSalesAfterAdj} bold highlight="amber"
                  tooltip="Final taxable sales amount used to calculate GST on sales." />
                <BASRow label="G9" sublabel="GST on sales (G8 / 11)" value={basData.g9GSTOnSales} bold highlight="green"
                  tooltip="The GST component of your taxable sales. This is your GST on sales (same as 1A)." />

                {/* Purchases section */}
                <div className="px-6 py-3 bg-red-50/50">
                  <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide">Purchases and Expenses</h3>
                </div>

                <BASRow label="G10" sublabel="Capital purchases including any GST" value={basData.g10CapitalPurchases}
                  tooltip="Purchases of capital items (equipment, vehicles, etc.) including GST." />
                <BASRow label="G11" sublabel="Non-capital purchases including any GST" value={basData.g11NonCapitalPurchases}
                  tooltip="All other business purchases and expenses (not capital) including GST." />
                <BASRow label="G12" sublabel="G10 + G11" value={basData.g12TotalPurchases} bold
                  tooltip="Total of all purchases for the period." />
                <BASRow label="G13" sublabel="Purchases for making input taxed sales" value={basData.g13InputTaxedPurchases} indent
                  tooltip="Purchases related to making input taxed sales. You cannot claim GST credits on these." />
                <BASRow label="G14" sublabel="Purchases without GST in the price" value={basData.g14PurchasesWithoutGST} indent
                  tooltip="Purchases that do not include GST (e.g., wages, bank charges, stamp duty)." />
                <BASRow label="G15" sublabel="Estimated purchases for private use" value={basData.g15PrivateUsePurchases} indent editable onEdit={setG15Private}
                  tooltip="Estimated portion of purchases used privately or not deductible." />
                <BASRow label="G16" sublabel="G13 + G14 + G15" value={basData.g16TotalNonCreditable} bold highlight="blue"
                  tooltip="Total purchases on which you cannot claim GST credits." />
                <BASRow label="G17" sublabel="Total purchases subject to GST (G12 minus G16)" value={basData.g17PurchasesSubjectToGST} bold
                  tooltip="Purchases on which you can claim GST credits." />
                <BASRow label="G18" sublabel="Adjustments" value={basData.g18PurchaseAdjustments} editable onEdit={setG18Adj}
                  tooltip="Adjustments for bad debts written off, changes of use, or other GST adjustments on purchases." />
                <BASRow label="G19" sublabel="Total purchases subject to GST after adjustments (G17 + G18)" value={basData.g19TotalPurchasesAfterAdj} bold highlight="amber"
                  tooltip="Final creditable purchases amount used to calculate GST on purchases." />
                <BASRow label="G20" sublabel="GST on purchases (G19 / 11)" value={basData.g20GSTOnPurchases} bold highlight="green"
                  tooltip="The GST credits you can claim on your purchases. This is your GST on purchases (same as 1B)." />
              </div>
            )}
          </div>

          {/* Revenue Breakdown by Category */}
          {basData.revenueBreakdown.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-charcoal">Revenue Breakdown by Support Category</h2>
                <p className="text-xs text-mid-gray mt-1">NDIS income classification for GST purposes</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left text-xs font-semibold text-mid-gray py-2.5 px-6">Category</th>
                      <th className="text-center text-xs font-semibold text-mid-gray py-2.5 px-4">GST Status</th>
                      <th className="text-right text-xs font-semibold text-mid-gray py-2.5 px-6">Revenue</th>
                      <th className="text-right text-xs font-semibold text-mid-gray py-2.5 px-6">GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {basData.revenueBreakdown.map((item) => (
                      <tr key={item.category} className="border-b border-gray-100">
                        <td className="text-sm text-charcoal py-2.5 px-6">{item.category}</td>
                        <td className="text-center py-2.5 px-4">
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            item.gstFree ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          )}>
                            {item.gstFree ? 'GST-Free' : 'Taxable'}
                          </span>
                        </td>
                        <td className="text-sm text-charcoal text-right py-2.5 px-6 font-mono">{formatCurrency(item.amount)}</td>
                        <td className="text-sm text-charcoal text-right py-2.5 px-6 font-mono">{formatCurrency(item.gst)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PAYG Section ── */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowPAYGDetail(!showPAYGDetail)}
              className="w-full px-6 py-4 bg-purple-50/50 border-b border-purple-100 flex items-center justify-between"
            >
              <div>
                <h2 className="text-lg font-bold text-charcoal text-left">PAYG Withholding & Instalment</h2>
                <p className="text-xs text-mid-gray text-left">Pay As You Go withholding (W1-W2) and instalment (T1-T2, 5A)</p>
              </div>
              {showPAYGDetail ? <ChevronUp size={20} className="text-mid-gray" /> : <ChevronDown size={20} className="text-mid-gray" />}
            </button>

            {showPAYGDetail && (
              <div className="divide-y divide-gray-100">
                {/* PAYG Withholding */}
                <div className="px-6 py-3 bg-purple-50/30">
                  <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wide">PAYG Withholding</h3>
                </div>

                <BASRow label="W1" sublabel="Total salary, wages and other payments" value={basData.w1TotalWagesPaid} bold
                  tooltip="Total gross wages and salary payments made to employees during the quarter." />
                <BASRow label="W2" sublabel="Amount withheld from payments in W1" value={basData.w2AmountWithheld} bold highlight="amber"
                  tooltip="Total tax withheld from employee wages (PAYG withholding). Estimated at average marginal rate." />

                {/* Super Guarantee */}
                <div className="px-6 py-3 bg-green-50/30">
                  <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wide">Superannuation (for reference)</h3>
                </div>

                <BASRow label="SG" sublabel={`Super Guarantee @ ${(SUPER_RATE * 100).toFixed(1)}% (2025-26 rate)`} value={basData.totalSuperGuarantee}
                  tooltip="Super guarantee obligation on wages. Due quarterly to employee super funds. This is not reported on the BAS but tracked here for reference." />

                {/* PAYG Instalment */}
                <div className="px-6 py-3 bg-indigo-50/30">
                  <h3 className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">PAYG Instalment</h3>
                </div>

                <BASRow label="T1" sublabel="Instalment income" value={basData.t1InstalmentIncome} bold
                  tooltip="Your total business income for the quarter, used to calculate your PAYG instalment." />
                <BASRow label="T2" sublabel={`Instalment rate (${(basData.t2InstalmentRate * 100).toFixed(1)}%)`} value={basData.t2InstalmentRate * 100}
                  tooltip="The ATO-notified instalment rate. Default is 2% for small business. Check your ATO notice for your actual rate." />
                <BASRow label="5A" sublabel="PAYG instalment (T1 x T2)" value={basData.label5A} bold highlight="amber"
                  tooltip="Your PAYG instalment amount for the quarter. This is an advance payment toward your income tax." />

                {/* Deferred */}
                <BASRow label="7" sublabel="Deferred company/fund instalment" value={basData.label7DeferredInstalment} editable onEdit={setDeferredInstalment}
                  tooltip="Any deferred instalment from a prior period. Enter the amount if applicable." />
              </div>
            )}
          </div>

          {/* ── Total BAS Amount ── */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 bg-charcoal/5 border-b border-gray-200">
              <h2 className="text-lg font-bold text-charcoal">BAS Summary & Payment</h2>
              <p className="text-xs text-mid-gray mt-1">Total amount owing or refundable</p>
            </div>
            <div className="p-6">
              {/* Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mid-gray">GST on sales (1A)</span>
                  <span className="font-mono font-medium text-charcoal">{formatCurrency(basData.label1A)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mid-gray">Less: GST on purchases (1B)</span>
                  <span className="font-mono font-medium text-red-600">-{formatCurrency(basData.label1B)}</span>
                </div>
                <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-2">
                  <span className="text-mid-gray font-medium">Net GST</span>
                  <span className="font-mono font-semibold text-charcoal">{formatCurrency(gstPayable)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mid-gray">PAYG Withholding (W2)</span>
                  <span className="font-mono font-medium text-charcoal">{formatCurrency(basData.w2AmountWithheld)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-mid-gray">PAYG Instalment (5A)</span>
                  <span className="font-mono font-medium text-charcoal">{formatCurrency(basData.label5A)}</span>
                </div>
                {basData.label7DeferredInstalment !== 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-mid-gray">Less: Deferred instalment (7)</span>
                    <span className="font-mono font-medium text-red-600">-{formatCurrency(basData.label7DeferredInstalment)}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between p-5 rounded-xl bg-forest/5 border border-forest/20">
                <div>
                  {basData.label9 >= 0 ? (
                    <>
                      <p className="text-xs font-medium text-forest uppercase tracking-wide">8A - Total Amount Owing</p>
                      <p className="text-xs text-mid-gray mt-1">Due 28 days after end of quarter</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">8B - Refund Amount</p>
                      <p className="text-xs text-mid-gray mt-1">ATO will process your refund</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className={cn('text-3xl font-bold', basData.label9 >= 0 ? 'text-red-600' : 'text-green-700')}>
                    {formatCurrency(Math.abs(basData.label9))}
                  </p>
                  <p className="text-sm text-mid-gray mt-1">
                    {basData.label9 >= 0 ? 'Payable to ATO' : 'Refundable from ATO'}
                  </p>
                </div>
              </div>

              {/* Due date reminder */}
              {selectedQuarter && (
                <div className="mt-4 flex items-center gap-2 text-xs text-mid-gray">
                  <Calendar size={14} />
                  <span>
                    BAS due date: 28th of the month following the quarter end
                    {selectedQuarter.endMonth === 8 && ` (28 Oct ${selectedQuarter.year})`}
                    {selectedQuarter.endMonth === 11 && ` (28 Feb ${selectedQuarter.year + 1})`}
                    {selectedQuarter.endMonth === 2 && ` (28 Apr ${selectedQuarter.year})`}
                    {selectedQuarter.endMonth === 5 && ` (28 Jul ${selectedQuarter.year})`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Important Notes ── */}
          <div className="card p-4 bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-800">Important Notes</p>
                <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                  <li>PAYG withholding (W2) is estimated at 20% average rate. Use actual withholding amounts from payroll for lodgement.</li>
                  <li>PAYG instalment rate (T2) defaults to 2%. Check your ATO instalment rate notice for the correct rate.</li>
                  <li>GST-free classification is based on NDIS support categories. Verify with your accountant for mixed supply situations.</li>
                  <li>Super guarantee ({(SUPER_RATE * 100).toFixed(1)}% for 2025-26) is tracked for reference but is not reported on the BAS.</li>
                  <li>This is a preparation tool. Always verify figures with your accountant before lodging with the ATO.</li>
                </ul>
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
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">1A GST Sales</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">1B GST Purch.</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">Net GST</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">W2 PAYG W/H</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-6 py-3">5A PAYG Inst.</th>
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
                    <td className="px-6 py-3 text-sm text-right text-charcoal font-mono">{formatCurrency(l.label1A)}</td>
                    <td className="px-6 py-3 text-sm text-right text-charcoal font-mono">{formatCurrency(l.label1B)}</td>
                    <td className="px-6 py-3 text-sm text-right text-charcoal font-mono">{formatCurrency(l.gstPayable)}</td>
                    <td className="px-6 py-3 text-sm text-right text-charcoal font-mono">{formatCurrency(l.w2AmountWithheld)}</td>
                    <td className="px-6 py-3 text-sm text-right text-charcoal font-mono">{formatCurrency(l.label5A)}</td>
                    <td className="px-6 py-3 text-sm text-right font-bold text-charcoal font-mono">{formatCurrency(l.totalAmount)}</td>
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
