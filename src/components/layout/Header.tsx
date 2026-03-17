import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, LogOut, Menu, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type NotificationType = 'shift' | 'invoice' | 'care_plan' | 'timesheet' | 'incident';

interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  type: NotificationType;
  link: string;
}

const TYPE_CONFIG: Record<NotificationType, { label: string; color: string }> = {
  shift: { label: 'Shift', color: 'bg-blue-100 text-blue-700' },
  invoice: { label: 'Invoice', color: 'bg-amber-100 text-amber-700' },
  care_plan: { label: 'Care Plan', color: 'bg-emerald-100 text-emerald-700' },
  timesheet: { label: 'Timesheet', color: 'bg-purple-100 text-purple-700' },
  incident: { label: 'Incident', color: 'bg-red-100 text-red-700' },
};

const initialNotifications: Notification[] = [
  { id: '1', title: 'New shift assigned', description: 'Monday 9:00 AM - 1:00 PM with Sarah Thompson', timestamp: '10 min ago', read: false, type: 'shift', link: '/my-shifts' },
  { id: '2', title: 'Invoice #INV-2026-0042 sent', description: 'Emailed to Plan Manager for James Wilson', timestamp: '1 hour ago', read: false, type: 'invoice', link: '/invoices' },
  { id: '3', title: 'Care plan updated for James Wilson', description: 'Goals section revised by coordinator', timestamp: '2 hours ago', read: false, type: 'care_plan', link: '/clients/care-plans' },
  { id: '4', title: 'Timesheet approved', description: 'Week ending 14 Mar 2026 approved by admin', timestamp: '5 hours ago', read: true, type: 'timesheet', link: '/roster/timesheets' },
  { id: '5', title: 'Incident report submitted', description: 'Minor medication error logged for review', timestamp: 'Yesterday', read: true, type: 'incident', link: '/incidents' },
];

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
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Sign out error:', err);
      // Force navigate even on error since state is already cleared
      navigate('/login');
    }
  };

  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedNotification, setExpandedNotification] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

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
          className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray min-w-[44px] min-h-[44px] flex items-center justify-center"
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
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications((prev) => !prev)}
            className="relative p-2 rounded-lg hover:bg-sage-pale transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell size={20} className="text-mid-gray" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-burgundy text-white text-[10px] font-bold rounded-full px-1">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto top-16 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-xl shadow-xl border border-sage-pale z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-forest/5 border-b border-sage-pale">
                <h3 className="text-sm font-semibold text-charcoal">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-forest hover:text-forest/80 font-medium flex items-center gap-1"
                  >
                    <Check size={12} />
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto divide-y divide-sage-pale/60">
                {notifications.map((n) => {
                  const isExpanded = expandedNotification === n.id;
                  const typeInfo = TYPE_CONFIG[n.type];
                  return (
                    <div key={n.id}>
                      <button
                        onClick={() => {
                          markAsRead(n.id);
                          setExpandedNotification(isExpanded ? null : n.id);
                        }}
                        className={`w-full text-left px-4 py-3 hover:bg-sage-pale/40 transition-colors ${
                          !n.read ? 'bg-forest/[0.03]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {!n.read && (
                            <span className="mt-1.5 w-2 h-2 rounded-full bg-forest flex-shrink-0" />
                          )}
                          <div className={!n.read ? '' : 'ml-4'}>
                            <div className="flex items-center gap-2">
                              <p className={`text-sm ${!n.read ? 'font-semibold text-charcoal' : 'font-medium text-mid-gray'}`}>
                                {n.title}
                              </p>
                            </div>
                            <p className="text-xs text-mid-gray mt-0.5 line-clamp-1">{n.description}</p>
                            <p className="text-[10px] text-mid-gray/70 mt-1">{n.timestamp}</p>
                          </div>
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-3 pt-1 bg-sage-pale/20 border-t border-sage-pale/40">
                          <div className="ml-4 space-y-2">
                            <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            <p className="text-xs text-charcoal">{n.description}</p>
                            <p className="text-[10px] text-mid-gray">{n.timestamp}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowNotifications(false);
                                setExpandedNotification(null);
                                navigate(n.link);
                              }}
                              className="inline-flex items-center gap-1 text-xs font-medium text-forest hover:text-forest-mid transition-colors mt-1"
                            >
                              <ExternalLink size={12} />
                              Go to {typeInfo.label}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {notifications.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-mid-gray">No notifications</div>
              )}
            </div>
          )}
        </div>
        <div className="hidden md:flex items-center gap-2 ml-1 lg:ml-2">
          <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <span className="text-sm text-charcoal hidden xl:block max-w-[120px] truncate">{userName}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="p-2 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray hover:text-burgundy min-w-[44px] min-h-[44px] flex items-center justify-center"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
