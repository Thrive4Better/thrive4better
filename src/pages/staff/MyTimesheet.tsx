import { useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatTime, formatDateTime } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import toast from 'react-hot-toast';

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

export default function MyTimesheet() {
  const { carerId } = useAuth();
  const { timesheets, shifts, clients } = useStore();
  const getTimesheetsByCarer = useStore((s) => s.getTimesheetsByCarer);
  const updateTimesheet = useStore((s) => s.updateTimesheet);

  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });

  const myTimesheets = useMemo(() => {
    if (!carerId) return [];
    return getTimesheetsByCarer(carerId);
  }, [carerId, getTimesheetsByCarer, timesheets]);

  const weekTimesheets = useMemo(() => {
    return myTimesheets.filter((ts) => {
      const shift = shifts.find((s) => s.id === ts.shiftId);
      if (!shift) return false;
      const d = parseISO(shift.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    }).sort((a, b) => {
      const shiftA = shifts.find((s) => s.id === a.shiftId);
      const shiftB = shifts.find((s) => s.id === b.shiftId);
      if (!shiftA || !shiftB) return 0;
      return shiftA.date.localeCompare(shiftB.date) || shiftA.startTime.localeCompare(shiftB.startTime);
    });
  }, [myTimesheets, shifts, weekStart, weekEnd]);

  const totalHours = useMemo(
    () => weekTimesheets.reduce((sum, ts) => sum + (ts.totalHours || 0), 0),
    [weekTimesheets]
  );

  const getShift = (shiftId: string) => shifts.find((s) => s.id === shiftId);
  const getClientName = (clientId: string) => {
    const c = clients.find((cl) => cl.id === clientId);
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
  };

  const formatClockTime = (iso?: string) => {
    if (!iso) return '-';
    return format(parseISO(iso), 'h:mm a');
  };

  const handleBreakChange = async (tsId: string, value: string) => {
    const mins = parseInt(value, 10);
    if (isNaN(mins) || mins < 0) return;
    try {
      const ts = myTimesheets.find((t) => t.id === tsId);
      if (!ts || !ts.clockIn || !ts.clockOut) {
        await updateTimesheet(tsId, { breakMinutes: mins });
        return;
      }
      const clockInTime = new Date(ts.clockIn).getTime();
      const clockOutTime = new Date(ts.clockOut).getTime();
      const totalMs = clockOutTime - clockInTime;
      const totalHours = Math.max(0, Math.round(((totalMs / 1000 / 60 / 60) - (mins / 60)) * 100) / 100);
      await updateTimesheet(tsId, { breakMinutes: mins, totalHours });
    } catch {
      toast.error('Failed to update break');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-charcoal">My Timesheet</h1>

      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
          className="p-2 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-sm font-medium text-charcoal">
          {format(weekStart, 'dd MMM')} - {format(weekEnd, 'dd MMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
          className="p-2 rounded-lg hover:bg-sage-pale transition-colors text-mid-gray"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Timesheet Table */}
      <div className="card">
        {weekTimesheets.length === 0 ? (
          <p className="text-sm text-mid-gray py-8 text-center">No timesheet entries for this week</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sage-pale">
                  <th className="table-header">Date</th>
                  <th className="table-header">Shift Time</th>
                  <th className="table-header">Participant</th>
                  <th className="table-header">Clock In</th>
                  <th className="table-header">Clock Out</th>
                  <th className="table-header">Break (min)</th>
                  <th className="table-header">Total Hours</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {weekTimesheets.map((ts) => {
                  const shift = getShift(ts.shiftId);
                  return (
                    <tr key={ts.id} className="border-b border-sage-pale/50 hover:bg-sage-pale/20">
                      <td className="table-cell font-medium">
                        {shift ? formatDate(shift.date) : '-'}
                      </td>
                      <td className="table-cell">
                        {shift
                          ? `${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}`
                          : '-'}
                      </td>
                      <td className="table-cell">
                        {shift ? getClientName(shift.clientId) : '-'}
                      </td>
                      <td className="table-cell">{formatClockTime(ts.clockIn)}</td>
                      <td className="table-cell">{formatClockTime(ts.clockOut)}</td>
                      <td className="table-cell">
                        <input
                          type="number"
                          min="0"
                          value={ts.breakMinutes}
                          onChange={(e) => handleBreakChange(ts.id, e.target.value)}
                          className="w-16 px-2 py-1 rounded-md border border-sage-pale text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-forest/20"
                          disabled={ts.status === 'approved'}
                        />
                      </td>
                      <td className="table-cell font-medium">
                        {ts.totalHours != null ? ts.totalHours.toFixed(2) : '-'}
                      </td>
                      <td className="table-cell">
                        <span className={`badge ${statusStyles[ts.status] || 'bg-gray-100 text-gray-600'}`}>
                          {ts.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {/* Summary Row */}
                <tr className="bg-sage-pale/30 font-semibold">
                  <td className="table-cell" colSpan={6}>
                    Week Total
                  </td>
                  <td className="table-cell">{totalHours.toFixed(2)}</td>
                  <td className="table-cell" />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
