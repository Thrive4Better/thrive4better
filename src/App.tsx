import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Login from '@/pages/auth/Login';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/dashboard/Dashboard';
import StaffDashboard from '@/pages/dashboard/StaffDashboard';
import ClientDashboard from '@/pages/dashboard/ClientDashboard';
import MyProfile from '@/pages/client-portal/MyProfile';
import RateActivity from '@/pages/client-portal/RateActivity';
import MyCarePlan from '@/pages/client-portal/MyCarePlan';
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
import SupportPlanInfo from '@/pages/tools/SupportPlanInfo';
import MyShifts from '@/pages/staff/MyShifts';
import MyTimesheet from '@/pages/staff/MyTimesheet';
import LogShift from '@/pages/staff/LogShift';
import UserManagement from '@/pages/admin/UserManagement';
import DocumentLibrary from '@/pages/documents/DocumentLibrary';
import Settings from '@/pages/settings/Settings';
import NotFound from '@/pages/NotFound';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Lazy-loaded admin pages
const Onboarding = lazy(() => import('@/pages/admin/Onboarding'));

// Lazy-loaded payroll pages
const PayrollDashboard = lazy(() => import('@/pages/payroll/PayrollDashboard'));
const PayRunPage = lazy(() => import('@/pages/payroll/PayRun'));

// Lazy-loaded contractor invoice pages
const ContractorInvoicePage = lazy(() => import('@/pages/staff/ContractorInvoice'));
const ContractorInvoicesAdmin = lazy(() => import('@/pages/invoices/ContractorInvoices'));

// Lazy-loaded accounting pages
const ChartOfAccounts = lazy(() => import('@/pages/accounting/ChartOfAccounts'));
const Transactions = lazy(() => import('@/pages/accounting/Transactions'));
const BankReconciliation = lazy(() => import('@/pages/accounting/BankReconciliation'));
const BASReport = lazy(() => import('@/pages/accounting/BASReport'));
const ProfitAndLoss = lazy(() => import('@/pages/accounting/ProfitAndLoss'));
const BalanceSheet = lazy(() => import('@/pages/accounting/BalanceSheet'));
const CashFlow = lazy(() => import('@/pages/accounting/CashFlow'));

function DashboardRouter() {
  const { role } = useAuth();
  if (role === 'client') return <ClientDashboard />;
  if (role === 'staff') return <StaffDashboard />;
  return <Dashboard />;
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
              <Route path="/documents" element={<DocumentLibrary />} />
              <Route path="/tools/ideas" element={<IdeaGenerator />} />
              <Route path="/tools/idea-generator" element={<IdeaGenerator />} />
              <Route path="/tools/support-plans" element={<SupportPlanInfo />} />
              <Route path="/settings" element={<Settings />} />

              {/* Client portal routes */}
              <Route element={<ProtectedRoute allowedRoles={['client']} />}>
                <Route path="/my-profile" element={<MyProfile />} />
                <Route path="/rate-activities" element={<RateActivity />} />
                <Route path="/my-care-plan" element={<MyCarePlan />} />
              </Route>

              {/* Staff-only routes */}
              <Route element={<ProtectedRoute allowedRoles={['staff']} />}>
                <Route path="/my-shifts" element={<MyShifts />} />
                <Route path="/my-timesheet" element={<MyTimesheet />} />
                <Route path="/log-shift" element={<LogShift />} />
                <Route path="/contractor-invoice" element={<Suspense fallback={<LoadingSpinner />}><ContractorInvoicePage /></Suspense>} />
              </Route>

              {/* Admin/Manager routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin', 'manager']} />}>
                <Route path="/roster/timesheets" element={<Timesheets />} />
                <Route path="/contractor-invoices" element={<Suspense fallback={<LoadingSpinner />}><ContractorInvoicesAdmin /></Suspense>} />
                <Route path="/payroll" element={<Suspense fallback={<LoadingSpinner />}><PayrollDashboard /></Suspense>} />
                <Route path="/payroll/new" element={<Suspense fallback={<LoadingSpinner />}><PayRunPage /></Suspense>} />
                <Route path="/payroll/:id" element={<Suspense fallback={<LoadingSpinner />}><PayRunPage /></Suspense>} />
                <Route path="/compliance" element={<ComplianceTracker />} />
                <Route path="/invoices/claims" element={<ClaimTracker />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/accounting/chart-of-accounts" element={<Suspense fallback={<LoadingSpinner />}><ChartOfAccounts /></Suspense>} />
                <Route path="/accounting/transactions" element={<Suspense fallback={<LoadingSpinner />}><Transactions /></Suspense>} />
                <Route path="/accounting/reconciliation" element={<Suspense fallback={<LoadingSpinner />}><BankReconciliation /></Suspense>} />
                <Route path="/accounting/bas" element={<Suspense fallback={<LoadingSpinner />}><BASReport /></Suspense>} />
                <Route path="/accounting/profit-and-loss" element={<Suspense fallback={<LoadingSpinner />}><ProfitAndLoss /></Suspense>} />
                <Route path="/accounting/balance-sheet" element={<Suspense fallback={<LoadingSpinner />}><BalanceSheet /></Suspense>} />
                <Route path="/accounting/cash-flow" element={<Suspense fallback={<LoadingSpinner />}><CashFlow /></Suspense>} />
              </Route>

              {/* Admin-only routes */}
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin/users" element={<UserManagement />} />
                <Route path="/admin/onboarding" element={<Suspense fallback={<LoadingSpinner />}><Onboarding /></Suspense>} />
              </Route>

              {/* 404 catch-all */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
