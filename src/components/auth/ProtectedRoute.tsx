import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/stores/useStore';
import type { UserRole } from '@/types';

interface Props {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: Props) {
  const { user, loading: authLoading, role } = useAuth();
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
    });
  }, [authLoading, user, isInitialized, isLoading, role, location.pathname]);

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

  if (allowedRoles && !allowedRoles.includes(role)) {
    console.log('[ProtectedRoute] Role not allowed:', role, 'required:', allowedRoles);
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
