import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { resolvePermissions, type Permission } from '@/lib/permissions';

export function usePermissions() {
  const { role, profile } = useAuth();

  const effectivePermissions = useMemo<Permission[]>(() => {
    return resolvePermissions(role, profile?.permissions ?? null);
  }, [role, profile?.permissions]);

  const permissionSet = useMemo(() => new Set(effectivePermissions), [effectivePermissions]);

  /** Check if user has a specific permission */
  const hasPermission = (perm: Permission): boolean => permissionSet.has(perm);

  /** Check if user has ANY of the listed permissions (OR) */
  const hasAnyPermission = (perms: Permission[]): boolean => perms.some((p) => permissionSet.has(p));

  /** Check if user has ALL of the listed permissions (AND) */
  const hasAllPermissions = (perms: Permission[]): boolean => perms.every((p) => permissionSet.has(p));

  return {
    role,
    permissions: effectivePermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,

    // Legacy convenience booleans (backward-compatible)
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isStaff: role === 'staff',
    isClient: role === 'client',
    isGuest: role === 'guest',
    isAdminOrManager: role === 'admin' || role === 'manager',

    // Legacy permission booleans (now backed by granular permissions)
    canViewAllClients: hasPermission('clients.view'),
    canEditClients: hasPermission('clients.edit'),
    canViewAllShifts: hasPermission('roster.view'),

    canManageInvoices: hasAnyPermission(['invoices.create', 'invoices.send', 'invoices.void']),
    canManageClaims: hasAnyPermission(['invoices.create', 'invoices.send']),

    canManageUsers: hasPermission('admin.users'),
    canManageCarers: hasAnyPermission(['carers.create', 'carers.edit']),

    canApproveTimesheets: hasPermission('timesheets.approve'),
    canReviewIncidents: hasAnyPermission(['incidents.view', 'incidents.create']),
    canViewReports: hasPermission('reports.view'),
    canViewCompliance: hasPermission('compliance.view'),

    canUseAiTools: true,
  };
}
