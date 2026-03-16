import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import StaffSidebar from './StaffSidebar';
import Header from './Header';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout() {
  const { role } = useAuth();

  return (
    <div className="min-h-screen bg-cream">
      {role === 'staff' ? <StaffSidebar /> : <Sidebar />}
      <div className="ml-60">
        <Header />
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
