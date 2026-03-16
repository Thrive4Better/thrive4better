import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import { Users, Calendar, FileText, DollarSign, Plus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid,
} from 'recharts';
import { format, isToday, startOfWeek, endOfWeek, subMonths, startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

const DONUT_COLORS = ['#1B5E4E', '#5A8F76', '#7B2D45', '#A8CBBA'];

export default function Dashboard() {
  const navigate = useNavigate();
  const { clients, shifts, invoices, carers } = useStore();

  const activeClients = useMemo(() => clients.filter((c) => c.status === 'Active').length, [clients]);

  const thisWeekShifts = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return shifts.filter((s) => {
      const d = parseISO(s.date);
      return isWithinInterval(d, { start, end });
    });
  }, [shifts]);

  const thisWeekHours = useMemo(() =>
    thisWeekShifts.reduce((sum, s) => sum + s.hours, 0), [thisWeekShifts]);

  const outstandingInvoices = useMemo(() =>
    invoices.filter((i) => i.status === 'Sent' || i.status === 'Overdue'), [invoices]);

  const outstandingTotal = useMemo(() =>
    outstandingInvoices.reduce((sum, i) => sum + i.total, 0), [outstandingInvoices]);

  const revenueThisMonth = useMemo(() => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return invoices
      .filter((i) => i.status === 'Paid' && isWithinInterval(parseISO(i.invoiceDate), { start, end }))
      .reduce((sum, i) => sum + i.total, 0);
  }, [invoices]);

  // Weekly billable hours by day
  const weeklyHoursData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, i) => {
      const dayShifts = thisWeekShifts.filter((s) => {
        const d = parseISO(s.date);
        return d.getDay() === (i === 6 ? 0 : i + 1);
      });
      return { day, hours: Math.round(dayShifts.reduce((s, sh) => s + sh.hours, 0) * 10) / 10 };
    });
  }, [thisWeekShifts]);

  // Invoice status breakdown
  const invoiceStatusData = useMemo(() => {
    const statuses = ['Paid', 'Sent', 'Overdue', 'Draft'];
    return statuses.map((status) => ({
      name: status,
      value: invoices.filter((i) => i.status === status).length,
    })).filter((d) => d.value > 0);
  }, [invoices]);

  // Monthly revenue last 6 months
  const monthlyRevenueData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(new Date(), i);
      const start = startOfMonth(month);
      const end = endOfMonth(month);
      const revenue = invoices
        .filter((inv) => inv.status === 'Paid' && isWithinInterval(parseISO(inv.invoiceDate), { start, end }))
        .reduce((sum, inv) => sum + inv.total, 0);
      data.push({ month: format(month, 'MMM'), revenue: Math.round(revenue) });
    }
    return data;
  }, [invoices]);

  // Today's shifts
  const todayShifts = useMemo(() =>
    shifts.filter((s) => isToday(parseISO(s.date))).sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [shifts]
  );

  // Invoices requiring attention
  const attentionInvoices = useMemo(() =>
    invoices.filter((i) => i.status === 'Overdue' || i.status === 'Draft').slice(0, 5),
    [invoices]
  );

  const getClientName = (id: string) => {
    const c = clients.find((cl) => cl.id === id);
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
  };
  const getCarerName = (id: string) => {
    const c = carers.find((cr) => cr.id === id);
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mid-gray">Active Clients</p>
              <p className="text-3xl font-semibold text-charcoal mt-1">{activeClients}</p>
              <p className="text-xs text-sage mt-1">+2 from last month</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sage-pale flex items-center justify-center">
              <Users size={22} className="text-forest" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mid-gray">Shifts This Week</p>
              <p className="text-3xl font-semibold text-charcoal mt-1">{thisWeekShifts.length}</p>
              <p className="text-xs text-sage mt-1">{thisWeekHours.toFixed(1)} hours</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sage-pale flex items-center justify-center">
              <Calendar size={22} className="text-forest" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mid-gray">Outstanding Invoices</p>
              <p className="text-3xl font-semibold text-charcoal mt-1">{formatCurrency(outstandingTotal)}</p>
              <p className="text-xs text-burgundy mt-1">{outstandingInvoices.length} invoices</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
              <FileText size={22} className="text-burgundy" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mid-gray">Revenue This Month</p>
              <p className="text-3xl font-semibold text-charcoal mt-1">{formatCurrency(revenueThisMonth)}</p>
              <p className="text-xs text-sage mt-1">vs $12,000 target</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sage-pale flex items-center justify-center">
              <DollarSign size={22} className="text-forest" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-charcoal mb-4">Weekly Billable Hours</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyHoursData}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #EAF3EE', fontSize: '12px' }}
                formatter={(value) => [`${value} hrs`, 'Hours']}
              />
              <Bar dataKey="hours" fill="#1B5E4E" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-charcoal mb-4">Invoice Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={invoiceStatusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                {invoiceStatusData.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #EAF3EE', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {invoiceStatusData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs text-mid-gray">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-charcoal mb-4">Monthly Revenue</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAF3EE" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #EAF3EE', fontSize: '12px' }}
                formatter={(value) => [formatCurrency(Number(value)), 'Revenue']}
              />
              <Line type="monotone" dataKey="revenue" stroke="#1B5E4E" strokeWidth={2} dot={{ fill: '#1B5E4E', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-charcoal mb-4">Upcoming Shifts Today</h3>
          {todayShifts.length === 0 ? (
            <p className="text-sm text-mid-gray py-8 text-center">No shifts scheduled for today</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sage-pale">
                    <th className="table-header">Participant</th>
                    <th className="table-header">Carer</th>
                    <th className="table-header">Time</th>
                    <th className="table-header">Type</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {todayShifts.slice(0, 5).map((shift) => (
                    <tr key={shift.id} className="border-b border-sage-pale/50 hover:bg-sage-pale/20">
                      <td className="table-cell font-medium">{getClientName(shift.clientId)}</td>
                      <td className="table-cell">{getCarerName(shift.carerId)}</td>
                      <td className="table-cell">{formatTime(shift.startTime)} – {formatTime(shift.endTime)}</td>
                      <td className="table-cell">{shift.serviceType}</td>
                      <td className="table-cell"><StatusBadge status={shift.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-charcoal mb-4">Invoices Requiring Attention</h3>
          {attentionInvoices.length === 0 ? (
            <p className="text-sm text-mid-gray py-8 text-center">All invoices up to date</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sage-pale">
                    <th className="table-header">Invoice #</th>
                    <th className="table-header">Client</th>
                    <th className="table-header">Amount</th>
                    <th className="table-header">Due</th>
                    <th className="table-header">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attentionInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-sage-pale/50 hover:bg-sage-pale/20 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}/edit`)}>
                      <td className="table-cell font-medium">{inv.invoiceNumber}</td>
                      <td className="table-cell">{getClientName(inv.clientId)}</td>
                      <td className="table-cell">{formatCurrency(inv.total)}</td>
                      <td className="table-cell">{formatDate(inv.dueDate)}</td>
                      <td className="table-cell"><StatusBadge status={inv.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button onClick={() => navigate('/clients')} className="btn-primary">
          <Plus size={16} /> New Client
        </button>
        <button onClick={() => navigate('/roster')} className="btn-primary">
          <Plus size={16} /> Schedule Shift
        </button>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary">
          <Plus size={16} /> Create Invoice
        </button>
      </div>
    </div>
  );
}
