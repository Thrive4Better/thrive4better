import type { UserRole } from '@/types';

/** Every granular permission in the system. */
export const ALL_PERMISSIONS = {
  // Dashboard
  'dashboard.view': 'View Dashboard',

  // Clients
  'clients.view': 'View Clients',
  'clients.create': 'Create Clients',
  'clients.edit': 'Edit Clients',
  'clients.delete': 'Delete Clients',
  'clients.archive': 'Archive Clients',

  // Care Plans
  'careplans.view': 'View Care Plans',
  'careplans.create': 'Create Care Plans',
  'careplans.edit': 'Edit Care Plans',
  'careplans.ai_generate': 'Generate AI Support Plans',

  // Roster
  'roster.view': 'View Roster',
  'roster.create': 'Create Shifts',
  'roster.edit': 'Edit Shifts',
  'roster.delete': 'Delete Shifts',
  'roster.send_reminders': 'Send SMS Reminders',

  // Carers
  'carers.view': 'View Carers',
  'carers.create': 'Create Carers',
  'carers.edit': 'Edit Carers',

  // Timesheets
  'timesheets.view': 'View Timesheets',
  'timesheets.approve': 'Approve Timesheets',

  // Invoices
  'invoices.view': 'View Invoices',
  'invoices.create': 'Create Invoices',
  'invoices.send': 'Send Invoices',
  'invoices.void': 'Void Invoices',

  // Accounting
  'accounting.view': 'View Accounting',
  'accounting.edit': 'Edit Transactions',
  'accounting.bas': 'Manage BAS',

  // Compliance
  'compliance.view': 'View Compliance',
  'compliance.edit': 'Edit Compliance Records',
  'incidents.view': 'View Incidents',
  'incidents.create': 'Report Incidents',

  // Reports
  'reports.view': 'View Reports',
  'reports.export': 'Export Reports',

  // Documents
  'documents.view': 'View Documents',
  'documents.upload': 'Upload Documents',

  // Payroll
  'payroll.view': 'View Payroll',
  'payroll.run': 'Run Payroll',

  // Admin
  'admin.users': 'Manage Users',
  'admin.settings': 'System Settings',
} as const;

export type Permission = keyof typeof ALL_PERMISSIONS;

/** All permission keys as an array */
export const ALL_PERMISSION_KEYS = Object.keys(ALL_PERMISSIONS) as Permission[];

/** Permissions grouped by section for the UI */
export const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  {
    label: 'Dashboard',
    permissions: ['dashboard.view'],
  },
  {
    label: 'Clients',
    permissions: ['clients.view', 'clients.create', 'clients.edit', 'clients.delete', 'clients.archive'],
  },
  {
    label: 'Care Plans',
    permissions: ['careplans.view', 'careplans.create', 'careplans.edit', 'careplans.ai_generate'],
  },
  {
    label: 'Roster',
    permissions: ['roster.view', 'roster.create', 'roster.edit', 'roster.delete', 'roster.send_reminders'],
  },
  {
    label: 'Carers',
    permissions: ['carers.view', 'carers.create', 'carers.edit'],
  },
  {
    label: 'Timesheets',
    permissions: ['timesheets.view', 'timesheets.approve'],
  },
  {
    label: 'Invoices',
    permissions: ['invoices.view', 'invoices.create', 'invoices.send', 'invoices.void'],
  },
  {
    label: 'Accounting',
    permissions: ['accounting.view', 'accounting.edit', 'accounting.bas'],
  },
  {
    label: 'Compliance & Safety',
    permissions: ['compliance.view', 'compliance.edit', 'incidents.view', 'incidents.create'],
  },
  {
    label: 'Documents',
    permissions: ['documents.view', 'documents.upload'],
  },
  {
    label: 'Reports',
    permissions: ['reports.view', 'reports.export'],
  },
  {
    label: 'Payroll',
    permissions: ['payroll.view', 'payroll.run'],
  },
  {
    label: 'Admin',
    permissions: ['admin.users', 'admin.settings'],
  },
];

/** Default permissions per role */
export const ROLE_DEFAULTS: Record<UserRole, Permission[]> = {
  admin: [...ALL_PERMISSION_KEYS],
  manager: ALL_PERMISSION_KEYS.filter((p) => !p.startsWith('admin.') && p !== 'payroll.run'),
  staff: [
    'dashboard.view',
    'clients.view',
    'careplans.view',
    'roster.view',
    'timesheets.view',
    'incidents.create',
    'incidents.view',
    'documents.view',
  ],
  client: [
    'dashboard.view',
    'careplans.view',
    'documents.view',
  ],
  guest: [],
};

/**
 * Resolve the effective permissions for a user.
 * If custom permissions are set (non-null array in profile), use those.
 * Otherwise fall back to role defaults.
 * Guest role with no custom permissions gets an empty array (no access).
 */
export function resolvePermissions(
  role: UserRole,
  customPermissions: Permission[] | null | undefined,
): Permission[] {
  if (customPermissions && customPermissions.length > 0) {
    return customPermissions;
  }
  return ROLE_DEFAULTS[role] ?? [];
}

/**
 * Map a route path to the permission(s) required to access it.
 * Returns null if the route is accessible to all authenticated users.
 */
export const ROUTE_PERMISSIONS: Record<string, Permission | Permission[]> = {
  '/dashboard': 'dashboard.view',
  '/clients': 'clients.view',
  '/clients/care-plans': 'careplans.view',
  '/roster': 'roster.view',
  '/roster/shifts': 'roster.view',
  '/roster/carers': 'carers.view',
  '/roster/timesheets': 'timesheets.approve',
  '/invoices': 'invoices.view',
  '/invoices/new': 'invoices.create',
  '/invoices/rates': 'invoices.view',
  '/invoices/claims': 'invoices.view',
  '/contractor-invoices': 'invoices.view',
  '/compliance': 'compliance.view',
  '/incidents': 'incidents.view',
  '/reports': 'reports.view',
  '/documents': 'documents.view',
  '/payroll': 'payroll.view',
  '/payroll/new': 'payroll.run',
  '/accounting/chart-of-accounts': 'accounting.view',
  '/accounting/transactions': 'accounting.view',
  '/accounting/reconciliation': 'accounting.view',
  '/accounting/bas': 'accounting.bas',
  '/accounting/profit-and-loss': 'accounting.view',
  '/accounting/balance-sheet': 'accounting.view',
  '/accounting/cash-flow': 'accounting.view',
  '/admin/users': 'admin.users',
  '/admin/onboarding': 'admin.users',
  '/settings': 'admin.settings',
  // Client portal routes
  '/my-profile': 'dashboard.view',
  '/my-care-plan': 'careplans.view',
  '/rate-activities': 'dashboard.view',
  // Staff routes
  '/my-shifts': 'roster.view',
  '/my-timesheet': 'timesheets.view',
  '/log-shift': 'roster.view',
  '/contractor-invoice': 'invoices.view',
  // AI tools - accessible to anyone with dashboard access
  '/tools/ideas': 'dashboard.view',
  '/tools/idea-generator': 'dashboard.view',
  '/tools/support-plans': 'dashboard.view',
};
