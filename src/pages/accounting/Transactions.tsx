import { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, Plus, Search, Filter, Upload, Download,
  CheckCircle2, Circle, FileSpreadsheet, X, Calendar, BookOpen,
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import SlideOver from '@/components/ui/SlideOver';
import EmptyState from '@/components/ui/EmptyState';
import { cn, formatCurrency, generateId } from '@/lib/utils';
import { useStore } from '@/stores/useStore';
import {
  loadAccountingCategories,
  saveAccountingCategories,
  getCategoriesByGroup,
  type AccountingCategory,
  type CategoryGroup,
  type TaxType,
} from '@/data/accountingCategories';

// ── Types ──

interface Transaction {
  id: string;
  date: string;
  description: string;
  accountCode: string;
  accountName: string;
  reference: string;
  debit: number;
  credit: number;
  type: 'income' | 'expense' | 'journal' | 'transfer';
  reconciled: boolean;
  source: 'manual' | 'csv' | 'auto';
  categoryId?: string;
  taxType?: string;
  createdAt: string;
}

interface AccountOption {
  code: string;
  name: string;
}

// ── Helper ──

function getAccountsFromStorage(): AccountOption[] {
  try {
    const saved = localStorage.getItem('t4b_chart_of_accounts');
    if (!saved) return [];
    const accounts = JSON.parse(saved) as { code: string; name: string; isArchived: boolean }[];
    return accounts.filter((a) => !a.isArchived).map((a) => ({ code: a.code, name: a.name }));
  } catch {
    return [];
  }
}

// ── Searchable Category Dropdown ──

function CategoryDropdown({
  value,
  onChange,
  categories,
  onAddNew,
}: {
  value: string;
  onChange: (categoryId: string, category: AccountingCategory | null) => void;
  categories: AccountingCategory[];
  onAddNew: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selected = categories.find((c) => c.id === value);
  const grouped = useMemo(() => getCategoriesByGroup(categories), [categories]);

  const filteredGrouped = useMemo(() => {
    if (!search) return grouped;
    const q = search.toLowerCase();
    const result: Record<CategoryGroup, AccountingCategory[]> = {
      'Revenue': [],
      'Cost of Services': [],
      'Operating Expenses': [],
      'Other': [],
    };
    for (const [group, cats] of Object.entries(grouped)) {
      const filtered = cats.filter(
        (c) => c.name.toLowerCase().includes(q) || String(c.code).includes(q)
      );
      if (filtered.length > 0) {
        result[group as CategoryGroup] = filtered;
      }
    }
    return result;
  }, [grouped, search]);

  const hasResults = Object.values(filteredGrouped).some((arr) => arr.length > 0);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setSearch(''); }}
        className="input-field w-full text-left flex items-center justify-between gap-2"
      >
        <span className={selected ? 'text-charcoal' : 'text-mid-gray'}>
          {selected ? `${selected.code} - ${selected.name}` : 'Select category...'}
        </span>
        <svg className="w-4 h-4 text-mid-gray shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-sage-light rounded-xl shadow-lg max-h-72 flex flex-col">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mid-gray" />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-forest focus:ring-1 focus:ring-forest/20"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto flex-1">
            {!hasResults && (
              <div className="px-4 py-3 text-sm text-mid-gray">No categories match your search</div>
            )}
            {(['Revenue', 'Cost of Services', 'Operating Expenses', 'Other'] as CategoryGroup[]).map((group) => {
              const cats = filteredGrouped[group];
              if (!cats || cats.length === 0) return null;
              return (
                <div key={group}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-mid-gray uppercase tracking-wide bg-gray-50 sticky top-0">
                    {group}
                  </div>
                  {cats.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        onChange(cat.id, cat);
                        setOpen(false);
                        setSearch('');
                      }}
                      className={cn(
                        'w-full text-left px-4 py-2 text-sm hover:bg-sage-pale transition-colors flex items-center justify-between',
                        cat.id === value && 'bg-sage-pale/50 text-forest font-medium',
                      )}
                    >
                      <span>{cat.name}</span>
                      <span className="text-xs text-mid-gray ml-2 shrink-0">{cat.code}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setSearch('');
              onAddNew();
            }}
            className="w-full text-left px-4 py-2.5 text-sm text-forest font-medium hover:bg-sage-pale transition-colors border-t border-gray-100 flex items-center gap-2"
          >
            <Plus size={14} />
            Add new category
          </button>
        </div>
      )}
    </div>
  );
}

