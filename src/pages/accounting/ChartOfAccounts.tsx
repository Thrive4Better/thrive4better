import { useState, useEffect, useMemo } from 'react';
import {
  BookOpen, Plus, Search, Filter, Archive, Pencil, ChevronDown, ChevronRight,
  Hash, ToggleLeft, ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import SlideOver from '@/components/ui/SlideOver';
import EmptyState from '@/components/ui/EmptyState';
import { cn, formatCurrency, generateId } from '@/lib/utils';

// ── Types ──

type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
type AccountSubType =
  | 'Current Asset' | 'Fixed Asset'
  | 'Current Liability' | 'Long-term Liability'
  | 'Owner Equity'
  | 'NDIS Income' | 'Other Income'
  | 'Wages' | 'Rent' | 'Insurance' | 'Vehicle' | 'Office' | 'Training'
  | 'Professional Fees' | 'Utilities' | 'Depreciation' | 'Other Expense';

interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subType: AccountSubType;
  description: string;
  balance: number;
  isArchived: boolean;
  createdAt: string;
}

// ── Sub-type mappings ──

const SUB_TYPES: Record<AccountType, AccountSubType[]> = {
  Asset: ['Current Asset', 'Fixed Asset'],
  Liability: ['Current Liability', 'Long-term Liability'],
  Equity: ['Owner Equity'],
  Revenue: ['NDIS Income', 'Other Income'],
  Expense: ['Wages', 'Rent', 'Insurance', 'Vehicle', 'Office', 'Training', 'Professional Fees', 'Utilities', 'Depreciation', 'Other Expense'],
};

const TYPE_COLORS: Record<AccountType, string> = {
  Asset: 'bg-blue-100 text-blue-800',
  Liability: 'bg-red-100 text-red-700',
  Equity: 'bg-purple-100 text-purple-800',
  Revenue: 'bg-green-100 text-green-800',
  Expense: 'bg-amber-100 text-amber-800',
};

const CODE_PREFIXES: Record<AccountType, string> = {
  Asset: '1',
  Liability: '2',
  Equity: '3',
  Revenue: '4',
  Expense: '5',
};

// ── Default NDIS Provider Chart of Accounts ──

