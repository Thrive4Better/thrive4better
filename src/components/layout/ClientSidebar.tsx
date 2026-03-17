import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Star,
  ClipboardList,
  Settings,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ClientSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navSections = [
  {
    label: 'MY PORTAL',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/my-profile', icon: User, label: 'My Profile' },
      { to: '/rate-activities', icon: Star, label: 'Rate Activities' },
      { to: '/my-care-plan', icon: ClipboardList, label: 'My Care Plan' },
    ],
  },
];

export default function ClientSidebar({ isOpen, onClose }: ClientSidebarProps) {
  const location = useLocation();
  const { user, profile } = useAuth();

  const userName = profile?.fullName || user?.user_metadata?.full_name || user?.email || 'User';
  const initials = userName
    .split(/[\s@]+/)
    .slice(0, 2)
    .map((s: string) => s[0]?.toUpperCase() || '')
    .join('');

  const isActive = (path: string) => {
    if (path === '/dashboard') return location.pathname === '/dashboard' || location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

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
              <p className="text-[11px] text-mid-gray leading-tight">Client Portal</p>
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
        {navSections.map((section) => (
          <div key={section.label} className="mb-5">
            <div className="flex items-center gap-2 px-3 mb-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest flex-shrink-0" />
              <p className="text-[10px] font-semibold text-forest tracking-widest uppercase">
                {section.label}
              </p>
            </div>
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
