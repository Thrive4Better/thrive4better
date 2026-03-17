import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import StaffSidebar from './StaffSidebar';
import ClientSidebar from './ClientSidebar';
import Header from './Header';
import ViewAsBar from './ViewAsBar';
import AccountingChatbot from '@/components/ai/AccountingChatbot';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout() {
  const { role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Show accounting chatbot on accounting and finance pages
  const showChatbot = role !== 'staff' && (
    location.pathname.startsWith('/accounting') ||
    location.pathname.startsWith('/invoices')
  );

  return (
    <div className="min-h-screen bg-cream">
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden transition-opacity"
          onClick={closeSidebar}
        />
      )}

      {role === 'client' ? (
        <ClientSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      ) : role === 'staff' ? (
        <StaffSidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      ) : (
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      )}

      <div className="lg:ml-60 min-h-screen flex flex-col">
        <ViewAsBar />
        <Header onToggleSidebar={toggleSidebar} />
        <main className="p-3 sm:p-4 lg:p-6 flex-1">
          <Outlet />
        </main>
      </div>

      {/* AI Accounting Chatbot - shown on accounting/finance pages */}
      {showChatbot && <AccountingChatbot />}
    </div>
  );
}
