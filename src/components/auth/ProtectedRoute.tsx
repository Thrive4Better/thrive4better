import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/stores/useStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { UserRole } from '@/types';
import type { Permission } from '@/lib/permissions';
import { ROUTE_PERMISSIONS } from '@/lib/permissions';

interface Props {
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
}

export default function ProtectedRoute({ allowedRoles, requiredPermission }: Props) {
  const { user, loading: authLoading, role, profile } = useAuth();
  const { permissions, hasPermission, hasAnyPermission } = usePermissions();
  const initialize = useStore((s) => s.initialize);
  const isInitialized = useStore((s) => s.isInitialized);
  const isLoading = useStore((s) => s.isLoading);
  const location = useLocation();

  useEffect(() => {
    if (user && !isInitialized) {
      console.log('[ProtectedRoute] User authenticated, initializing store...');
      initialize().catch((err) => {
        console.error('[ProtectedRoute] Store init failed:', err);
      });
    }
  }, [user, isInitialized, initialize]);

  // Log state for debugging
  useEffect(() => {
    console.log('[ProtectedRoute]', {
      path: location.pathname,
      authLoading,
      hasUser: !!user,
      isInitialized,
      isLoading,
      role,
      permissionCount: permissions.length,
    });
  }, [authLoading, user, isInitialized, isLoading, role, location.pathname, permissions.length]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-4">
        <svg className="animate-spin h-10 w-10 text-forest" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-mid-gray">Checking authentication...</p>
      </div>
    );
  }

  if (!user) {
    console.log('[ProtectedRoute] No user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (user && !isInitialized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-4">
        <svg className="animate-spin h-10 w-10 text-forest" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-mid-gray">Loading data...</p>
      </div>
    );
  }

  // Check if user account is deactivated
  if (profile && !profile.isActive) {
    console.log('[ProtectedRoute] User is deactivated');
    return <Navigate to="/no-access" replace />;
  }

  // Guest with zero permissions -> no access page
  if (role === 'guest' && permissions.length === 0) {
    console.log('[ProtectedRoute] Guest with no permissions, redirecting to /no-access');
    return <Navigate to="/no-access" replace />;
  }

  // Check explicit requiredPermission prop
  if (requiredPermission && !hasPermission(requiredPermission)) {
    console.log('[ProtectedRoute] Missing required permission:', requiredPermission);
    return <Navigate to="/no-access" replace />;
  }

  // Check allowedRoles (legacy support, still works alongside permissions)
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Also allow if the user has the route's permission even if role doesn't match
    const routePerm = ROUTE_PERMISSIONS[location.pathname];
    const hasRoutePerm = routePerm
      ? Array.isArray(routePerm)
        ? hasAnyPermission(routePerm)
        : hasPermission(routePerm)
      : false;

    if (!hasRoutePerm) {
      console.log('[ProtectedRoute] Role not allowed:', role, 'required:', allowedRoles);
      return <Navigate to="/no-access" replace />;
    }
  }

  // Check route-level permissions based on current path
  const routePerm = ROUTE_PERMISSIONS[location.pathname];
  if (routePerm) {
    const allowed = Array.isArray(routePerm)
      ? hasAnyPermission(routePerm)
      : hasPermission(routePerm);

    if (!allowed) {
      console.log('[ProtectedRoute] Route permission denied for:', location.pathname, 'requires:', routePerm);
      return <Navigate to="/no-access" replace />;
    }
  }

  return <Outlet />;
}
