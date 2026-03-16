import { useMemo, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatTime, getServiceTypeColor } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  List,
  CalendarDays,
  PlayCircle,
  StopCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  parseISO,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  format,
  eachDayOfInterval,
  isSameDay,
} from 'date-fns';
import toast from 'react-hot-toast';

export default function MyShifts() {
  const { carerId } = useAuth();
  const { shifts, timesheets, clients } = useStore();
  const getShiftsByCarer = useStore((s) => s.getShiftsByCarer);
  const addTimesheet = useStore((s) => s.addTimesheet);
  const updateTimesheet = useStore((s) => s.updateTimesheet);

  const [view, setView] = useState<'list' | 'week'>('list');
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const myShifts = useMemo(() => {
    if (!carerId) return [];
    return getShiftsByCarer(carerId).sort(
      (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
    );
  }, [carerId, getShiftsByCarer, shifts]);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekShifts = useMemo(
    () =>
      myShifts.filter((s) => {
        const d = parseISO(s.date);
        return d >= weekStart && d <= weekEnd;
      }),
    [myShifts, weekStart, weekEnd]
  );

  const displayShifts = view === 'week' ? weekShifts : myShifts;

  const getClientName = (id: string) => {
    const c = clients.find((cl) => cl.id === id);
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
  };

  const getTimesheetForShift = (shiftId: string) => {
    return timesheets.find((t) => t.shiftId === shiftId);
  };

  const handleClockIn = async (shift: typeof myShifts[0]) => {
    if (!carerId) return;
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
  };

  const handleClockOut = async (shift: typeof myShifts[0]) => {
    const ts = getTimesheetForShift(shift.id);
    if (!ts) return;
    try {
      const clockOut = new Date().toISOString();
      const clockInTime = new Date(ts.clockIn!).getTime();
      const clockOutTime = new Date(clockOut).getTime();
      const totalMs = clockOutTime - clockInTime;
      const totalHours = Math.round(((totalMs / 1000 / 60 / 60) - (ts.breakMinutes / 60)) * 100) / 100;
      await updateTimesheet(ts.id, {
        clockOut,
        totalHours: Math.max(0, totalHours),
      });
      toast.success('Clocked out successfully');
    } catch {
      toast.error('Failed to clock out');
    }
  };

  const [noteShiftId, setNoteShiftId] = useState<string | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const addSessionNote = useStore((s) => s.addSessionNote);

  const handleAddNote = async () => {
    if (!noteShiftId || !noteContent.trim() || !carerId) return;
    const shift = myShifts.find((s) => s.id === noteShiftId);
    if (!shift) return;
    try {
      await addSessionNote({
        shiftId: shift.id,
        carerId,
        clientId: shift.clientId,
        content: noteContent.trim(),
        participantMood: 'good',
        goalsAddressed: [],
        followUpRequired: false,
        followUpNotes: '',
      });
      toast.success('Session note added');
      setNoteShiftId(null);
      setNoteContent('');
    } catch {
      toast.error('Failed to add session note');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-charcoal">My Shifts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-lg transition-colors ${
              view === 'list' ? 'bg-forest text-white' : 'bg-sage-pale text-mid-gray hover:text-charcoal'
            }`}
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setView('week')}
            className={`p-2 rounded-lg transition-colors ${
              view === 'week' ? 'bg-forest text-white' : 'bg-sage-pale text-mid-gray hover:text-charcoal'
            }`}
          >
            <CalendarDays size={18} />
          </button>
        </div>
      </div>

      {/* Week Navigation (for week view) */}
      {view === 'week' && (
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
      )}

      {/* Week View */}
      {view === 'week' ? (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dayShifts = weekShifts.filter((s) => isSameDay(parseISO(s.date), day));
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`card min-h-[160px] ${isToday ? 'ring-2 ring-forest/30' : ''}`}
              >
                <p className={`text-xs font-semibold mb-2 ${isToday ? 'text-forest' : 'text-mid-gray'}`}>
                  {format(day, 'EEE dd')}
                </p>
                {dayShifts.length === 0 ? (
                  <p className="text-xs text-mid-gray/50 text-center mt-4">No shifts</p>
                ) : (
                  <div className="space-y-1.5">
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        className={`p-2 rounded-md text-xs ${getServiceTypeColor(shift.serviceType)}`}
                      >
                        <p className="font-medium truncate">{getClientName(shift.clientId)}</p>
                        <p className="opacity-80">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="card">
          {displayShifts.length === 0 ? (
            <p className="text-sm text-mid-gray py-8 text-center">No shifts assigned</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-sage-pale">
                    <th className="table-header">Date</th>
                    <th className="table-header">Time</th>
                    <th className="table-header">Participant</th>
                    <th className="table-header">Service Type</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayShifts.map((shift) => {
                    const ts = getTimesheetForShift(shift.id);
                    const canClockIn =
                      !ts && (shift.status === 'Scheduled' || shift.status === 'Confirmed');
                    const canClockOut = ts && ts.clockIn && !ts.clockOut;
                    const canAddNote = shift.status === 'Completed';

                    return (
                      <tr
                        key={shift.id}
                        className="border-b border-sage-pale/50 hover:bg-sage-pale/20"
                      >
                        <td className="table-cell font-medium">{formatDate(shift.date)}</td>
                        <td className="table-cell">
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </td>
                        <td className="table-cell">{getClientName(shift.clientId)}</td>
                        <td className="table-cell">
                          <span
                            className={`badge ${getServiceTypeColor(shift.serviceType)}`}
                          >
                            {shift.serviceType}
                          </span>
                        </td>
                        <td className="table-cell">
                          <StatusBadge status={shift.status} />
                        </td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            {canClockIn && (
                              <button
                                onClick={() => handleClockIn(shift)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-forest text-white text-xs hover:bg-forest/90 transition-colors"
                              >
                                <PlayCircle size={14} /> Clock In
                              </button>
                            )}
                            {canClockOut && (
                              <button
                                onClick={() => handleClockOut(shift)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-burgundy text-white text-xs hover:bg-burgundy/90 transition-colors"
                              >
                                <StopCircle size={14} /> Clock Out
                              </button>
                            )}
                            {canAddNote && (
                              <button
                                onClick={() => setNoteShiftId(shift.id)}
                                className="flex items-center gap-1 px-2 py-1 rounded-md bg-sage-pale text-forest text-xs hover:bg-sage transition-colors"
                              >
                                <FileText size={14} /> Add Note
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Session Note Modal */}
      {noteShiftId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setNoteShiftId(null)}
          />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-charcoal mb-4">Add Session Note</h3>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Write your session note here..."
              className="w-full h-32 px-3 py-2 rounded-lg border border-sage-pale text-sm text-charcoal placeholder:text-mid-gray focus:outline-none focus:ring-2 focus:ring-forest/20 resize-none"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setNoteShiftId(null);
                  setNoteContent('');
                }}
                className="px-4 py-2 rounded-lg text-sm text-mid-gray hover:bg-sage-pale transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNote}
                disabled={!noteContent.trim()}
                className="btn-primary disabled:opacity-50"
              >
                Save Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
