import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Login from '@/pages/auth/Login';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/dashboard/Dashboard';
import ClientList from '@/pages/clients/ClientList';
import ClientProfile from '@/pages/clients/ClientProfile';
import CarePlans from '@/pages/clients/CarePlans';
import WeeklyRoster from '@/pages/roster/WeeklyRoster';
import ShiftsList from '@/pages/roster/ShiftsList';
import CarersList from '@/pages/roster/CarersList';
import InvoiceList from '@/pages/invoices/InvoiceList';
import InvoiceBuilder from '@/pages/invoices/InvoiceBuilder';
import NdisRates from '@/pages/invoices/NdisRates';
import Settings from '@/pages/settings/Settings';

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
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/clients" element={<ClientList />} />
              <Route path="/clients/care-plans" element={<CarePlans />} />
              <Route path="/clients/:id" element={<ClientProfile />} />
              <Route path="/roster" element={<WeeklyRoster />} />
              <Route path="/roster/shifts" element={<ShiftsList />} />
              <Route path="/roster/carers" element={<CarersList />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<InvoiceBuilder />} />
              <Route path="/invoices/:id/edit" element={<InvoiceBuilder />} />
              <Route path="/invoices/rates" element={<NdisRates />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
