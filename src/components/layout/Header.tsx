import { useLocation } from 'react-router-dom';
import { Search, Bell } from 'lucide-react';

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
  '/settings': { title: 'Settings', breadcrumb: ['Settings'] },
};

export default function Header() {
  const location = useLocation();

  const getPageInfo = () => {
    // Try exact match first
    if (pageTitles[location.pathname]) return pageTitles[location.pathname];
    // Client profile
    if (location.pathname.startsWith('/clients/') && !location.pathname.includes('care-plans')) {
      return { title: 'Client Profile', breadcrumb: ['Clients', 'Profile'] };
    }
    // Invoice edit
    if (location.pathname.match(/\/invoices\/[^/]+\/edit/)) {
      return { title: 'Edit Invoice', breadcrumb: ['Finance', 'Edit Invoice'] };
    }
    return { title: 'Thrive 4 Better', breadcrumb: [] };
  };

  const { title, breadcrumb } = getPageInfo();

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
        <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center ml-1">
          <span className="text-white text-xs font-semibold">AK</span>
        </div>
      </div>
    </header>
  );
}
