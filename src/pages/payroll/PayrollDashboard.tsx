import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, Plus, FileText, TrendingUp, Landmark, Users } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import type { PayRun, PayRunStatus } from '@/types';

const STORAGE_KEY = 't4b_payRuns';

function loadPayRuns(): PayRun[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function statusBadge(status: PayRunStatus) {
  const map: Record<PayRunStatus, string> = {
    Draft: 'bg-gray-100 text-gray-600',
    Processing: 'bg-amber-100 text-amber-800',
    Completed: 'bg-green-100 text-green-800',
  };
  return map[status];
}

export default function PayrollDashboard() {
  const [payRuns] = useState<PayRun[]>(loadPayRuns);

  const summary = useMemo(() => {
    const completed = payRuns.filter((p) => p.status === 'Completed');
    const totalWages = completed.reduce((s, p) => s + p.totalGross, 0);
    const totalSuper = completed.reduce((s, p) => s + p.totalSuper, 0);
    const totalPAYG = completed.reduce((s, p) => s + p.totalPAYG, 0);
    const totalNet = completed.reduce((s, p) => s + p.totalNet, 0);
    return { totalWages, totalSuper, totalPAYG, totalNet };
  }, [payRuns]);

  const kpis = [
    { label: 'Total Gross Wages', value: formatCurrency(summary.totalWages), icon: DollarSign, color: 'text-forest' },
    { label: 'Super Obligation', value: formatCurrency(summary.totalSuper), icon: Landmark, color: 'text-teal-600' },
    { label: 'PAYG Withholding', value: formatCurrency(summary.totalPAYG), icon: TrendingUp, color: 'text-amber-600' },
    { label: 'Total Net Pay', value: formatCurrency(summary.totalNet), icon: Users, color: 'text-emerald-600' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Payroll Dashboard</h1>
          <p className="text-sm text-mid-gray mt-1">Manage pay runs, wages, and superannuation</p>
        </div>
        <Link to="/payroll/new" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          New Pay Run
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="card p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-sage-pale/50 ${kpi.color}`}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className="text-xs text-mid-gray">{kpi.label}</p>
                  <p className="text-lg font-bold text-charcoal">{kpi.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pay Run List */}
      <div>
        <h2 className="text-lg font-semibold text-charcoal mb-3">Pay Runs</h2>
        {payRuns.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No pay runs yet"
            description="Create your first pay run to get started with payroll."
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Period</th>
                    <th className="table-header">Frequency</th>
                    <th className="table-header">Employees</th>
                    <th className="table-header text-right">Gross</th>
                    <th className="table-header text-right">Super</th>
                    <th className="table-header text-right">PAYG</th>
                    <th className="table-header text-right">Net</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payRuns
                    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                    .map((pr) => (
                      <tr key={pr.id} className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors">
                        <td className="table-cell text-sm text-charcoal">
                          {format(new Date(pr.periodStart), 'dd/MM/yy')} - {format(new Date(pr.periodEnd), 'dd/MM/yy')}
                        </td>
                        <td className="table-cell text-sm text-charcoal capitalize">{pr.frequency}</td>
                        <td className="table-cell text-sm text-charcoal">{pr.lineItems.length}</td>
                        <td className="table-cell text-sm text-charcoal text-right">{formatCurrency(pr.totalGross)}</td>
                        <td className="table-cell text-sm text-charcoal text-right">{formatCurrency(pr.totalSuper)}</td>
                        <td className="table-cell text-sm text-charcoal text-right">{formatCurrency(pr.totalPAYG)}</td>
                        <td className="table-cell text-sm font-medium text-charcoal text-right">{formatCurrency(pr.totalNet)}</td>
                        <td className="table-cell">
                          <span className={`badge text-xs ${statusBadge(pr.status)}`}>{pr.status}</span>
                        </td>
                        <td className="table-cell">
                          <Link
                            to={`/payroll/${pr.id}`}
                            className="text-forest hover:underline text-sm"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
