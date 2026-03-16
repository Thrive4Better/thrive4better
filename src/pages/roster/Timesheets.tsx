import { useState, useMemo, useCallback } from 'react';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO } from 'date-fns';
import {
  Clock,
  CheckCircle2,
  XCircle,
  ListFilter,
  Timer,
  CheckSquare,
  Square,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { Timesheet, TimesheetStatus } from '@/types';
import { cn, formatDate, formatTime } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';

// ── Constants ──

const STATUS_OPTIONS: TimesheetStatus[] = ['pending', 'approved', 'rejected'];

function statusBadge(status: TimesheetStatus) {
  const map: Record<TimesheetStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-700',
  };
  return map[status];
}

// ── Component ──

export default function Timesheets() {
  const {
    timesheets,
    carers,
    shifts,
    addTimesheet,
    updateTimesheet,
    getCarerById,
  } = useStore();
  const { profile } = useAuth();
  const { canApproveTimesheets } = usePermissions();

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCarerId, setFilterCarerId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // KPIs
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const kpis = useMemo(() => {
    const pending = timesheets.filter((t) => t.status === 'pending').length;

    const thisWeek = timesheets.filter((t) => {
      const shift = shifts.find((s) => s.id === t.shiftId);
      if (!shift) return false;
      try {
        const d = parseISO(shift.date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd });
      } catch {
        return false;
      }
    });

    const approvedThisWeek = thisWeek.filter((t) => t.status === 'approved').length;
    const totalHoursThisWeek = thisWeek.reduce((sum, t) => sum + (t.totalHours ?? 0), 0);

    return { pending, approvedThisWeek, totalHoursThisWeek };
  }, [timesheets, shifts, weekStart, weekEnd]);

  // Filtered
  const filtered = useMemo(() => {
    let result = [...timesheets];
    if (filterStatus) result = result.filter((t) => t.status === filterStatus);
    if (filterCarerId) result = result.filter((t) => t.carerId === filterCarerId);
    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return result;
  }, [timesheets, filterStatus, filterCarerId]);

  // Selection
  const pendingFiltered = useMemo(() => filtered.filter((t) => t.status === 'pending'), [filtered]);
  const allPendingSelected = pendingFiltered.length > 0 && pendingFiltered.every((t) => selectedIds.has(t.id));

  const toggleSelectAll = useCallback(() => {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pendingFiltered.map((t) => t.id)));
    }
  }, [allPendingSelected, pendingFiltered]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleApprove = useCallback(
    async (id: string) => {
      try {
        await updateTimesheet(id, { status: 'approved', approvedBy: profile?.id });
        toast.success('Timesheet approved');
      } catch {
        toast.error('Failed to approve timesheet');
      }
    },
    [updateTimesheet, profile],
  );

  const handleReject = useCallback(
    async (id: string) => {
      try {
        await updateTimesheet(id, { status: 'rejected', approvedBy: profile?.id });
        toast.success('Timesheet rejected');
      } catch {
        toast.error('Failed to reject timesheet');
      }
    },
    [updateTimesheet, profile],
  );

  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast.error('Select at least one timesheet');
      return;
    }
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          updateTimesheet(id, { status: 'approved', approvedBy: profile?.id }),
        ),
      );
      toast.success(`${selectedIds.size} timesheet(s) approved`);
      setSelectedIds(new Set());
    } catch {
      toast.error('Failed to bulk approve');
    }
  }, [selectedIds, updateTimesheet, profile]);

  const handleClockIn = useCallback(async () => {
    // Find the current user's carer ID and an active shift
    const carerId = profile?.carerId;
    if (!carerId) {
      toast.error('No linked carer profile');
      return;
    }
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayShifts = shifts.filter(
      (s) => s.carerId === carerId && s.date === today && (s.status === 'Scheduled' || s.status === 'Confirmed' || s.status === 'In Progress'),
    );

    if (todayShifts.length === 0) {
      toast.error('No scheduled shift found for today');
      return;
    }

    const shift = todayShifts[0];

    // Check if already clocked in
    const existing = timesheets.find((t) => t.shiftId === shift.id && !t.clockOut);
    if (existing) {
      toast.error('Already clocked in for this shift');
      return;
    }

    try {
      await addTimesheet({
        carerId,
        shiftId: shift.id,
        clockIn: new Date().toISOString(),
        breakMinutes: 0,
        status: 'pending',
        notes: '',
      });
      toast.success('Clocked in successfully');
    } catch {
      toast.error('Failed to clock in');
    }
  }, [profile, shifts, timesheets, addTimesheet]);

  const handleClockOut = useCallback(async () => {
    const carerId = profile?.carerId;
    if (!carerId) {
      toast.error('No linked carer profile');
      return;
    }

    const active = timesheets.find((t) => t.carerId === carerId && t.clockIn && !t.clockOut);
    if (!active) {
      toast.error('No active clock-in found');
      return;
    }

    const clockOut = new Date().toISOString();
    const clockInTime = new Date(active.clockIn!).getTime();
    const clockOutTime = new Date(clockOut).getTime();
    const totalHours = Math.round(((clockOutTime - clockInTime) / 3600000 - active.breakMinutes / 60) * 100) / 100;

    try {
      await updateTimesheet(active.id, { clockOut, totalHours });
      toast.success('Clocked out successfully');
    } catch {
      toast.error('Failed to clock out');
    }
  }, [profile, timesheets, updateTimesheet]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Timesheets</h1>
          <p className="text-sm text-mid-gray mt-1">
            {filtered.length} timesheet{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canApproveTimesheets && selectedIds.size > 0 && (
            <button onClick={handleBulkApprove} className="btn-secondary flex items-center gap-2">
              <CheckCircle2 size={16} />
              Approve Selected ({selectedIds.size})
            </button>
          )}
          {profile?.carerId && (
            <div className="flex items-center gap-2">
              <button onClick={handleClockIn} className="btn-primary flex items-center gap-2">
                <Timer size={16} />
                Clock In
              </button>
              <button onClick={handleClockOut} className="btn-secondary flex items-center gap-2">
                <Clock size={16} />
                Clock Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-mid-gray">Pending Approval</div>
          <div className="text-2xl font-bold text-charcoal mt-1">{kpis.pending}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-mid-gray">Approved This Week</div>
          <div className="text-2xl font-bold text-forest mt-1">{kpis.approvedThisWeek}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-mid-gray">Total Hours This Week</div>
          <div className="text-2xl font-bold text-charcoal mt-1">{kpis.totalHoursThisWeek.toFixed(1)}h</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <ListFilter size={16} />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
          {(filterStatus || filterCarerId) && (
            <button
              onClick={() => {
                setFilterStatus('');
                setFilterCarerId('');
              }}
              className="text-sm text-burgundy hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={filterCarerId}
              onChange={(e) => setFilterCarerId(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">All Carers</option>
              {carers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.firstName} {c.lastName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Clock}
          title="No timesheets found"
          description="No timesheets match your filters."
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {canApproveTimesheets && (
                    <th className="table-header w-10">
                      <button onClick={toggleSelectAll} className="p-1">
                        {allPendingSelected ? (
                          <CheckSquare size={16} className="text-forest" />
                        ) : (
                          <Square size={16} className="text-mid-gray" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="table-header">Carer</th>
                  <th className="table-header">Shift Date</th>
                  <th className="table-header">Clock In</th>
                  <th className="table-header">Clock Out</th>
                  <th className="table-header">Break</th>
                  <th className="table-header">Total Hours</th>
                  <th className="table-header">Status</th>
                  {canApproveTimesheets && <th className="table-header">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ts) => {
                  const carer = getCarerById(ts.carerId);
                  const shift = shifts.find((s) => s.id === ts.shiftId);
                  const isPending = ts.status === 'pending';

                  return (
                    <tr
                      key={ts.id}
                      className="border-b border-sage-pale/50 hover:bg-sage-pale/20 transition-colors"
                    >
                      {canApproveTimesheets && (
                        <td className="table-cell w-10">
                          {isPending && (
                            <button onClick={() => toggleSelect(ts.id)} className="p-1">
                              {selectedIds.has(ts.id) ? (
                                <CheckSquare size={16} className="text-forest" />
                              ) : (
                                <Square size={16} className="text-mid-gray" />
                              )}
                            </button>
                          )}
                        </td>
                      )}
                      <td className="table-cell text-sm text-charcoal">
                        {carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown'}
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {shift ? formatDate(shift.date) : '-'}
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {ts.clockIn ? format(new Date(ts.clockIn), 'h:mm a') : '-'}
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {ts.clockOut ? format(new Date(ts.clockOut), 'h:mm a') : '-'}
                      </td>
                      <td className="table-cell text-sm text-charcoal">
                        {ts.breakMinutes}m
                      </td>
                      <td className="table-cell text-sm font-medium text-charcoal">
                        {ts.totalHours != null ? `${ts.totalHours.toFixed(2)}h` : '-'}
                      </td>
                      <td className="table-cell">
                        <span className={cn('badge text-xs', statusBadge(ts.status))}>
                          {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                        </span>
                      </td>
                      {canApproveTimesheets && (
                        <td className="table-cell">
                          {isPending && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApprove(ts.id)}
                                className="p-1.5 rounded-lg hover:bg-green-50 transition-colors text-mid-gray hover:text-green-600"
                                title="Approve"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                onClick={() => handleReject(ts.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-mid-gray hover:text-red-600"
                                title="Reject"
                              >
                                <XCircle size={16} />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
