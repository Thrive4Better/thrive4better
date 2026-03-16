import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Login from '@/pages/auth/Login';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/dashboard/Dashboard';
import StaffDashboard from '@/pages/dashboard/StaffDashboard';
import ClientList from '@/pages/clients/ClientList';
import ClientProfile from '@/pages/clients/ClientProfile';
import CarePlans from '@/pages/clients/CarePlans';
import WeeklyRoster from '@/pages/roster/WeeklyRoster';
import ShiftsList from '@/pages/roster/ShiftsList';
import CarersList from '@/pages/roster/CarersList';
import Timesheets from '@/pages/roster/Timesheets';
import InvoiceList from '@/pages/invoices/InvoiceList';
import InvoiceBuilder from '@/pages/invoices/InvoiceBuilder';
import NdisRates from '@/pages/invoices/NdisRates';
import ClaimTracker from '@/pages/invoices/ClaimTracker';
import IncidentList from '@/pages/incidents/IncidentList';
import ComplianceTracker from '@/pages/compliance/ComplianceTracker';
import Reports from '@/pages/reports/Reports';
import IdeaGenerator from '@/pages/tools/IdeaGenerator';
import MyShifts from '@/pages/staff/MyShifts';
import MyTimesheet from '@/pages/staff/MyTimesheet';
import UserManagement from '@/pages/admin/UserManagement';
import Settings from '@/pages/settings/Settings';

function DashboardRouter() {
  const { role } = useAuth();
  return role === 'staff' ? <StaffDashboard /> : <Dashboard />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '12px', padding: '12px 16px', fontSize: '14px' },
            success: { style: { background: '#EAF3EE', color: '#1B5E4E', border: '1px solid #A8CBBA' } },
            error: { style: { background: '#FEF2F2', color: '#7B2D45', border: '1px solid #FECACA' } },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardRouter />} />

              {/* Clients */}
              <Route path="/clients" element={<ClientList />} />
              <Route path="/clients/care-plans" element={<CarePlans />} />
              <Route path="/clients/:id" element={<ClientProfile />} />

              {/* Roster */}
              <Route path="/roster" element={<WeeklyRoster />} />
              <Route path="/roster/shifts" element={<ShiftsList />} />
              <Route path="/roster/carers" element={<CarersList />} />

              {/* Finance */}
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<InvoiceBuilder />} />
              <Route path="/invoices/:id/edit" element={<InvoiceBuilder />} />
              <Route path="/invoices/rates" element={<NdisRates />} />

              {/* All roles */}
              <Route path="/incidents" element={<IncidentList />} />
              <Route path="/incidents/new" element={<IncidentList />} />
              <Route path="/tools/ideas" element={<IdeaGenerator />} />
              <Route path="/tools/idea-generator" element={<IdeaGenerator />} />
              <Route path="/settings" element={<Settings />} />

              {/* Staff-only routes */}
              <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
                <Route path="/my-shifts" element={<MyShifts />} />
                <Route path="/my-timesheet" element={<MyTimesheet />} />
              </Route>

              {/* Admin/Manager routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
                <Route path="/roster/timesheets" element={<Timesheets />} />
                <Route path="/compliance" element={<ComplianceTracker />} />
                <Route path="/invoices/claims" element={<ClaimTracker />} />
                <Route path="/reports" element={<Reports />} />
              </Route>

              {/* Admin-only routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/users" element={<UserManagement />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
