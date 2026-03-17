import { useState, useMemo, useCallback } from 'react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  subMonths,
  differenceInDays,
} from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import { Download } from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { ComplianceStatus } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { exportToCsv } from '@/lib/export-utils';

// ── Constants ──

const TABS = ['Revenue', 'Shifts', 'Budget', 'Compliance', 'Satisfaction'] as const;
type Tab = (typeof TABS)[number];

const CHART_COLORS = ['#2D5A3D', '#7A9E7E', '#8B2252', '#6B7280', '#F59E0B', '#3B82F6'];

function calcComplianceStatus(expiryDate: string): ComplianceStatus {
  if (!expiryDate) return 'pending';
  const days = differenceInDays(parseISO(expiryDate), new Date());
  if (days < 0) return 'expired';
  if (days <= 30) return 'expiring_soon';
  return 'valid';
}

// ── Component ──

export default function Reports() {
  const {
    invoices,
    shifts,
    clients,
    carers,
    complianceRecords,
    activityReviews,
    getClientById,
    getCarerById,
  } = useStore();
  const { canViewReports } = usePermissions();

  const [activeTab, setActiveTab] = useState<Tab>('Revenue');

  // ── Revenue Data ──
  const revenueData = useMemo(() => {
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 11),
      end: endOfMonth(now),
    });

    const monthly = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const total = invoices
        .filter((inv) => {
          try {
            const d = parseISO(inv.invoiceDate);
            return d >= monthStart && d <= monthEnd;
          } catch {
            return false;
          }
        })
        .reduce((sum, inv) => sum + inv.total, 0);

      return {
        month: format(month, 'MMM yyyy'),
        total,
      };
    });

    // Revenue by client
    const byClient = new Map<string, number>();
    invoices.forEach((inv) => {
      const current = byClient.get(inv.clientId) || 0;
      byClient.set(inv.clientId, current + inv.total);
    });

    const clientRevenue = Array.from(byClient.entries())
      .map(([clientId, total]) => {
        const client = getClientById(clientId);
        return {
          clientId,
          clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
          total,
        };
      })
      .sort((a, b) => b.total - a.total);

    return { monthly, clientRevenue };
  }, [invoices, getClientById]);

  // ── Shifts Data ──
  const shiftsData = useMemo(() => {
    // Hours by carer
    const byCarer = new Map<string, number>();
    shifts.forEach((s) => {
      const current = byCarer.get(s.carerId) || 0;
      byCarer.set(s.carerId, current + s.hours);
    });

    const carerHours = Array.from(byCarer.entries())
      .map(([carerId, hours]) => {
        const carer = getCarerById(carerId);
        return {
          carerId,
          carerName: carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown',
          hours: Math.round(hours * 100) / 100,
        };
      })
      .sort((a, b) => b.hours - a.hours);

    // Shifts by service type
    const byType = new Map<string, number>();
    shifts.forEach((s) => {
      const current = byType.get(s.serviceType) || 0;
      byType.set(s.serviceType, current + 1);
    });

    const serviceTypeCounts = Array.from(byType.entries()).map(([name, value]) => ({
      name,
      value,
    }));

    return { carerHours, serviceTypeCounts };
  }, [shifts, getCarerById]);

  // ── Budget Data ──
  const budgetData = useMemo(() => {
    return clients
      .filter((c) => c.supportCategories && c.supportCategories.length > 0)
      .map((client) => {
        const totalBudget = client.supportCategories.reduce((s, cat) => s + cat.allocatedBudget, 0);
        const totalSpent = client.supportCategories.reduce((s, cat) => s + cat.spentAmount, 0);
        const pct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        return {
          clientId: client.id,
          clientName: `${client.firstName} ${client.lastName}`,
          categories: client.supportCategories,
          totalBudget,
          totalSpent,
          pct,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [clients]);

  // ── Compliance Data ──
  const complianceData = useMemo(() => {
    const byCarerMap = new Map<
      string,
      { valid: number; expiring_soon: number; expired: number; pending: number }
    >();

    complianceRecords.forEach((r) => {
      const status = calcComplianceStatus(r.expiryDate);
      const existing = byCarerMap.get(r.carerId) || { valid: 0, expiring_soon: 0, expired: 0, pending: 0 };
      existing[status]++;
      byCarerMap.set(r.carerId, existing);
    });

    return Array.from(byCarerMap.entries()).map(([carerId, counts]) => {
      const carer = getCarerById(carerId);
      return {
        carerId,
        carerName: carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown',
        ...counts,
      };
    });
  }, [complianceRecords, getCarerById]);

  // ── Satisfaction Data ──
  const satisfactionData = useMemo(() => {
    if (activityReviews.length === 0) return { monthly: [], byServiceType: [], moodDistribution: [], carerRatings: [], recentFeedback: [] };

    // Monthly satisfaction trend
    const now = new Date();
    const months = eachMonthOfInterval({
      start: subMonths(startOfMonth(now), 11),
      end: endOfMonth(now),
    });

    const monthly = months.map((month) => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthReviews = activityReviews.filter((r) => {
        try {
          const d = parseISO(r.createdAt);
          return d >= monthStart && d <= monthEnd;
        } catch {
          return false;
        }
      });
      const avgActivity = monthReviews.length > 0
        ? monthReviews.reduce((s, r) => s + r.activityRating, 0) / monthReviews.length
        : 0;
      const avgCarer = monthReviews.length > 0
        ? monthReviews.reduce((s, r) => s + r.carerRating, 0) / monthReviews.length
        : 0;
      return {
        month: format(month, 'MMM yyyy'),
        activityRating: Math.round(avgActivity * 10) / 10,
        carerRating: Math.round(avgCarer * 10) / 10,
        count: monthReviews.length,
      };
    });

    // By service type
    const byTypeMap = new Map<string, { total: number; count: number }>();
    activityReviews.forEach((r) => {
      const shift = shifts.find((s) => s.id === r.shiftId);
      const type = shift?.serviceType || 'Other';
      const existing = byTypeMap.get(type) || { total: 0, count: 0 };
      existing.total += r.activityRating;
      existing.count += 1;
      byTypeMap.set(type, existing);
    });
    const byServiceType = Array.from(byTypeMap.entries()).map(([name, { total, count }]) => ({
      name,
      avgRating: Math.round((total / count) * 10) / 10,
      count,
    }));

    // Mood distribution
    const moodMap = new Map<string, number>();
    activityReviews.forEach((r) => {
      moodMap.set(r.mood, (moodMap.get(r.mood) || 0) + 1);
    });
    const moodLabels: Record<string, string> = {
      great: 'Great', good: 'Good', okay: 'Okay', not_great: 'Not Great', bad: 'Bad',
    };
    const moodDistribution = Array.from(moodMap.entries()).map(([mood, value]) => ({
      name: moodLabels[mood] || mood,
      value,
    }));

    // Carer ratings (admin only)
    const carerMap = new Map<string, { total: number; count: number }>();
    activityReviews.forEach((r) => {
      const existing = carerMap.get(r.carerId) || { total: 0, count: 0 };
      existing.total += r.carerRating;
      existing.count += 1;
      carerMap.set(r.carerId, existing);
    });
    const carerRatings = Array.from(carerMap.entries())
      .map(([carerId, { total, count }]) => {
        const carer = getCarerById(carerId);
        return {
          carerId,
          carerName: carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown',
          avgRating: Math.round((total / count) * 10) / 10,
          count,
        };
      })
      .sort((a, b) => b.avgRating - a.avgRating);

    // Recent feedback
    const recentFeedback = [...activityReviews]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 10)
      .map((r) => {
        const shift = shifts.find((s) => s.id === r.shiftId);
        const client = getClientById(r.clientId);
        const carer = getCarerById(r.carerId);
        return {
          ...r,
          clientName: client ? `${client.firstName} ${client.lastName}` : 'Unknown',
          carerName: carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown',
          serviceType: shift?.serviceType || 'Unknown',
        };
      });

    return { monthly, byServiceType, moodDistribution, carerRatings, recentFeedback };
  }, [activityReviews, shifts, getClientById, getCarerById]);

  // ── CSV exports ──
  const exportRevenue = useCallback(() => {
    exportToCsv(
      'revenue-by-client.csv',
      ['Client', 'Total Revenue'],
      revenueData.clientRevenue.map((r) => [r.clientName, r.total.toFixed(2)]),
    );
  }, [revenueData]);

  const exportShifts = useCallback(() => {
    exportToCsv(
      'shifts-by-carer.csv',
      ['Carer', 'Total Hours'],
      shiftsData.carerHours.map((r) => [r.carerName, r.hours.toFixed(2)]),
    );
  }, [shiftsData]);

  const exportBudget = useCallback(() => {
    exportToCsv(
      'budget-utilization.csv',
      ['Client', 'Total Budget', 'Total Spent', 'Utilization %'],
      budgetData.map((r) => [r.clientName, r.totalBudget.toFixed(2), r.totalSpent.toFixed(2), `${r.pct}%`]),
    );
  }, [budgetData]);

  const exportCompliance = useCallback(() => {
    exportToCsv(
      'compliance-overview.csv',
      ['Carer', 'Valid', 'Expiring Soon', 'Expired', 'Pending'],
      complianceData.map((r) => [
        r.carerName,
        String(r.valid),
        String(r.expiring_soon),
        String(r.expired),
        String(r.pending),
      ]),
    );
  }, [complianceData]);

  if (!canViewReports) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-mid-gray">You do not have permission to view reports.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Reports & Analytics</h1>
        <p className="text-sm text-mid-gray mt-1">Business insights and performance metrics</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-sage-pale/30 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              activeTab === tab
                ? 'bg-white text-forest shadow-sm'
                : 'text-mid-gray hover:text-charcoal',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Revenue' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">Monthly Revenue</h2>
            <button onClick={exportRevenue} className="btn-ghost flex items-center gap-2 text-sm">
              <Download size={16} />
              Export CSV
            </button>
          </div>

          <div className="card p-6">
            {revenueData.monthly.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={revenueData.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="total" fill="#2D5A3D" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-mid-gray py-8">No invoice data available.</p>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-sage-pale bg-sage-pale/20">
              <h3 className="font-semibold text-charcoal">Revenue by Client</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Client</th>
                    <th className="table-header text-right">Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueData.clientRevenue.map((row) => (
                    <tr key={row.clientId} className="border-b border-sage-pale/50">
                      <td className="table-cell text-sm text-charcoal">{row.clientName}</td>
                      <td className="table-cell text-sm font-medium text-charcoal text-right">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                  {revenueData.clientRevenue.length === 0 && (
                    <tr>
                      <td colSpan={2} className="table-cell text-center text-mid-gray">
                        No data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Shifts' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">Shift Analytics</h2>
            <button onClick={exportShifts} className="btn-ghost flex items-center gap-2 text-sm">
              <Download size={16} />
              Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Hours by carer */}
            <div className="card p-6">
              <h3 className="font-semibold text-charcoal mb-4">Hours by Carer</h3>
              {shiftsData.carerHours.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={shiftsData.carerHours} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="carerName" type="category" tick={{ fontSize: 11 }} width={120} />
                    <Tooltip formatter={(value) => `${value}h`} />
                    <Bar dataKey="hours" fill="#7A9E7E" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-mid-gray py-8">No shift data available.</p>
              )}
            </div>

            {/* Shifts by service type */}
            <div className="card p-6">
              <h3 className="font-semibold text-charcoal mb-4">Shifts by Service Type</h3>
              {shiftsData.serviceTypeCounts.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={shiftsData.serviceTypeCounts}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    >
                      {shiftsData.serviceTypeCounts.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-mid-gray py-8">No shift data available.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Budget' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">Budget Utilization</h2>
            <button onClick={exportBudget} className="btn-ghost flex items-center gap-2 text-sm">
              <Download size={16} />
              Export CSV
            </button>
          </div>

          {budgetData.length === 0 ? (
            <div className="card p-8 text-center text-mid-gray">
              No clients with budget data found.
            </div>
          ) : (
            <div className="space-y-4">
              {budgetData.map((client) => (
                <div key={client.clientId} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-charcoal">{client.clientName}</h3>
                    <span className="text-sm text-mid-gray">
                      {formatCurrency(client.totalSpent)} / {formatCurrency(client.totalBudget)} ({client.pct}%)
                    </span>
                  </div>

                  {/* Overall progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                    <div
                      className={cn(
                        'h-3 rounded-full transition-all',
                        client.pct >= 90
                          ? 'bg-red-500'
                          : client.pct >= 75
                            ? 'bg-amber-500'
                            : 'bg-forest',
                      )}
                      style={{ width: `${Math.min(client.pct, 100)}%` }}
                    />
                  </div>

                  {/* Per-category breakdown */}
                  <div className="space-y-2">
                    {client.categories.map((cat) => {
                      const catPct = cat.allocatedBudget > 0
                        ? Math.round((cat.spentAmount / cat.allocatedBudget) * 100)
                        : 0;
                      return (
                        <div key={cat.categoryId} className="flex items-center gap-3">
                          <span className="text-xs text-mid-gray w-40 truncate">{cat.categoryName}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2">
                            <div
                              className={cn(
                                'h-2 rounded-full',
                                catPct >= 90
                                  ? 'bg-red-400'
                                  : catPct >= 75
                                    ? 'bg-amber-400'
                                    : 'bg-sage',
                              )}
                              style={{ width: `${Math.min(catPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-mid-gray w-20 text-right">
                            {formatCurrency(cat.spentAmount)} / {formatCurrency(cat.allocatedBudget)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Compliance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">Compliance Overview</h2>
            <button onClick={exportCompliance} className="btn-ghost flex items-center gap-2 text-sm">
              <Download size={16} />
              Export CSV
            </button>
          </div>

          {complianceData.length === 0 ? (
            <div className="card p-8 text-center text-mid-gray">
              No compliance records found.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="table-header">Carer</th>
                      <th className="table-header text-center">Valid</th>
                      <th className="table-header text-center">Expiring Soon</th>
                      <th className="table-header text-center">Expired</th>
                      <th className="table-header text-center">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complianceData.map((row) => (
                      <tr key={row.carerId} className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors">
                        <td className="table-cell text-sm font-medium text-charcoal">{row.carerName}</td>
                        <td className="table-cell text-center">
                          {row.valid > 0 && (
                            <span className="badge text-xs bg-green-100 text-green-800">{row.valid}</span>
                          )}
                        </td>
                        <td className="table-cell text-center">
                          {row.expiring_soon > 0 && (
                            <span className="badge text-xs bg-yellow-100 text-yellow-800">{row.expiring_soon}</span>
                          )}
                        </td>
                        <td className="table-cell text-center">
                          {row.expired > 0 && (
                            <span className="badge text-xs bg-red-100 text-red-700">{row.expired}</span>
                          )}
                        </td>
                        <td className="table-cell text-center">
                          {row.pending > 0 && (
                            <span className="badge text-xs bg-gray-100 text-gray-600">{row.pending}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'Satisfaction' && (
        <div className="space-y-6">
          <h2 className="text-lg font-semibold text-charcoal">Client Satisfaction</h2>

          {activityReviews.length === 0 ? (
            <div className="card p-8 text-center text-mid-gray">
              No review data available yet.
            </div>
          ) : (
            <>
              {/* Satisfaction over time */}
              <div className="card p-6">
                <h3 className="font-semibold text-charcoal mb-4">Satisfaction Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={satisfactionData.monthly.filter((m) => m.count > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="activityRating" name="Activity Rating" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="carerRating" name="Carer Rating" stroke="#2D5A3D" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Average rating by service type */}
                <div className="card p-6">
                  <h3 className="font-semibold text-charcoal mb-4">Avg Rating by Activity Type</h3>
                  {satisfactionData.byServiceType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={satisfactionData.byServiceType}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="avgRating" name="Avg Rating" fill="#7A9E7E" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-mid-gray py-8">No data</p>
                  )}
                </div>

                {/* Mood distribution */}
                <div className="card p-6">
                  <h3 className="font-semibold text-charcoal mb-4">Mood Distribution</h3>
                  {satisfactionData.moodDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={satisfactionData.moodDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                        >
                          {satisfactionData.moodDistribution.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-center text-mid-gray py-8">No data</p>
                  )}
                </div>
              </div>

              {/* Carer ratings comparison (admin only) */}
              {satisfactionData.carerRatings.length > 0 && (
                <div className="card overflow-hidden">
                  <div className="px-4 py-3 border-b border-sage-pale bg-sage-pale/20">
                    <h3 className="font-semibold text-charcoal">Carer Ratings (Admin Only)</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          <th className="table-header">Carer</th>
                          <th className="table-header text-center">Avg Rating</th>
                          <th className="table-header text-center">Reviews</th>
                        </tr>
                      </thead>
                      <tbody>
                        {satisfactionData.carerRatings.map((row) => (
                          <tr key={row.carerId} className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors">
                            <td className="table-cell text-sm font-medium text-charcoal">{row.carerName}</td>
                            <td className="table-cell text-center">
                              <span className={cn(
                                'text-sm font-semibold',
                                row.avgRating >= 4 ? 'text-green-600' : row.avgRating >= 3 ? 'text-amber-600' : 'text-red-600',
                              )}>
                                {row.avgRating}/5
                              </span>
                            </td>
                            <td className="table-cell text-center text-sm text-mid-gray">{row.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent feedback */}
              <div className="card overflow-hidden">
                <div className="px-4 py-3 border-b border-sage-pale bg-sage-pale/20">
                  <h3 className="font-semibold text-charcoal">Recent Feedback</h3>
                </div>
                <div className="divide-y divide-sage-pale/50">
                  {satisfactionData.recentFeedback.map((fb) => (
                    <div key={fb.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-charcoal">{fb.clientName}</span>
                          <span className="text-xs text-mid-gray">{fb.serviceType}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-amber-600">Activity: {fb.activityRating}/5</span>
                          <span className="text-forest">Carer: {fb.carerRating}/5</span>
                        </div>
                      </div>
                      <p className="text-xs text-mid-gray">
                        Carer: {fb.carerName} | {fb.createdAt ? format(parseISO(fb.createdAt), 'dd MMM yyyy') : ''}
                      </p>
                      {fb.activityFeedback && (
                        <p className="text-sm text-charcoal mt-1">{fb.activityFeedback}</p>
                      )}
                    </div>
                  ))}
                  {satisfactionData.recentFeedback.length === 0 && (
                    <div className="px-4 py-6 text-center text-mid-gray text-sm">No feedback yet</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
