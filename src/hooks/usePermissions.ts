import { useAuth } from '@/contexts/AuthContext';

export function usePermissions() {
  const { role } = useAuth();

  return {
    role,
    isAdmin: role === 'admin',
    isManager: role === 'manager',
    isStaff: role === 'staff',
    isAdminOrManager: role === 'admin' || role === 'manager',

    // Data access
    canViewAllClients: role !== 'staff',
    canEditClients: role !== 'staff',
    canViewAllShifts: role !== 'staff',

    // Finance
    canManageInvoices: role !== 'staff',
    canManageClaims: role !== 'staff',

    // People
    canManageUsers: role === 'admin',
    canManageCarers: role !== 'staff',

    // Operations
    canApproveTimesheets: role !== 'staff',
    canReviewIncidents: role !== 'staff',
    canViewReports: role !== 'staff',
    canViewCompliance: role !== 'staff',

    // AI tools available to everyone
    canUseAiTools: true,
  };
}
