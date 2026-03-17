import { useLocation } from 'react-router-dom';
import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onToggleSidebar: () => void;
}

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
  '/accounting/chart-of-accounts': { title: 'Chart of Accounts', breadcrumb: ['Accounting', 'Chart of Accounts'] },
  '/accounting/transactions': { title: 'Transactions', breadcrumb: ['Accounting', 'Transactions'] },
  '/accounting/reconciliation': { title: 'Bank Reconciliation', breadcrumb: ['Accounting', 'Reconciliation'] },
  '/accounting/bas': { title: 'BAS / GST Report', breadcrumb: ['Accounting', 'BAS / GST'] },
  '/accounting/profit-and-loss': { title: 'Profit & Loss', breadcrumb: ['Accounting', 'Profit & Loss'] },
  '/accounting/balance-sheet': { title: 'Balance Sheet', breadcrumb: ['Accounting', 'Balance Sheet'] },
  '/accounting/cash-flow': { title: 'Cash Flow Statement', breadcrumb: ['Accounting', 'Cash Flow'] },
  '/tools/support-plans': { title: 'AI Support Plans', breadcrumb: ['AI Tools', 'Support Plans'] },
  '/payroll': { title: 'Payroll Dashboard', breadcrumb: ['Payroll'] },
  '/payroll/new': { title: 'New Pay Run', breadcrumb: ['Payroll', 'New Pay Run'] },
  '/log-shift': { title: 'Log Shift', breadcrumb: ['My Work', 'Log Shift'] },
  '/documents': { title: 'Document Library', breadcrumb: ['Documents'] },
  '/admin/onboarding': { title: 'Employee Onboarding', breadcrumb: ['Admin', 'Onboarding'] },
};

export default function Header({ onToggleSidebar }: HeaderProps) {
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
    if (location.pathname.match(/\/payroll\/[^/]+/) && location.pathname !== '/payroll/new') {
      return { title: 'Pay Run Details', breadcrumb: ['Payroll', 'Pay Run'] };
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
    <header className="h-14 lg:h-16 bg-white border-b border-sage-pale flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger - mobile only */}
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray"
          aria-label="Open sidebar"
        >
          <Menu size={22} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-mid-gray truncate">
            {breadcrumb.map((crumb, i) => (
              <span key={i} className="flex items-center gap-2 whitespace-nowrap">
                {i > 0 && <span>/</span>}
                {crumb}
              </span>
            ))}
          </div>
          <h2 className="text-base lg:text-lg font-semibold text-charcoal leading-tight truncate">{title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
        {/* Search - hidden on small mobile, shown from sm up */}
        <div className="relative hidden sm:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-mid-gray" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 rounded-lg bg-sage-pale/50 border-0 text-sm text-charcoal placeholder:text-mid-gray focus:outline-none focus:ring-2 focus:ring-forest/20 w-40 lg:w-64"
          />
        </div>
        <button className="relative p-2 rounded-lg hover:bg-sage-pale transition-colors">
          <Bell size={20} className="text-mid-gray" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-burgundy rounded-full" />
        </button>
        <div className="hidden md:flex items-center gap-2 ml-1 lg:ml-2">
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
