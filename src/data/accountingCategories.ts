// ── Xero-style Preset Accounting Categories ──
// Pre-populated defaults that users can extend with their own categories.
// Persisted in localStorage under `t4b_accounting_categories`.

export type TaxType = 'GST Free' | 'GST on Income' | 'GST on Expenses' | 'BAS Excluded';
export type CategoryType = 'revenue' | 'expense' | 'asset' | 'liability' | 'equity';
export type CategoryGroup =
  | 'Revenue'
  | 'Cost of Services'
  | 'Operating Expenses'
  | 'Other';

export interface AccountingCategory {
  id: string;
  name: string;
  type: CategoryType;
  group: CategoryGroup;
  code: number;
  taxType: TaxType;
  isDefault: boolean;
}

// ── Preset categories (Xero-style numbering) ──

export const DEFAULT_ACCOUNTING_CATEGORIES: AccountingCategory[] = [
  // ── Revenue (200-series) ──
  { id: 'cat-rev-core', name: 'NDIS Revenue - Core Supports', type: 'revenue', group: 'Revenue', code: 200, taxType: 'GST Free', isDefault: true },
  { id: 'cat-rev-capacity', name: 'NDIS Revenue - Capacity Building', type: 'revenue', group: 'Revenue', code: 201, taxType: 'GST Free', isDefault: true },
  { id: 'cat-rev-capital', name: 'NDIS Revenue - Capital Supports', type: 'revenue', group: 'Revenue', code: 202, taxType: 'GST Free', isDefault: true },
  { id: 'cat-rev-planmgmt', name: 'NDIS Revenue - Plan Management', type: 'revenue', group: 'Revenue', code: 203, taxType: 'GST Free', isDefault: true },
  { id: 'cat-rev-suppcoord', name: 'NDIS Revenue - Support Coordination', type: 'revenue', group: 'Revenue', code: 204, taxType: 'GST Free', isDefault: true },
  { id: 'cat-rev-other', name: 'Other Revenue', type: 'revenue', group: 'Revenue', code: 260, taxType: 'GST on Income', isDefault: true },
  { id: 'cat-rev-interest', name: 'Interest Income', type: 'revenue', group: 'Revenue', code: 270, taxType: 'GST Free', isDefault: true },

  // ── Cost of Services (400-series) ──
  { id: 'cat-cos-wages-sw', name: 'Wages & Salaries - Support Workers', type: 'expense', group: 'Cost of Services', code: 400, taxType: 'BAS Excluded', isDefault: true },
  { id: 'cat-cos-wages-admin', name: 'Wages & Salaries - Administration', type: 'expense', group: 'Cost of Services', code: 401, taxType: 'BAS Excluded', isDefault: true },
  { id: 'cat-cos-super', name: 'Superannuation', type: 'expense', group: 'Cost of Services', code: 410, taxType: 'BAS Excluded', isDefault: true },
  { id: 'cat-cos-workcomp', name: 'Workers Compensation Insurance', type: 'expense', group: 'Cost of Services', code: 420, taxType: 'GST Free', isDefault: true },
  { id: 'cat-cos-training', name: 'Staff Training & Development', type: 'expense', group: 'Cost of Services', code: 430, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-cos-travel', name: 'Travel & Transport - Client Related', type: 'expense', group: 'Cost of Services', code: 440, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-cos-ppe', name: 'PPE & Consumables', type: 'expense', group: 'Cost of Services', code: 450, taxType: 'GST on Expenses', isDefault: true },

  // ── Operating Expenses (500-series) ──
  { id: 'cat-op-rent', name: 'Rent & Occupancy', type: 'expense', group: 'Operating Expenses', code: 500, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-utilities', name: 'Utilities (Electric, Gas, Water)', type: 'expense', group: 'Operating Expenses', code: 510, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-phone', name: 'Phone & Internet', type: 'expense', group: 'Operating Expenses', code: 511, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-software', name: 'Software & Subscriptions', type: 'expense', group: 'Operating Expenses', code: 512, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-inspl', name: 'Insurance - Public Liability', type: 'expense', group: 'Operating Expenses', code: 520, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-inspi', name: 'Insurance - Professional Indemnity', type: 'expense', group: 'Operating Expenses', code: 521, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-vehicle', name: 'Motor Vehicle Expenses', type: 'expense', group: 'Operating Expenses', code: 530, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-office', name: 'Office Supplies', type: 'expense', group: 'Operating Expenses', code: 540, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-marketing', name: 'Marketing & Advertising', type: 'expense', group: 'Operating Expenses', code: 541, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-acctlegal', name: 'Accounting & Legal Fees', type: 'expense', group: 'Operating Expenses', code: 550, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-bankfees', name: 'Bank Fees & Charges', type: 'expense', group: 'Operating Expenses', code: 560, taxType: 'GST Free', isDefault: true },
  { id: 'cat-op-deprec', name: 'Depreciation', type: 'expense', group: 'Operating Expenses', code: 570, taxType: 'BAS Excluded', isDefault: true },
  { id: 'cat-op-repairs', name: 'Repairs & Maintenance', type: 'expense', group: 'Operating Expenses', code: 580, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-cleaning', name: 'Cleaning', type: 'expense', group: 'Operating Expenses', code: 581, taxType: 'GST on Expenses', isDefault: true },
  { id: 'cat-op-printing', name: 'Printing & Stationery', type: 'expense', group: 'Operating Expenses', code: 582, taxType: 'GST on Expenses', isDefault: true },

  // ── Other (800/900-series) ──
  { id: 'cat-oth-gstcoll', name: 'GST Collected', type: 'liability', group: 'Other', code: 800, taxType: 'BAS Excluded', isDefault: true },
  { id: 'cat-oth-gstpaid', name: 'GST Paid', type: 'asset', group: 'Other', code: 801, taxType: 'BAS Excluded', isDefault: true },
  { id: 'cat-oth-payg', name: 'PAYG Withholding', type: 'liability', group: 'Other', code: 810, taxType: 'BAS Excluded', isDefault: true },
  { id: 'cat-oth-superpay', name: 'Superannuation Payable', type: 'liability', group: 'Other', code: 820, taxType: 'BAS Excluded', isDefault: true },
  { id: 'cat-oth-bas', name: 'BAS Liability', type: 'liability', group: 'Other', code: 830, taxType: 'BAS Excluded', isDefault: true },
];

// ── Storage key ──

const STORAGE_KEY = 't4b_accounting_categories';

// ── Load categories (merges presets with any user-added) ──

export function loadAccountingCategories(): AccountingCategory[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [...DEFAULT_ACCOUNTING_CATEGORIES];
    const parsed: AccountingCategory[] = JSON.parse(saved);
    // Merge: ensure all presets exist, plus keep user-added ones
    const presetIds = new Set(DEFAULT_ACCOUNTING_CATEGORIES.map((c) => c.id));
    const userAdded = parsed.filter((c) => !presetIds.has(c.id));
    // Use saved version of defaults (user may have edited names etc), fall back to preset
    const mergedDefaults = DEFAULT_ACCOUNTING_CATEGORIES.map((def) => {
      const saved = parsed.find((c) => c.id === def.id);
      return saved ? { ...def, ...saved, isDefault: true } : def;
    });
    return [...mergedDefaults, ...userAdded];
  } catch {
    return [...DEFAULT_ACCOUNTING_CATEGORIES];
  }
}