// ── Add Category Modal ──

function AddCategoryModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (cat: AccountingCategory) => void;
}) {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<CategoryGroup>('Operating Expenses');
  const [code, setCode] = useState('');
  const [taxType, setTaxType] = useState<TaxType>('GST on Expenses');
  const [catType, setCatType] = useState<'revenue' | 'expense'>('expense');

  useEffect(() => {
    if (open) {
      setName('');
      setCode('');
      setGroup('Operating Expenses');
      setTaxType('GST on Expenses');
      setCatType('expense');
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    if (!name.trim()) { toast.error('Category name is required'); return; }
    if (!code.trim()) { toast.error('Category code is required'); return; }
    const newCat: AccountingCategory = {
      id: `cat-user-${generateId()}`,
      name: name.trim(),
      type: catType,
      group,
      code: parseInt(code) || 0,
      taxType,
      isDefault: false,
    };
    onSave(newCat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-charcoal">Add New Category</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={20} className="text-mid-gray" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Category Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Staff Amenities" className="input-field w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Code</label>
              <input type="number" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. 590" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Type</label>
              <select value={catType} onChange={(e) => setCatType(e.target.value as 'revenue' | 'expense')} className="input-field w-full">
                <option value="revenue">Revenue</option>
                <option value="expense">Expense</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Group</label>
            <select value={group} onChange={(e) => setGroup(e.target.value as CategoryGroup)} className="input-field w-full">
              <option value="Revenue">Revenue</option>
              <option value="Cost of Services">Cost of Services</option>
              <option value="Operating Expenses">Operating Expenses</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Tax Type</label>
            <select value={taxType} onChange={(e) => setTaxType(e.target.value as TaxType)} className="input-field w-full">
              <option value="GST Free">GST Free</option>
              <option value="GST on Income">GST on Income</option>
              <option value="GST on Expenses">GST on Expenses</option>
              <option value="BAS Excluded">BAS Excluded</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1">Create Category</button>
        </div>
      </div>
    </div>
  );
}

// ── Component ──

export default function Transactions() {
  const { invoices, shifts } = useStore();

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('t4b_transactions');
    return saved ? JSON.parse(saved) : [];
  });
  useEffect(() => { localStorage.setItem('t4b_transactions', JSON.stringify(transactions)); }, [transactions]);

  const [acctCategories, setAcctCategories] = useState<AccountingCategory[]>(() => loadAccountingCategories());
  useEffect(() => { saveAccountingCategories(acctCategories); }, [acctCategories]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'journal' | 'transfer'>('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [dateFrom, setDateFrom] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [slideOpen, setSlideOpen] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [addCatModalOpen, setAddCatModalOpen] = useState(false);

  // Journal entry form
  const [journalDate, setJournalDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [journalDesc, setJournalDesc] = useState('');
  const [journalRef, setJournalRef] = useState('');
  const [journalAccount, setJournalAccount] = useState('');
  const [journalCategoryId, setJournalCategoryId] = useState('');
  const [journalDebit, setJournalDebit] = useState('');
  const [journalCredit, setJournalCredit] = useState('');
  const [journalType, setJournalType] = useState<'income' | 'expense' | 'journal' | 'transfer'>('journal');

  // CSV import
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMapping, setCsvMapping] = useState<Record<string, string>>({
    date: '', description: '', debit: '', credit: '', reference: '',
  });

  const accountOptions = useMemo(() => getAccountsFromStorage(), [slideOpen, csvModalOpen]);

  // Auto-generate transactions from paid invoices
  useEffect(() => {
    if (transactions.length > 0) return; // Only auto-seed once
    const autoTransactions: Transaction[] = [];

    for (const inv of invoices) {
      if (inv.status === 'Paid') {
        autoTransactions.push({
          id: generateId(),
          date: inv.invoiceDate,
          description: `Invoice ${inv.invoiceNumber} payment received`,
          accountCode: '1-1000',
          accountName: 'Business Bank Account',
          reference: inv.invoiceNumber,
          debit: inv.total,
          credit: 0,
          type: 'income',
          reconciled: true,
          source: 'auto',
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (autoTransactions.length > 0) {
      setTransactions(autoTransactions);
    }
  }, [invoices]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((t) => {
        if (filterType !== 'all' && t.type !== filterType) return false;
        if (filterAccount !== 'all' && t.accountCode !== filterAccount) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!t.description.toLowerCase().includes(q) && !t.reference.toLowerCase().includes(q) && !t.accountName.toLowerCase().includes(q)) return false;
        }
        try {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start: parseISO(dateFrom), end: parseISO(dateTo) });
        } catch {
          return true;
        }
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, search, filterType, filterAccount, dateFrom, dateTo]);

  // Running balance
  const transactionsWithBalance = useMemo(() => {
    let balance = 0;
    return filteredTransactions.map((t) => {
      balance += t.debit - t.credit;
      return { ...t, runningBalance: balance };
    });
  }, [filteredTransactions]);

  const totalDebit = filteredTransactions.reduce((s, t) => s + t.debit, 0);
  const totalCredit = filteredTransactions.reduce((s, t) => s + t.credit, 0);
  const reconciledCount = filteredTransactions.filter((t) => t.reconciled).length;

  const openJournalForm = () => {
    setJournalDate(format(new Date(), 'yyyy-MM-dd'));
    setJournalDesc('');
    setJournalRef('');
    setJournalAccount(accountOptions.length > 0 ? accountOptions[0].code : '');
    setJournalCategoryId('');
    setJournalDebit('');
    setJournalCredit('');
    setJournalType('journal');
    setSlideOpen(true);
  };

  const handleSaveJournal = () => {
    if (!journalDesc.trim()) { toast.error('Description is required'); return; }
    if (!journalDebit && !journalCredit) { toast.error('Enter a debit or credit amount'); return; }
    if (journalDebit && journalCredit) { toast.error('Enter either debit or credit, not both'); return; }

    const acct = accountOptions.find((a) => a.code === journalAccount);
    const cat = acctCategories.find((c) => c.id === journalCategoryId);
    const txn: Transaction = {
      id: generateId(),
      date: journalDate,
      description: journalDesc.trim(),
      accountCode: journalAccount || (cat ? String(cat.code) : ''),
      accountName: acct?.name || (cat?.name ?? journalAccount),
      reference: journalRef.trim(),
      debit: parseFloat(journalDebit) || 0,
      credit: parseFloat(journalCredit) || 0,
      type: journalType,
      reconciled: false,
      source: 'manual',
      categoryId: journalCategoryId || undefined,
      taxType: cat?.taxType || undefined,
      createdAt: new Date().toISOString(),
    };
    setTransactions((prev) => [...prev, txn]);
    toast.success('Journal entry added');
    setSlideOpen(false);
  };

  const toggleReconciled = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, reconciled: !t.reconciled } : t))
    );
  };

  const handleAddCategory = (cat: AccountingCategory) => {
    setAcctCategories((prev) => [...prev, cat]);
    setJournalCategoryId(cat.id);
    toast.success(`Category "${cat.name}" created`);
  };

  // CSV handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
      if (lines.length < 2) { toast.error('CSV file is empty or invalid'); return; }
      setCsvHeaders(lines[0]);
      setCsvData(lines.slice(1).filter((l) => l.some((c) => c)));
      // Auto-map common headers
      const headerLower = lines[0].map((h) => h.toLowerCase());
      const mapping: Record<string, string> = { date: '', description: '', debit: '', credit: '', reference: '' };
      for (const h of headerLower) {
        if (h.includes('date')) mapping.date = lines[0][headerLower.indexOf(h)];
        if (h.includes('desc') || h.includes('narration') || h.includes('memo')) mapping.description = lines[0][headerLower.indexOf(h)];
        if (h.includes('debit') || h.includes('deposit')) mapping.debit = lines[0][headerLower.indexOf(h)];
        if (h.includes('credit') || h.includes('withdrawal')) mapping.credit = lines[0][headerLower.indexOf(h)];
        if (h.includes('ref') || h.includes('check')) mapping.reference = lines[0][headerLower.indexOf(h)];
      }
      setCsvMapping(mapping);
      setCsvModalOpen(true);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportCsv = () => {
    if (!csvMapping.date || !csvMapping.description) {
      toast.error('Date and Description columns must be mapped');
      return;
    }
    const imported: Transaction[] = [];
    for (const row of csvData) {
      const getCol = (header: string) => {
        const idx = csvHeaders.indexOf(header);
        return idx >= 0 ? row[idx] || '' : '';
      };
      const dateVal = getCol(csvMapping.date);
      const descVal = getCol(csvMapping.description);
      const debitVal = parseFloat(getCol(csvMapping.debit).replace(/[^0-9.-]/g, '')) || 0;
      const creditVal = parseFloat(getCol(csvMapping.credit).replace(/[^0-9.-]/g, '')) || 0;
      const refVal = getCol(csvMapping.reference);

      if (!dateVal || !descVal) continue;

      // Try to parse date
      let parsedDate: string;
      try {
        const d = new Date(dateVal);
        parsedDate = isNaN(d.getTime()) ? format(new Date(), 'yyyy-MM-dd') : format(d, 'yyyy-MM-dd');
      } catch {
        parsedDate = format(new Date(), 'yyyy-MM-dd');
      }

      imported.push({
        id: generateId(),
        date: parsedDate,
        description: descVal,
        accountCode: '1-1000',
        accountName: 'Business Bank Account',
        reference: refVal,
        debit: debitVal,
        credit: creditVal,
        type: debitVal > 0 ? 'income' : 'expense',
        reconciled: false,
        source: 'csv',
        createdAt: new Date().toISOString(),
      });
    }
    setTransactions((prev) => [...prev, ...imported]);
    toast.success(`Imported ${imported.length} transactions`);
    setCsvModalOpen(false);
    setCsvData([]);
    setCsvHeaders([]);
  };

  const exportCsv = () => {
    const headers = ['Date', 'Description', 'Account', 'Category', 'Tax Type', 'Reference', 'Debit', 'Credit', 'Balance', 'Reconciled'];
    const rows = transactionsWithBalance.map((t) => {
      const cat = t.categoryId ? acctCategories.find((c) => c.id === t.categoryId) : null;
      return [
        t.date, t.description, `${t.accountCode} - ${t.accountName}`,
        cat ? cat.name : '', t.taxType || '',
        t.reference,
        t.debit.toFixed(2), t.credit.toFixed(2), t.runningBalance.toFixed(2), t.reconciled ? 'Yes' : 'No',
      ];
    });
    const csvContent = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_${dateFrom}_to_${dateTo}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Transactions exported');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Transactions</h1>
          <p className="text-sm text-mid-gray mt-1">Bank transaction register and journal entries</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button onClick={() => fileInputRef.current?.click()} className="btn-ghost flex items-center gap-2">
            <Upload size={16} />
            Import CSV
          </button>
          <button onClick={exportCsv} className="btn-ghost flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
          <button onClick={openJournalForm} className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            Journal Entry
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <ArrowDownLeft size={20} className="text-green-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-mid-gray">Total Debits</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(totalDebit)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <ArrowUpRight size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-mid-gray">Total Credits</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(totalCredit)}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-blue-700" />
            </div>
            <div>
              <p className="text-xs font-medium text-mid-gray">Net Position</p>
              <p className={cn('text-lg font-bold', totalDebit - totalCredit >= 0 ? 'text-green-700' : 'text-red-600')}>
                {formatCurrency(totalDebit - totalCredit)}
              </p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sage-pale flex items-center justify-center">
              <CheckCircle2 size={20} className="text-forest" />
            </div>
            <div>
              <p className="text-xs font-medium text-mid-gray">Reconciled</p>
              <p className="text-lg font-bold text-forest">{reconciledCount} / {filteredTransactions.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
            <input
              type="text"
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-mid-gray" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="input-field" />
            <span className="text-mid-gray text-sm">to</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="input-field" />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as typeof filterType)}
            className="input-field"
          >
            <option value="all">All Types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="journal">Journal</option>
            <option value="transfer">Transfer</option>
          </select>
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="input-field"
          >
            <option value="all">All Accounts</option>
            {accountOptions.map((a) => (
              <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="card overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No transactions"
            description="Add journal entries or import a CSV bank statement to get started."
            action={{ label: 'Add Journal Entry', onClick: openJournalForm }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-semibold text-mid-gray uppercase tracking-wide px-4 py-3 w-8"></th>
                  <th className="text-left text-xs font-semibold text-mid-gray uppercase tracking-wide px-4 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-mid-gray uppercase tracking-wide px-4 py-3">Description</th>
                  <th className="text-left text-xs font-semibold text-mid-gray uppercase tracking-wide px-4 py-3">Category</th>
                  <th className="text-left text-xs font-semibold text-mid-gray uppercase tracking-wide px-4 py-3">Reference</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-4 py-3">Debit</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-4 py-3">Credit</th>
                  <th className="text-right text-xs font-semibold text-mid-gray uppercase tracking-wide px-4 py-3">Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactionsWithBalance.map((t) => {
                  const cat = t.categoryId ? acctCategories.find((c) => c.id === t.categoryId) : null;
                  return (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-cream/30 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleReconciled(t.id)}
                          className="text-mid-gray hover:text-forest transition-colors"
                          title={t.reconciled ? 'Mark as unreconciled' : 'Mark as reconciled'}
                        >
                          {t.reconciled
                            ? <CheckCircle2 size={16} className="text-green-600" />
                            : <Circle size={16} />
                          }
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-charcoal whitespace-nowrap">
                        {format(parseISO(t.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-charcoal">{t.description}</p>
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded font-medium',
                          t.type === 'income' ? 'bg-green-100 text-green-700' :
                          t.type === 'expense' ? 'bg-red-100 text-red-700' :
                          t.type === 'transfer' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        )}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {cat ? (
                          <div>
                            <p className="text-sm text-charcoal">{cat.name}</p>
                            <p className="text-xs text-mid-gray">{cat.taxType}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-mid-gray">{t.accountCode} - {t.accountName}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-mid-gray">{t.reference}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {t.debit > 0 ? <span className="text-green-700">{formatCurrency(t.debit)}</span> : <span className="text-mid-gray">-</span>}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium">
                        {t.credit > 0 ? <span className="text-red-600">{formatCurrency(t.credit)}</span> : <span className="text-mid-gray">-</span>}
                      </td>
                      <td className={cn('px-4 py-3 text-sm text-right font-bold', t.runningBalance >= 0 ? 'text-charcoal' : 'text-red-600')}>
                        {formatCurrency(t.runningBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={5} className="px-4 py-3 text-sm font-bold text-charcoal text-right">Totals</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-green-700">{formatCurrency(totalDebit)}</td>
                  <td className="px-4 py-3 text-sm text-right font-bold text-red-600">{formatCurrency(totalCredit)}</td>
                  <td className={cn('px-4 py-3 text-sm text-right font-bold', totalDebit - totalCredit >= 0 ? 'text-charcoal' : 'text-red-600')}>
                    {formatCurrency(totalDebit - totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Journal Entry SlideOver */}
      <SlideOver open={slideOpen} onClose={() => setSlideOpen(false)} title="Add Journal Entry">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Date</label>
            <input type="date" value={journalDate} onChange={(e) => setJournalDate(e.target.value)} className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Type</label>
            <select value={journalType} onChange={(e) => setJournalType(e.target.value as typeof journalType)} className="input-field w-full">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="journal">Journal</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Category</label>
            <CategoryDropdown
              value={journalCategoryId}
              onChange={(catId, cat) => {
                setJournalCategoryId(catId);
                // Auto-set account code from category
                if (cat) {
                  setJournalAccount(String(cat.code));
                }
              }}
              categories={acctCategories}
              onAddNew={() => setAddCatModalOpen(true)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Account (optional override)</label>
            <select value={journalAccount} onChange={(e) => setJournalAccount(e.target.value)} className="input-field w-full">
              <option value="">-- Use category code --</option>
              {accountOptions.map((a) => (
                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
            <input type="text" value={journalDesc} onChange={(e) => setJournalDesc(e.target.value)} placeholder="Transaction description" className="input-field w-full" />
          </div>
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Reference</label>
            <input type="text" value={journalRef} onChange={(e) => setJournalRef(e.target.value)} placeholder="e.g. INV-001, CHQ-123" className="input-field w-full" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Debit ($)</label>
              <input type="number" step="0.01" min="0" value={journalDebit} onChange={(e) => { setJournalDebit(e.target.value); if (e.target.value) setJournalCredit(''); }} placeholder="0.00" className="input-field w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Credit ($)</label>
              <input type="number" step="0.01" min="0" value={journalCredit} onChange={(e) => { setJournalCredit(e.target.value); if (e.target.value) setJournalDebit(''); }} placeholder="0.00" className="input-field w-full" />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button onClick={() => setSlideOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSaveJournal} className="btn-primary flex-1">Add Entry</button>
          </div>
        </div>
      </SlideOver>

      {/* Add Category Modal */}
      <AddCategoryModal
        open={addCatModalOpen}
        onClose={() => setAddCatModalOpen(false)}
        onSave={handleAddCategory}
      />

      {/* CSV Import Modal */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setCsvModalOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-charcoal">Import CSV - Column Mapping</h3>
              <button onClick={() => setCsvModalOpen(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X size={20} className="text-mid-gray" />
              </button>
            </div>
            <p className="text-sm text-mid-gray mb-4">
              Found {csvData.length} rows. Map your CSV columns to transaction fields:
            </p>
            <div className="space-y-3">
              {(['date', 'description', 'debit', 'credit', 'reference'] as const).map((field) => (
                <div key={field} className="flex items-center gap-4">
                  <label className="text-sm font-medium text-charcoal w-28 capitalize">{field} *</label>
                  <select
                    value={csvMapping[field]}
                    onChange={(e) => setCsvMapping((prev) => ({ ...prev, [field]: e.target.value }))}
                    className="input-field flex-1"
                  >
                    <option value="">-- Select Column --</option>
                    {csvHeaders.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {csvData.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-semibold text-mid-gray mb-2">Preview (first 3 rows):</p>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full">
                    <thead>
                      <tr>
                        {csvHeaders.map((h) => (
                          <th key={h} className="text-left pr-3 pb-1 text-mid-gray">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvData.slice(0, 3).map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="pr-3 py-0.5 text-charcoal">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCsvModalOpen(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={handleImportCsv} className="btn-primary flex-1">
                Import {csvData.length} Transactions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