const defaultAccounts: Account[] = [
  // Assets
  { id: generateId(), code: '1-1000', name: 'Business Bank Account', type: 'Asset', subType: 'Current Asset', description: 'Main operating bank account', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '1-1010', name: 'Petty Cash', type: 'Asset', subType: 'Current Asset', description: 'Cash on hand for small expenses', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '1-1100', name: 'Accounts Receivable', type: 'Asset', subType: 'Current Asset', description: 'Amounts owed by NDIS / plan managers', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '1-1200', name: 'Prepaid Expenses', type: 'Asset', subType: 'Current Asset', description: 'Expenses paid in advance (insurance, rent)', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '1-1300', name: 'GST Receivable', type: 'Asset', subType: 'Current Asset', description: 'GST paid on purchases', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '1-2000', name: 'Office Equipment', type: 'Asset', subType: 'Fixed Asset', description: 'Computers, furniture, phones', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '1-2010', name: 'Motor Vehicles', type: 'Asset', subType: 'Fixed Asset', description: 'Company vehicles for client transport', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '1-2020', name: 'Accumulated Depreciation', type: 'Asset', subType: 'Fixed Asset', description: 'Accumulated depreciation on fixed assets', balance: 0, isArchived: false, createdAt: new Date().toISOString() },

  // Liabilities
  { id: generateId(), code: '2-1000', name: 'Accounts Payable', type: 'Liability', subType: 'Current Liability', description: 'Amounts owed to suppliers', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '2-1010', name: 'GST Payable', type: 'Liability', subType: 'Current Liability', description: 'GST collected on invoices', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '2-1020', name: 'PAYG Withholding Payable', type: 'Liability', subType: 'Current Liability', description: 'Employee tax withheld, payable to ATO', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '2-1030', name: 'Superannuation Payable', type: 'Liability', subType: 'Current Liability', description: 'Employee super contributions payable', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '2-1040', name: 'Wages Payable', type: 'Liability', subType: 'Current Liability', description: 'Accrued wages not yet paid', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '2-1050', name: 'Credit Card', type: 'Liability', subType: 'Current Liability', description: 'Business credit card balance', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '2-2000', name: 'Business Loan', type: 'Liability', subType: 'Long-term Liability', description: 'Long-term business financing', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '2-2010', name: 'Vehicle Loan', type: 'Liability', subType: 'Long-term Liability', description: 'Loan for company vehicles', balance: 0, isArchived: false, createdAt: new Date().toISOString() },

  // Equity
  { id: generateId(), code: '3-1000', name: "Owner's Equity", type: 'Equity', subType: 'Owner Equity', description: 'Owner capital contributions', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '3-1010', name: "Owner's Drawings", type: 'Equity', subType: 'Owner Equity', description: 'Owner withdrawals', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '3-2000', name: 'Retained Earnings', type: 'Equity', subType: 'Owner Equity', description: 'Accumulated profits from prior years', balance: 0, isArchived: false, createdAt: new Date().toISOString() },

  // Revenue
  { id: generateId(), code: '4-1000', name: 'NDIS Core Support Income', type: 'Revenue', subType: 'NDIS Income', description: 'Revenue from NDIS Core Support services', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '4-1010', name: 'NDIS Capacity Building Income', type: 'Revenue', subType: 'NDIS Income', description: 'Revenue from Capacity Building services', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '4-1020', name: 'NDIS Capital Support Income', type: 'Revenue', subType: 'NDIS Income', description: 'Revenue from Capital Support items', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '4-1030', name: 'SIL Income', type: 'Revenue', subType: 'NDIS Income', description: 'Revenue from Supported Independent Living', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '4-1040', name: 'Community Access Income', type: 'Revenue', subType: 'NDIS Income', description: 'Revenue from Community Access services', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '4-1050', name: 'Transport Income', type: 'Revenue', subType: 'NDIS Income', description: 'Revenue from participant transport', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '4-2000', name: 'Interest Income', type: 'Revenue', subType: 'Other Income', description: 'Bank interest earned', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '4-2010', name: 'Other Income', type: 'Revenue', subType: 'Other Income', description: 'Miscellaneous income', balance: 0, isArchived: false, createdAt: new Date().toISOString() },

  // Expenses
  { id: generateId(), code: '5-1000', name: 'Support Worker Wages', type: 'Expense', subType: 'Wages', description: 'Wages paid to support workers', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-1010', name: 'Superannuation Expense', type: 'Expense', subType: 'Wages', description: 'Employer super contributions (11.5%)', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-1020', name: 'Workers Compensation', type: 'Expense', subType: 'Insurance', description: 'Workers compensation insurance premiums', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-1030', name: 'Staff Training', type: 'Expense', subType: 'Training', description: 'Staff training, first aid, manual handling etc.', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-2000', name: 'Office Rent', type: 'Expense', subType: 'Rent', description: 'Office space lease payments', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-2010', name: 'Public Liability Insurance', type: 'Expense', subType: 'Insurance', description: 'Public liability insurance premiums', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-2020', name: 'Professional Indemnity Insurance', type: 'Expense', subType: 'Insurance', description: 'PI insurance premiums', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-3000', name: 'Vehicle Running Costs', type: 'Expense', subType: 'Vehicle', description: 'Fuel, maintenance, registration, insurance', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-3010', name: 'Vehicle Lease Payments', type: 'Expense', subType: 'Vehicle', description: 'Vehicle leasing costs', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-4000', name: 'Office Supplies', type: 'Expense', subType: 'Office', description: 'Stationery, printing, general supplies', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-4010', name: 'Software Subscriptions', type: 'Expense', subType: 'Office', description: 'NDIS software, CRM, rostering tools', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-4020', name: 'Telephone & Internet', type: 'Expense', subType: 'Utilities', description: 'Phone and internet services', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-5000', name: 'Accounting & Bookkeeping Fees', type: 'Expense', subType: 'Professional Fees', description: 'Accountant and bookkeeper fees', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-5010', name: 'Legal Fees', type: 'Expense', subType: 'Professional Fees', description: 'Legal advisory and compliance costs', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-5020', name: 'NDIS Audit Fees', type: 'Expense', subType: 'Professional Fees', description: 'NDIS quality audit and compliance costs', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-6000', name: 'Depreciation Expense', type: 'Expense', subType: 'Depreciation', description: 'Depreciation on fixed assets', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-7000', name: 'Bank Fees & Charges', type: 'Expense', subType: 'Other Expense', description: 'Bank fees and merchant charges', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-7010', name: 'Advertising & Marketing', type: 'Expense', subType: 'Other Expense', description: 'Marketing and advertising costs', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
  { id: generateId(), code: '5-7020', name: 'Sundry Expenses', type: 'Expense', subType: 'Other Expense', description: 'Miscellaneous expenses', balance: 0, isArchived: false, createdAt: new Date().toISOString() },
];

// ── Component ──

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState<Account[]>(() => {
    const saved = localStorage.getItem('t4b_chart_of_accounts');
    return saved ? JSON.parse(saved) : defaultAccounts;
  });
  useEffect(() => { localStorage.setItem('t4b_chart_of_accounts', JSON.stringify(accounts)); }, [accounts]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<AccountType | 'All'>('All');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']));
  const [slideOpen, setSlideOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  // Form state
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<AccountType>('Asset');
  const [formSubType, setFormSubType] = useState<AccountSubType>('Current Asset');
  const [formDescription, setFormDescription] = useState('');
  const [formBalance, setFormBalance] = useState('0');

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (!showArchived && a.isArchived) return false;
      if (filterType !== 'All' && a.type !== filterType) return false;
      if (search) {
        const q = search.toLowerCase();
        return a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q) || a.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [accounts, search, filterType, showArchived]);

  const groupedAccounts = useMemo(() => {
    const groups: Record<string, Account[]> = {};
    for (const a of filteredAccounts) {
      const key = `${a.type} - ${a.subType}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    // Sort each group by code
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.code.localeCompare(b.code));
    }
    return groups;
  }, [filteredAccounts]);

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const openAddForm = () => {
    setEditingAccount(null);
    setFormCode('');
    setFormName('');
    setFormType('Asset');
    setFormSubType('Current Asset');
    setFormDescription('');
    setFormBalance('0');
    setSlideOpen(true);
  };

  const openEditForm = (account: Account) => {
    setEditingAccount(account);
    setFormCode(account.code);
    setFormName(account.name);
    setFormType(account.type);
    setFormSubType(account.subType);
    setFormDescription(account.description);
    setFormBalance(String(account.balance));
    setSlideOpen(true);
  };

  const handleSave = () => {
    if (!formCode.trim() || !formName.trim()) {
      toast.error('Code and name are required');
      return;
    }
    // Check for duplicate code
    const duplicate = accounts.find((a) => a.code === formCode.trim() && a.id !== editingAccount?.id);
    if (duplicate) {
      toast.error('Account code already exists');
      return;
    }

    if (editingAccount) {
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === editingAccount.id
            ? { ...a, code: formCode.trim(), name: formName.trim(), type: formType, subType: formSubType, description: formDescription.trim(), balance: parseFloat(formBalance) || 0 }
            : a
        )
      );
      toast.success('Account updated');
    } else {
      const newAccount: Account = {
        id: generateId(),
        code: formCode.trim(),
        name: formName.trim(),
        type: formType,
        subType: formSubType,
        description: formDescription.trim(),
        balance: parseFloat(formBalance) || 0,
        isArchived: false,
        createdAt: new Date().toISOString(),
      };
      setAccounts((prev) => [...prev, newAccount]);
      toast.success('Account created');
    }
    setSlideOpen(false);
  };

  const handleArchive = (account: Account) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === account.id ? { ...a, isArchived: !a.isArchived } : a))
    );
    toast.success(account.isArchived ? 'Account restored' : 'Account archived');
  };

  const suggestCode = () => {
    const prefix = CODE_PREFIXES[formType];
    const existing = accounts.filter((a) => a.code.startsWith(prefix)).map((a) => {
      const num = parseInt(a.code.split('-')[1] || '0');
      return isNaN(num) ? 0 : num;
    });
    const next = existing.length > 0 ? Math.max(...existing) + 10 : 1000;
    setFormCode(`${prefix}-${next}`);
  };

  // Summary
  const totalAssets = accounts.filter((a) => a.type === 'Asset' && !a.isArchived).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = accounts.filter((a) => a.type === 'Liability' && !a.isArchived).reduce((s, a) => s + a.balance, 0);
  const totalEquity = accounts.filter((a) => a.type === 'Equity' && !a.isArchived).reduce((s, a) => s + a.balance, 0);
  const totalRevenue = accounts.filter((a) => a.type === 'Revenue' && !a.isArchived).reduce((s, a) => s + a.balance, 0);
  const totalExpenses = accounts.filter((a) => a.type === 'Expense' && !a.isArchived).reduce((s, a) => s + a.balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Chart of Accounts</h1>
          <p className="text-sm text-mid-gray mt-1">Manage your general ledger accounts</p>
        </div>
        <button onClick={openAddForm} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Add Account
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Assets', value: totalAssets, color: 'text-blue-700' },
          { label: 'Liabilities', value: totalLiabilities, color: 'text-red-600' },
          { label: 'Equity', value: totalEquity, color: 'text-purple-700' },
          { label: 'Revenue', value: totalRevenue, color: 'text-green-700' },
          { label: 'Expenses', value: totalExpenses, color: 'text-amber-700' },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-xs font-medium text-mid-gray uppercase tracking-wide">{item.label}</p>
            <p className={cn('text-xl font-bold mt-1', item.color)}>{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
            <input
              type="text"
              placeholder="Search accounts by name, code, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-mid-gray" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as AccountType | 'All')}
              className="input-field"
            >
              <option value="All">All Types</option>
              <option value="Asset">Assets</option>
              <option value="Liability">Liabilities</option>
              <option value="Equity">Equity</option>
              <option value="Revenue">Revenue</option>
              <option value="Expense">Expenses</option>
            </select>
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
              showArchived ? 'bg-sage-pale text-forest' : 'bg-gray-100 text-mid-gray'
            )}
          >
            {showArchived ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
            Show Archived
          </button>
        </div>
      </div>

      {/* Accounts List */}
      <div className="card overflow-hidden">
        {filteredAccounts.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No accounts found"
            description="Adjust your filters or add a new account to get started."
            action={{ label: 'Add Account', onClick: openAddForm }}
          />
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[100px_1fr_160px_160px_120px_80px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-mid-gray uppercase tracking-wide">
              <span>Code</span>
              <span>Account Name</span>
              <span>Type</span>
              <span>Sub-Type</span>
              <span className="text-right">Balance</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Grouped rows */}
            {(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as AccountType[])
              .filter((type) => filterType === 'All' || filterType === type)
              .map((type) => {
                const typeAccounts = filteredAccounts.filter((a) => a.type === type);
                if (typeAccounts.length === 0) return null;
                const isExpanded = expandedTypes.has(type);

                return (
                  <div key={type}>
                    <button
                      onClick={() => toggleType(type)}
                      className="w-full flex items-center gap-2 px-6 py-3 bg-gray-50/50 hover:bg-gray-100 transition-colors border-b border-gray-100"
                    >
                      {isExpanded ? <ChevronDown size={16} className="text-mid-gray" /> : <ChevronRight size={16} className="text-mid-gray" />}
                      <span className="text-sm font-bold text-charcoal">{type}</span>
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TYPE_COLORS[type])}>{typeAccounts.length}</span>
                      <span className="ml-auto text-sm font-semibold text-charcoal">
                        {formatCurrency(typeAccounts.reduce((s, a) => s + a.balance, 0))}
                      </span>
                    </button>

                    {isExpanded &&
                      typeAccounts.map((account) => (
                        <div
                          key={account.id}
                          className={cn(
                            'grid grid-cols-[100px_1fr_160px_160px_120px_80px] gap-4 px-6 py-3 border-b border-gray-100 hover:bg-cream/30 transition-colors items-center',
                            account.isArchived && 'opacity-50'
                          )}
                        >
                          <span className="text-sm font-mono text-forest font-medium">{account.code}</span>
                          <div>
                            <p className="text-sm font-medium text-charcoal">{account.name}</p>
                            {account.description && (
                              <p className="text-xs text-mid-gray truncate">{account.description}</p>
                            )}
                          </div>
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium w-fit', TYPE_COLORS[account.type])}>{account.type}</span>
                          <span className="text-xs text-mid-gray">{account.subType}</span>
                          <span className={cn('text-sm font-medium text-right', account.balance >= 0 ? 'text-charcoal' : 'text-red-600')}>
                            {formatCurrency(account.balance)}
                          </span>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditForm(account)}
                              className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-forest"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleArchive(account)}
                              className="p-1.5 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-forest"
                              title={account.isArchived ? 'Restore' : 'Archive'}
                            >
                              <Archive size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* SlideOver Form */}
      <SlideOver
        open={slideOpen}
        onClose={() => setSlideOpen(false)}
        title={editingAccount ? 'Edit Account' : 'Add Account'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Account Type</label>
            <select
              value={formType}
              onChange={(e) => {
                const newType = e.target.value as AccountType;
                setFormType(newType);
                setFormSubType(SUB_TYPES[newType][0]);
              }}
              className="input-field w-full"
            >
              {(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'] as AccountType[]).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Sub-Type</label>
            <select
              value={formSubType}
              onChange={(e) => setFormSubType(e.target.value as AccountSubType)}
              className="input-field w-full"
            >
              {SUB_TYPES[formType].map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Account Code</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="e.g. 1-1000"
                className="input-field flex-1"
              />
              <button onClick={suggestCode} className="btn-ghost text-sm flex items-center gap-1">
                <Hash size={14} />
                Auto
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Account Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Business Bank Account"
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Description</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional description of this account"
              rows={3}
              className="input-field w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Opening Balance</label>
            <input
              type="number"
              step="0.01"
              value={formBalance}
              onChange={(e) => setFormBalance(e.target.value)}
              className="input-field w-full"
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button onClick={() => setSlideOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleSave} className="btn-primary flex-1">
              {editingAccount ? 'Update Account' : 'Create Account'}
            </button>
          </div>
        </div>
      </SlideOver>
    </div>
  );
}
