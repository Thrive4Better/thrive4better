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
  Sparkles,
  X,
  Check,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { Timesheet, TimesheetStatus } from '@/types';
import { cn, formatDate, formatTime } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import TableFilter from '@/components/ui/TableFilter';

// ── Parsed Timesheet Data ──
interface ParsedTimesheetData {
  clientName: string | null;
  serviceType: string | null;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
  hours: number | null;
  description: string | null;
  supportCategory: string | null;
  confidence: number;
}

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
    clients,
    shifts,
    addTimesheet,
    addShift,
    updateTimesheet,
    getCarerById,
  } = useStore();
  const { profile, session } = useAuth();
  const { canApproveTimesheets } = usePermissions();

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCarerId, setFilterCarerId] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── AI Natural Language Input ──
  const [nlInput, setNlInput] = useState('');
  const [nlParsing, setNlParsing] = useState(false);
  const [nlParsed, setNlParsed] = useState<ParsedTimesheetData | null>(null);
  const [nlCreating, setNlCreating] = useState(false);

  const handleNlParse = async () => {
    if (!nlInput.trim()) return;

    setNlParsing(true);
    setNlParsed(null);

    try {
      const token = session?.access_token;
      if (!token) {
        toast.error('You must be logged in to use AI parsing');
        return;
      }

      const clientNames = clients
        .filter((c: any) => c.status === 'Active')
        .map((c: any) => `${c.firstName} ${c.lastName}`);

      const res = await fetch('/api/parse-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: nlInput, clientNames }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to parse input');
      }

      setNlParsed(data.parsed);
      toast.success('Parsed successfully! Review the details below.');
    } catch (err) {
      console.error('Parse error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to parse input');
    } finally {
      setNlParsing(false);
    }
  };

  const handleNlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNlParse();
    }
  };

  const handleCreateTimesheetFromParsed = async () => {
    if (!nlParsed) return;

    setNlCreating(true);
    try {
      // Find matching carer (use first carer or profile's carer)
      const carerId = profile?.carerId || (carers.length > 0 ? carers[0].id : '');
      if (!carerId) {
        toast.error('No carer profile found. Please set up a carer first.');
        setNlCreating(false);
        return;
      }

      // Find matching client
      const matchedClient = nlParsed.clientName
        ? clients.find((c: any) => {
            const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
            return fullName.includes((nlParsed.clientName || '').toLowerCase());
          })
        : null;

      const clientId = matchedClient?.id || (clients.length > 0 ? clients[0].id : '');

      // Build clock in/out from parsed times and date
      const dateStr = nlParsed.date || format(new Date(), 'yyyy-MM-dd');
      const clockIn = nlParsed.startTime
        ? new Date(`${dateStr}T${nlParsed.startTime}:00`).toISOString()
        : new Date(`${dateStr}T09:00:00`).toISOString();
      const clockOut = nlParsed.endTime
        ? new Date(`${dateStr}T${nlParsed.endTime}:00`).toISOString()
        : undefined;

      const totalHours = nlParsed.hours || (clockOut
        ? Math.round(((new Date(clockOut).getTime() - new Date(clockIn).getTime()) / 3600000) * 100) / 100
        : undefined);

      // Create a shift first (timesheet requires a shiftId)
      const shiftData = {
        clientId,
        carerId,
        date: dateStr,
        startTime: nlParsed.startTime || '09:00',
        endTime: nlParsed.endTime || '17:00',
        serviceType: (nlParsed.serviceType as any) || 'Other',
        supportCategory: nlParsed.supportCategory || '',
        ndisLineItemCode: '',
        hourlyRate: 0,
        totalAmount: 0,
        hours: totalHours || 0,
        notes: nlParsed.description || '',
        status: 'Completed' as const,
        convertToInvoice: false,
      };

      await addShift(shiftData);

      // Find the newly created shift
      const newShift = useStore.getState().shifts.find(
        (s) => s.carerId === carerId && s.date === dateStr && s.startTime === shiftData.startTime && s.status === 'Completed'
      );

      if (!newShift) {
        toast.error('Failed to create associated shift');
        setNlCreating(false);
        return;
      }

      await addTimesheet({
        carerId,
        shiftId: newShift.id,
        clockIn,
        clockOut,
        breakMinutes: 0,
        totalHours,
        status: 'pending',
        notes: nlParsed.description || '',
      });

      toast.success('Timesheet created successfully!');
      setNlParsed(null);
      setNlInput('');
    } catch (err) {
      console.error('Create timesheet error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create timesheet');
    } finally {
      setNlCreating(false);
    }
  };

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

    // Keyword search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) => {
        const carer = getCarerById(t.carerId);
        const shift = shifts.find((s) => s.id === t.shiftId);
        const carerName = carer ? `${carer.firstName} ${carer.lastName}`.toLowerCase() : '';
        const shiftDate = shift?.date ?? '';
        return (
          carerName.includes(q) ||
          shiftDate.includes(q) ||
          t.status.toLowerCase().includes(q)
        );
      });
    }

    if (filterStatus) result = result.filter((t) => t.status === filterStatus);
    if (filterCarerId) result = result.filter((t) => t.carerId === filterCarerId);
    result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return result;
  }, [timesheets, searchQuery, filterStatus, filterCarerId, getCarerById, shifts]);

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

      {/* AI Natural Language Input */}
      <div className="card">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles size={16} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-charcoal">Quick Entry with AI</h3>
              <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">Beta</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={nlInput}
                onChange={(e) => setNlInput(e.target.value)}
                onKeyDown={handleNlKeyDown}
                placeholder="Type what happened... e.g. 'Sarah worked with James, Monday 9am-1pm community access'"
                className="input-field flex-1"
                disabled={nlParsing}
              />
              <button
                onClick={handleNlParse}
                disabled={nlParsing || !nlInput.trim()}
                className={cn('btn-primary whitespace-nowrap', (nlParsing || !nlInput.trim()) && 'opacity-50 cursor-not-allowed')}
              >
                {nlParsing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                Parse
              </button>
            </div>
          </div>
        </div>

        {/* Parsed Result Preview */}
        {nlParsed && (
          <div className="mt-4 border border-purple-200 rounded-xl bg-purple-50/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-charcoal">Parsed Result</h4>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  nlParsed.confidence >= 0.8 ? 'bg-green-100 text-green-700' :
                  nlParsed.confidence >= 0.5 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                )}>
                  {Math.round(nlParsed.confidence * 100)}% confident
                </span>
                <button
                  onClick={() => setNlParsed(null)}
                  className="p-1 hover:bg-purple-200/50 rounded transition-colors"
                >
                  <X size={14} className="text-mid-gray" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {nlParsed.clientName && (
                <div>
                  <span className="text-xs text-mid-gray block">Client</span>
                  <span className="font-medium">{nlParsed.clientName}</span>
                </div>
              )}
              {nlParsed.serviceType && (
                <div>
                  <span className="text-xs text-mid-gray block">Activity Type</span>
                  <span className="font-medium">{nlParsed.serviceType}</span>
                </div>
              )}
              {nlParsed.date && (
                <div>
                  <span className="text-xs text-mid-gray block">Date</span>
                  <span className="font-medium">{formatDate(nlParsed.date)}</span>
                </div>
              )}
              {(nlParsed.startTime || nlParsed.endTime) && (
                <div>
                  <span className="text-xs text-mid-gray block">Time</span>
                  <span className="font-medium">{nlParsed.startTime || '?'} - {nlParsed.endTime || '?'}</span>
                </div>
              )}
              {nlParsed.hours != null && (
                <div>
                  <span className="text-xs text-mid-gray block">Hours</span>
                  <span className="font-medium">{nlParsed.hours}h</span>
                </div>
              )}
              {nlParsed.description && (
                <div className="col-span-2">
                  <span className="text-xs text-mid-gray block">Description</span>
                  <span className="font-medium">{nlParsed.description}</span>
                </div>
              )}
              {nlParsed.supportCategory && (
                <div className="col-span-2">
                  <span className="text-xs text-mid-gray block">Category</span>
                  <span className="font-medium">{nlParsed.supportCategory}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setNlParsed(null)} className="btn-ghost text-sm">
                Dismiss
              </button>
              <button
                onClick={handleCreateTimesheetFromParsed}
                disabled={nlCreating}
                className={cn('btn-primary text-sm', nlCreating && 'opacity-50 cursor-not-allowed')}
              >
                {nlCreating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Create Timesheet from this
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Bar */}
      <TableFilter
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by carer name, shift date..."
        filterOptions={[
          {
            label: 'All Statuses',
            value: 'status',
            options: STATUS_OPTIONS.map((s) => ({
              label: s.charAt(0).toUpperCase() + s.slice(1),
              value: s,
            })),
          },
          {
            label: 'All Carers',
            value: 'carer',
            options: carers.map((c) => ({
              label: `${c.firstName} ${c.lastName}`,
              value: c.id,
            })),
          },
        ]}
        activeFilters={{ status: filterStatus, carer: filterCarerId }}
        onFilterChange={(key, value) => {
          if (key === 'status') setFilterStatus(value);
          if (key === 'carer') setFilterCarerId(value);
        }}
        onClearFilters={() => {
          setSearchQuery('');
          setFilterStatus('');
          setFilterCarerId('');
        }}
        resultCount={filtered.length}
        totalCount={timesheets.length}
      />

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
