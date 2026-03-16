import { useLocation } from 'react-router-dom';
import { Search, Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const pageTitles: Record<string, { title: string; breadcrumb: string[] }> = {
  '/dashboard': { title: 'Dashboard', breadcrumb: ['Overview'] },
  '/': { title: 'Dashboard', breadcrumb: ['Overview'] },
  '/clients': { title: 'All Clients', breadcrumb: ['Clients'] },
  '/clients/care-plans': { title: 'Care Plans', breadcrumb: ['Clients', 'Care Plans'] },
  '/roster': { title: 'Weekly Roster', breadcrumb: ['Roster'] },
  '/roster/shifts': { title: 'Shifts', breadcrumb: ['Roster', 'Shifts'] },
  '/roster/carers': { title: 'Carers', breadcrumb: ['Roster', 'Carers'] },
  '/invoices': { title: 'Invoices', breadcrumb: ['Finance'] },
  '/invoices/new': { title: 'Invoice Builder', breadcrumb: ['Finance', 'New Invoice'] },
  '/invoices/rates': { title: 'NDIS Rates', breadcrumb: ['Finance', 'Rates'] },
  '/invoices/claims': { title: 'Claim Tracker', breadcrumb: ['Finance', 'Claims'] },
  '/roster/timesheets': { title: 'Timesheets', breadcrumb: ['Roster', 'Timesheets'] },
  '/incidents': { title: 'Incident Reports', breadcrumb: ['Compliance', 'Incidents'] },
  '/incidents/new': { title: 'Report Incident', breadcrumb: ['Compliance', 'New Incident'] },
  '/compliance': { title: 'Compliance Tracker', breadcrumb: ['Compliance'] },
  '/reports': { title: 'Reports', breadcrumb: ['Reports'] },
  '/tools/ideas': { title: 'Idea Generator', breadcrumb: ['AI Tools'] },
  '/tools/idea-generator': { title: 'Idea Generator', breadcrumb: ['AI Tools'] },
  '/my-shifts': { title: 'My Shifts', breadcrumb: ['My Work'] },
  '/my-timesheet': { title: 'My Timesheet', breadcrumb: ['My Work'] },
  '/admin/users': { title: 'User Management', breadcrumb: ['Admin'] },
  '/settings': { title: 'Settings', breadcrumb: ['Settings'] },
};

export default function Header() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const getPageInfo = () => {
    if (pageTitles[location.pathname]) return pageTitles[location.pathname];
    if (location.pathname.startsWith('/clients/') && !location.pathname.includes('care-plans')) {
      return { title: 'Client Profile', breadcrumb: ['Clients', 'Profile'] };
    }
    if (location.pathname.match(/\/invoices\/[^/]+\/edit/)) {
      return { title: 'Edit Invoice', breadcrumb: ['Finance', 'Edit Invoice'] };
    }
    return { title: 'Thrive 4 Better', breadcrumb: [] };
  };

  const { title, breadcrumb } = getPageInfo();

  const userName = user?.user_metadata?.full_name || user?.email || 'User';
  const initials = userName
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() || '')
    .join('');

  return (
    <header className="h-16 bg-white border-b border-sage-pale flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-mid-gray">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span>/</span>}
                {crumb}
              </span>
            ))}
          </div>
          <h2 className="text-lg font-semibold text-charcoal leading-tight">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 rounded-lg bg-sage-pale/50 border-0 text-sm text-charcoal placeholder:text-mid-gray focus:outline-none focus:ring-2 focus:ring-forest/20 w-64"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-sage-pale transition-colors">
          <Bell size={20} className="text-mid-gray" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-burgundy rounded-full" />
        </button>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <span className="text-sm text-charcoal hidden xl:block max-w-[120px] truncate">{userName}</span>
        </div>
        <button
          onClick={signOut}
          className="p-2 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-burgundy"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
