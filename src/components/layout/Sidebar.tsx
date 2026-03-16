import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Calendar,
  Clock,
  UserCheck,
  FileText,
  FilePlus,
  DollarSign,
  Settings,
} from 'lucide-react';

const navSections = [
  {
    label: 'OVERVIEW',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'CLIENTS',
    items: [
      { to: '/clients', icon: Users, label: 'All Clients' },
      { to: '/clients/care-plans', icon: ClipboardList, label: 'Care Plans' },
    ],
  },
  {
    label: 'ROSTER',
    items: [
      { to: '/roster', icon: Calendar, label: 'Weekly Roster' },
      { to: '/roster/shifts', icon: Clock, label: 'Shifts' },
      { to: '/roster/carers', icon: UserCheck, label: 'Carers' },
    ],
  },
  {
    label: 'FINANCE',
    items: [
      { to: '/invoices', icon: FileText, label: 'Invoices' },
      { to: '/invoices/new', icon: FilePlus, label: 'Invoice Builder' },
      { to: '/invoices/rates', icon: DollarSign, label: 'NDIS Rates' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    if (path === '/clients') return location.pathname === '/clients' || location.pathname.startsWith('/clients/') && !location.pathname.includes('care-plans');
    if (path === '/roster') return location.pathname === '/roster' && !location.pathname.includes('/shifts') && !location.pathname.includes('/carers');
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className="w-60 bg-white border-r border-sage-pale flex flex-col h-screen fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sage-pale">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-forest rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">T4B</span>
          </div>
          <div>
            <h1 className="text-base font-semibold text-charcoal leading-tight">Thrive 4 Better</h1>
            <p className="text-[11px] text-mid-gray leading-tight">NDIS Support Services</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-mid-gray tracking-widest uppercase">
              {section.label}
            </p>
            {section.items.map((item) => {
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
        ))}
      </nav>

      {/* Settings + User */}
      <div className="border-t border-sage-pale p-3">
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
        <div className="flex items-center gap-3 px-3 py-3 mt-2">
          <div className="w-8 h-8 rounded-full bg-forest flex items-center justify-center">
            <span className="text-white text-xs font-semibold">AK</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-charcoal truncate">Admin User</p>
            <p className="text-xs text-mid-gray truncate">admin@thrive4better.com.au</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
