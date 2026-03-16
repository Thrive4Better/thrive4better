import { useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/stores/useStore';

export default function ProtectedRoute() {
  const { user, loading: authLoading } = useAuth();
  const initialize = useStore((s) => s.initialize);
  const isInitialized = useStore((s) => s.isInitialized);
  const isLoading = useStore((s) => s.isLoading);

  useEffect(() => {
    if (user && !isInitialized) {
      initialize().catch(() => {});
    }
  }, [user, isInitialized, initialize]);

  if (authLoading || (user && !isInitialized) || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream gap-4">
        <svg
          className="animate-spin h-10 w-10 text-forest"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <p className="text-sm text-mid-gray">
          {authLoading ? 'Checking authentication...' : 'Loading data...'}
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
