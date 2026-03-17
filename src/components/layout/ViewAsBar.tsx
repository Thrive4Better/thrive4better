import { Eye, X, Users, Briefcase, UserCheck, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

const PREVIEW_ROLES: { value: UserRole; label: string; icon: typeof User }[] = [
  { value: 'manager', label: 'Manager', icon: Briefcase },
  { value: 'staff', label: 'Staff / Carer', icon: UserCheck },
  { value: 'client', label: 'Client', icon: User },
  { value: 'guest', label: 'Guest', icon: Users },
];

export default function ViewAsBar() {
  const { actualRole, viewAsRole, setViewAsRole } = useAuth();

  // Only show for admins
  if (actualRole !== 'admin') return null;

  // When not previewing, show a compact switcher
  if (!viewAsRole) {
    return (
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2">
          <Eye size={14} className="flex-shrink-0" />
          <span className="font-medium hidden sm:inline">Preview as:</span>
          <span className="font-medium sm:hidden">View as:</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
          {PREVIEW_ROLES.map((r) => {
            const Icon = r.icon;
            return (
              <button
                key={r.value}
                onClick={() => setViewAsRole(r.value)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/15 hover:bg-white/25 transition-colors text-xs font-medium"
              >
                <Icon size={12} />
                {r.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // When previewing, show a prominent banner
  const activeRole = PREVIEW_ROLES.find((r) => r.value === viewAsRole);
  const Icon = activeRole?.icon ?? User;

  return (
    <div className="bg-amber-500 text-white px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 shadow-md">
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <Eye size={16} className="flex-shrink-0" />
        <span className="font-semibold">
          Previewing as {activeRole?.label ?? viewAsRole}
        </span>
        <span className="hidden sm:inline text-white/80">
          — You're seeing the app as a {viewAsRole} would see it
        </span>
      </div>
      <div className="flex items-center gap-2">
        {/* Quick switch to other roles */}
        <div className="hidden sm:flex items-center gap-1">
          {PREVIEW_ROLES.filter((r) => r.value !== viewAsRole).map((r) => {
            const RIcon = r.icon;
            return (
              <button
                key={r.value}
                onClick={() => setViewAsRole(r.value)}
                className="flex items-center gap-1 px-2 py-1 rounded bg-white/15 hover:bg-white/25 transition-colors text-xs"
              >
                <RIcon size={11} />
                {r.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => setViewAsRole(null)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-white text-amber-700 hover:bg-amber-50 transition-colors text-xs font-semibold"
        >
          <X size={12} />
          Exit Preview
        </button>
      </div>
    </div>
  );
}
