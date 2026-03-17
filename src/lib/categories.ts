// ── NDIS Support Categories ──
// Based on NDIS Price Guide categories

export const NDIS_SUPPORT_CATEGORIES = [
  'Core - Assistance with Daily Life',
  'Core - Transport',
  'Core - Consumables',
  'Core - Assistance with Social & Community Participation',
  'Capacity Building - Support Coordination',
  'Capacity Building - Improved Living Arrangements',
  'Capacity Building - Increased Social & Community Participation',
  'Capacity Building - Finding & Keeping a Job',
  'Capacity Building - Improved Relationships',
  'Capacity Building - Improved Health & Wellbeing',
  'Capacity Building - Improved Learning',
  'Capacity Building - Improved Life Choices',
  'Capacity Building - Improved Daily Living',
  'Capital - Assistive Technology',
  'Capital - Home Modifications',
  'SIL - Supported Independent Living',
] as const;

export type NdisSupportCategory = typeof NDIS_SUPPORT_CATEGORIES[number];

// ── Service Types ──

export const SERVICE_TYPES = [
  'Daily Living',
  'Community Access',
  'SIL',
  'Transport',
  'Social/Rec',
  'Other',
] as const;

// ── Accounting Categories (Xero-style) ──
// Used for transaction categorisation

export const EXPENSE_CATEGORIES = [
  // Wages & People
  { value: 'wages', label: 'Wages & Salaries', group: 'People' },
  { value: 'super', label: 'Superannuation', group: 'People' },
  { value: 'workers_comp', label: 'Workers Compensation', group: 'People' },
  { value: 'staff_training', label: 'Staff Training & Development', group: 'People' },
  { value: 'recruitment', label: 'Recruitment Costs', group: 'People' },
  // Operating
  { value: 'rent', label: 'Rent / Lease Payments', group: 'Operating' },
  { value: 'utilities', label: 'Utilities (Electricity, Gas, Water)', group: 'Operating' },
  { value: 'phone_internet', label: 'Telephone & Internet', group: 'Operating' },
  { value: 'office_supplies', label: 'Office Supplies & Stationery', group: 'Operating' },
  { value: 'software', label: 'Software & Subscriptions', group: 'Operating' },
  { value: 'cleaning', label: 'Cleaning & Maintenance', group: 'Operating' },
  // Vehicle
  { value: 'fuel', label: 'Fuel & Mileage', group: 'Vehicle' },
  { value: 'vehicle_maintenance', label: 'Vehicle Maintenance & Repairs', group: 'Vehicle' },
  { value: 'vehicle_lease', label: 'Vehicle Lease / Loan Payments', group: 'Vehicle' },
  { value: 'vehicle_rego', label: 'Vehicle Registration & Insurance', group: 'Vehicle' },
  { value: 'tolls_parking', label: 'Tolls & Parking', group: 'Vehicle' },
  // Professional
  { value: 'accounting', label: 'Accounting & Bookkeeping', group: 'Professional' },
  { value: 'legal', label: 'Legal Fees', group: 'Professional' },
  { value: 'ndis_audit', label: 'NDIS Audit & Compliance', group: 'Professional' },
  { value: 'consulting', label: 'Consulting & Advisory', group: 'Professional' },
  // Insurance
  { value: 'public_liability', label: 'Public Liability Insurance', group: 'Insurance' },
  { value: 'professional_indemnity', label: 'Professional Indemnity Insurance', group: 'Insurance' },
  { value: 'business_insurance', label: 'Business Insurance (General)', group: 'Insurance' },
  // Marketing
  { value: 'advertising', label: 'Advertising & Marketing', group: 'Marketing' },
  { value: 'website', label: 'Website & Domain Costs', group: 'Marketing' },
  // Finance
  { value: 'bank_fees', label: 'Bank Fees & Charges', group: 'Finance' },
  { value: 'merchant_fees', label: 'Merchant / Payment Processing Fees', group: 'Finance' },
  { value: 'interest_paid', label: 'Interest Paid on Loans', group: 'Finance' },
  { value: 'loan_repayment', label: 'Loan Repayments (Principal)', group: 'Finance' },
  // Other
  { value: 'depreciation', label: 'Depreciation', group: 'Other' },
  { value: 'donations', label: 'Donations & Gifts', group: 'Other' },
  { value: 'fines_penalties', label: 'Fines & Penalties', group: 'Other' },
  { value: 'sundry', label: 'Sundry / Miscellaneous', group: 'Other' },
] as const;

export const REVENUE_CATEGORIES = [
  // NDIS Revenue
  { value: 'ndis_core', label: 'NDIS Core Support Income', group: 'NDIS Revenue' },
  { value: 'ndis_capacity', label: 'NDIS Capacity Building Income', group: 'NDIS Revenue' },
  { value: 'ndis_capital', label: 'NDIS Capital Support Income', group: 'NDIS Revenue' },
  { value: 'ndis_sil', label: 'SIL Income', group: 'NDIS Revenue' },
  { value: 'ndis_community', label: 'Community Access Income', group: 'NDIS Revenue' },
  { value: 'ndis_transport', label: 'Transport Income', group: 'NDIS Revenue' },
  // Other Revenue
  { value: 'interest_income', label: 'Interest Income', group: 'Other Revenue' },
  { value: 'grant_income', label: 'Grants & Subsidies', group: 'Other Revenue' },
  { value: 'other_income', label: 'Other Income', group: 'Other Revenue' },
] as const;

// All categories combined for general use
export const ALL_CATEGORIES = [
  ...REVENUE_CATEGORIES.map(c => ({ ...c, type: 'revenue' as const })),
  ...EXPENSE_CATEGORIES.map(c => ({ ...c, type: 'expense' as const })),
];

// ── GST Status ──

export const GST_OPTIONS = [
  { value: 'gst_free', label: 'GST Free (NDIS)' },
  { value: 'gst_inclusive', label: 'GST Inclusive (10%)' },
  { value: 'gst_exclusive', label: 'GST Exclusive' },
  { value: 'bas_excluded', label: 'BAS Excluded' },
  { value: 'input_taxed', label: 'Input Taxed' },
] as const;

// ── Payment Terms ──

export const PAYMENT_TERMS = [
  { value: 7, label: '7 Days' },
  { value: 14, label: '14 Days' },
  { value: 21, label: '21 Days' },
  { value: 30, label: '30 Days' },
  { value: 60, label: '60 Days' },
  { value: 90, label: '90 Days' },
] as const;
