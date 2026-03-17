import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  Clock,
  UserCheck,
  FileText,
  Settings,
  AlertTriangle,
  ShieldCheck,
  Timer,
  Receipt,
  BarChart3,
  Sparkles,
  UserCog,
  Landmark,
  ArrowLeftRight,
  CheckCircle,
  FileSpreadsheet,
  TrendingUp,
  Scale,
  Banknote,
  X,
  Wallet,
  CreditCard,
  FolderOpen,
  UserPlus,
  Star,
  User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { Permission } from '@/lib/permissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const { user, role } = useAuth();
  const { hasPermission, hasAnyPermission } = usePermissions();

  const userName = user?.user_metadata?.full_name || user?.email || 'User';
  const initials = userName
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() || '')
    .join('');

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    if (path === '/clients') return location.pathname === '/clients' || location.pathname.startsWith('/clients/') && !location.pathname.includes('care-plans');
    if (path === '/roster') return location.pathname === '/roster' && !location.pathname.includes('/shifts') && !location.pathname.includes('/carers') && !location.pathname.includes('/timesheets');
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  type NavItem = { to: string; icon: typeof LayoutDashboard; label: string; permission?: Permission };
  type NavSection = { label: string; color: string; dotColor: string; items: NavItem[] };

  // Color-coded sections for visual navigation
  const sectionColors: Record<string, { color: string; dotColor: string }> = {
    OVERVIEW:               { color: 'text-forest',       dotColor: 'bg-forest' },
    'MY PORTAL':            { color: 'text-teal-600',     dotColor: 'bg-teal-500' },
    CLIENTS:                { color: 'text-blue-600',     dotColor: 'bg-blue-500' },
    ROSTER:                 { color: 'text-violet-600',   dotColor: 'bg-violet-500' },
    'COMPLIANCE & SAFETY':  { color: 'text-amber-600',    dotColor: 'bg-amber-500' },
    FINANCE:                { color: 'text-emerald-600',  dotColor: 'bg-emerald-500' },
    PAYROLL:                { color: 'text-pink-600',     dotColor: 'bg-pink-500' },
    DOCUMENTS:              { color: 'text-cyan-600',     dotColor: 'bg-cyan-500' },
    ACCOUNTING:             { color: 'text-teal-600',     dotColor: 'bg-teal-500' },
    REPORTS:                { color: 'text-indigo-600',   dotColor: 'bg-indigo-500' },
    'AI TOOLS':             { color: 'text-purple-600',   dotColor: 'bg-purple-500' },
    ADMIN:                  { color: 'text-rose-600',     dotColor: 'bg-rose-500' },
  };

  const navSections: NavSection[] = [];

  // Overview - always show if user has dashboard permission
  navSections.push({
    label: 'OVERVIEW',
    ...sectionColors.OVERVIEW,
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard.view' },
    ],
  });

  // Client portal section - show for client role
  if (role === 'client') {
    navSections.push({
      label: 'MY PORTAL',
      ...sectionColors['MY PORTAL'],
      items: [
        { to: '/my-profile', icon: User, label: 'My Profile', permission: 'dashboard.view' },
        { to: '/my-care-plan', icon: ClipboardList, label: 'My Care Plan', permission: 'careplans.view' },
        { to: '/rate-activities', icon: Star, label: 'Rate Activities', permission: 'dashboard.view' },
        { to: '/documents', icon: FolderOpen, label: 'My Documents', permission: 'documents.view' },
      ],
    });
  }

  // Clients section
  if (hasPermission('clients.view')) {
    navSections.push({
      label: 'CLIENTS',
      ...sectionColors.CLIENTS,
      items: [
        { to: '/clients', icon: Users, label: 'All Clients', permission: 'clients.view' },
        { to: '/clients/care-plans', icon: ClipboardList, label: 'Care Plans', permission: 'careplans.view' },
      ],
    });
  }

  // Roster section
  if (hasPermission('roster.view')) {
    const rosterItems: NavItem[] = [
      { to: '/roster', icon: Calendar, label: 'Weekly Roster', permission: 'roster.view' },
      { to: '/roster/shifts', icon: Clock, label: 'Shifts', permission: 'roster.view' },
      { to: '/roster/carers', icon: UserCheck, label: 'Carers', permission: 'carers.view' },
    ];
    if (hasPermission('timesheets.approve')) {
      rosterItems.push({ to: '/roster/timesheets', icon: Timer, label: 'Timesheets', permission: 'timesheets.approve' });
    }
    navSections.push({
      label: 'ROSTER',
      ...sectionColors.ROSTER,
      items: rosterItems,
    });
  }

  // Compliance & Safety
  if (hasAnyPermission(['compliance.view', 'incidents.view'])) {
    navSections.push({
      label: 'COMPLIANCE & SAFETY',
      ...sectionColors['COMPLIANCE & SAFETY'],
      items: [
        { to: '/incidents', icon: AlertTriangle, label: 'Incidents', permission: 'incidents.view' },
        { to: '/compliance', icon: ShieldCheck, label: 'Compliance Tracker', permission: 'compliance.view' },
      ],
    });
  }

  // Finance
  if (hasPermission('invoices.view')) {
    navSections.push({
      label: 'FINANCE',
      ...sectionColors.FINANCE,
      items: [
        { to: '/invoices', icon: FileText, label: 'Invoices', permission: 'invoices.view' },
        { to: '/contractor-invoices', icon: Receipt, label: 'Contractor Invoices', permission: 'invoices.view' },
        { to: '/invoices/claims', icon: Receipt, label: 'Claim Tracker', permission: 'invoices.view' },
      ],
    });
  }

  // Payroll
  if (hasPermission('payroll.view')) {
    navSections.push({
      label: 'PAYROLL',
      ...sectionColors.PAYROLL,
      items: [
        { to: '/payroll', icon: Wallet, label: 'Pay Runs', permission: 'payroll.view' },
        { to: '/payroll/new', icon: CreditCard, label: 'New Pay Run', permission: 'payroll.run' },
      ],
    });
  }

  // Accounting
  if (hasPermission('accounting.view')) {
    navSections.push({
      label: 'ACCOUNTING',
      ...sectionColors.ACCOUNTING,
      items: [
        { to: '/accounting/chart-of-accounts', icon: Landmark, label: 'Chart of Accounts', permission: 'accounting.view' },
        { to: '/accounting/transactions', icon: ArrowLeftRight, label: 'Transactions', permission: 'accounting.view' },
        { to: '/accounting/reconciliation', icon: CheckCircle, label: 'Bank Reconciliation', permission: 'accounting.view' },
        { to: '/accounting/bas', icon: FileSpreadsheet, label: 'BAS / GST', permission: 'accounting.bas' },
        { to: '/accounting/profit-and-loss', icon: TrendingUp, label: 'Profit & Loss', permission: 'accounting.view' },
        { to: '/accounting/balance-sheet', icon: Scale, label: 'Balance Sheet', permission: 'accounting.view' },
        { to: '/accounting/cash-flow', icon: Banknote, label: 'Cash Flow', permission: 'accounting.view' },
      ],
    });
  }

  // Reports
  if (hasPermission('reports.view')) {
    navSections.push({
      label: 'REPORTS',
      ...sectionColors.REPORTS,
      items: [
        { to: '/reports', icon: BarChart3, label: 'Reports & Analytics', permission: 'reports.view' },
      ],
    });
  }

  // Documents (for non-client roles - clients see it in MY PORTAL)
  if (role !== 'client' && hasPermission('documents.view')) {
    navSections.push({
      label: 'DOCUMENTS',
      ...sectionColors.DOCUMENTS,
      items: [
        { to: '/documents', icon: FolderOpen, label: 'Document Library', permission: 'documents.view' },
      ],
    });
  }

  // AI Tools
  if (hasPermission('dashboard.view')) {
    navSections.push({
      label: 'AI TOOLS',
      ...sectionColors['AI TOOLS'],
      items: [
        { to: '/tools/ideas', icon: Sparkles, label: 'Activity Ideas' },
      ],
    });
  }

  // Admin
  if (hasPermission('admin.users')) {
    navSections.push({
      label: 'ADMIN',
      ...sectionColors.ADMIN,
      items: [
        { to: '/admin/users', icon: UserCog, label: 'User Management', permission: 'admin.users' },
        { to: '/admin/onboarding', icon: UserPlus, label: 'Onboarding', permission: 'admin.users' },
      ],
    });
  }

  return (
    <aside
      className={`w-60 bg-white border-r border-sage-pale flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:z-30
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* Logo + mobile close */}
      <div className="px-5 py-5 border-b border-sage-pale">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-forest rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T4B</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-charcoal leading-tight">Thrive 4 Better</h1>
              <p className="text-[11px] text-mid-gray leading-tight">NDIS Support Services</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section) => {
          // Filter items by permission
          const visibleItems = section.items.filter((item) => {
            if (!item.permission) return true;
            return hasPermission(item.permission);
          });
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label} className="mb-5">
              <div className="flex items-center gap-2 px-3 mb-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${section.dotColor} flex-shrink-0`} />
                <p className={`text-[10px] font-semibold tracking-widest uppercase ${section.color}`}>
                  {section.label}
                </p>
              </div>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-100 mb-0.5 ${
                      active
                        ? 'bg-sage-pale text-forest'
                        : 'text-mid-gray hover:bg-sage-pale/50 hover:text-charcoal'
                    }`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Settings + User */}
      <div className="border-t border-sage-pale p-3">
        {hasPermission('admin.settings') && (
          <NavLink
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-100 ${
              location.pathname === '/settings'
                ? 'bg-sage-pale text-forest'
                : 'text-mid-gray hover:bg-sage-pale/50 hover:text-charcoal'
            }`}
          >
            <Settings size={18} strokeWidth={1.8} />
            Settings
          </NavLink>
        )}
        <div className="flex items-center gap-3 px-3 py-3 mt-2">
          <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center">
            <span className="text-white text-xs font-semibold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-charcoal truncate">{userName}</p>
            <p className="text-xs text-mid-gray truncate">{user?.email || ''}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