// ── Save categories ──

export function saveAccountingCategories(categories: AccountingCategory[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

// ── Get categories grouped by CategoryGroup ──

export function getCategoriesByGroup(categories: AccountingCategory[]): Record<CategoryGroup, AccountingCategory[]> {
  const groups: Record<CategoryGroup, AccountingCategory[]> = {
    'Revenue': [],
    'Cost of Services': [],
    'Operating Expenses': [],
    'Other': [],
  };
  for (const cat of categories) {
    if (groups[cat.group]) {
      groups[cat.group].push(cat);
    } else {
      groups['Other'].push(cat);
    }
  }
  // Sort each group by code
  for (const key of Object.keys(groups) as CategoryGroup[]) {
    groups[key].sort((a, b) => a.code - b.code);
  }
  return groups;
}

// ── Map NDIS support category to default revenue accounting category ──

export function getDefaultRevenueCategory(supportCategory: string): AccountingCategory | undefined {
  const lower = (supportCategory || '').toLowerCase();
  if (lower.includes('core') || lower.includes('daily') || lower.includes('social') || lower.includes('consumable')) {
    return DEFAULT_ACCOUNTING_CATEGORIES.find((c) => c.id === 'cat-rev-core');
  }
  if (lower.includes('capacity') || lower.includes('coordination') || lower.includes('improved') || lower.includes('finding')) {
    return DEFAULT_ACCOUNTING_CATEGORIES.find((c) => c.id === 'cat-rev-capacity');
  }
  if (lower.includes('capital') || lower.includes('assistive') || lower.includes('home mod')) {
    return DEFAULT_ACCOUNTING_CATEGORIES.find((c) => c.id === 'cat-rev-capital');
  }
  if (lower.includes('plan manage')) {
    return DEFAULT_ACCOUNTING_CATEGORIES.find((c) => c.id === 'cat-rev-planmgmt');
  }
  if (lower.includes('support coord')) {
    return DEFAULT_ACCOUNTING_CATEGORIES.find((c) => c.id === 'cat-rev-suppcoord');
  }
  if (lower.includes('sil') || lower.includes('independent')) {
    return DEFAULT_ACCOUNTING_CATEGORIES.find((c) => c.id === 'cat-rev-core');
  }
  if (lower.includes('transport')) {
    return DEFAULT_ACCOUNTING_CATEGORIES.find((c) => c.id === 'cat-rev-core');
  }
  return undefined;
}
