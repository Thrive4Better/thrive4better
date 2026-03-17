import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatTime } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Clock,
  PlayCircle,
  FileText,
  AlertTriangle,
  Calendar,
  ClipboardList,
  Star,
} from 'lucide-react';
import {
  isToday,
  parseISO,
  addDays,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from 'date-fns';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { profile, carerId } = useAuth();
  const { shifts, sessionNotes, timesheets, clients, activityReviews } = useStore();
  const getShiftsByCarer = useStore((s) => s.getShiftsByCarer);
  const getTimesheetsByCarer = useStore((s) => s.getTimesheetsByCarer);

  const userName = profile?.fullName || 'there';

  const myShifts = useMemo(() => {
    if (!carerId) return [];
    return getShiftsByCarer(carerId);
  }, [carerId, getShiftsByCarer, shifts]);

  const todayShifts = useMemo(
    () =>
      myShifts
        .filter((s) => isToday(parseISO(s.date)))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [myShifts]
  );

  const weekShifts = useMemo(() => {
    const today = startOfDay(new Date());
    const weekEnd = endOfDay(addDays(today, 7));
    return myShifts
      .filter((s) => {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: today, end: weekEnd }) && !isToday(d);
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  }, [myShifts]);

  const recentNotes = useMemo(() => {
    if (!carerId) return [];
    return sessionNotes
      .filter((n) => n.carerId === carerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [carerId, sessionNotes]);

  const pendingTimesheets = useMemo(() => {
    if (!carerId) return 0;
    return getTimesheetsByCarer(carerId).filter((t) => t.status === 'pending').length;
  }, [carerId, getTimesheetsByCarer, timesheets]);

  const getClientName = (id: string) => {
    const c = clients.find((cl) => cl.id === id);
    return c ? `${c.firstName} ${c.lastName}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold text-charcoal">
          Welcome back, {userName.split(' ')[0]}
        </h1>
        <p className="text-sm text-mid-gray mt-1">
          Here is an overview of your schedule and tasks.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => navigate('/my-shifts')}
          className="btn-primary"
        >
          <PlayCircle size={16} /> Clock In
        </button>
        <button
          onClick={() => navigate('/my-shifts')}
          className="btn-primary"
        >
          <FileText size={16} /> Add Session Note
        </button>
        <button
          onClick={() => navigate('/incidents/new')}
          className="btn-primary"
        >
          <AlertTriangle size={16} /> Report Incident
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mid-gray">Today's Shifts</p>
              <p className="text-3xl font-semibold text-charcoal mt-1">{todayShifts.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sage-pale flex items-center justify-center">
              <Clock size={22} className="text-forest" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mid-gray">This Week</p>
              <p className="text-3xl font-semibold text-charcoal mt-1">{weekShifts.length + todayShifts.length}</p>
              <p className="text-xs text-sage mt-1">upcoming shifts</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sage-pale flex items-center justify-center">
              <Calendar size={22} className="text-forest" />
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-mid-gray">Pending Timesheets</p>
              <p className="text-3xl font-semibold text-charcoal mt-1">{pendingTimesheets}</p>
              <p className="text-xs text-mid-gray mt-1">awaiting approval</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClipboardList size={22} className="text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Today's Shifts */}
      <div className="card">
        <h3 className="text-sm font-semibold text-charcoal mb-4">Today's Shifts</h3>
        {todayShifts.length === 0 ? (
          <p className="text-sm text-mid-gray py-6 text-center">No shifts scheduled for today</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-sage-pale">
                  <th className="table-header">Time</th>
                  <th className="table-header">Participant</th>
                  <th className="table-header">Service Type</th>
                  <th className="table-header">Status</th>
                </tr>
              </thead>
              <tbody>
                {todayShifts.map((shift) => (
                  <tr key={shift.id} className="border-b border-sage-pale/50 hover:bg-sage-pale/20">
                    <td className="table-cell font-medium">
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                    </td>
                    <td className="table-cell">{getClientName(shift.clientId)}</td>
                    <td className="table-cell">{shift.serviceType}</td>
                    <td className="table-cell">
                      <StatusBadge status={shift.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Upcoming Shifts This Week */}
        <div className="card">
          <h3 className="text-sm font-semibold text-charcoal mb-4">Upcoming This Week</h3>
          {weekShifts.length === 0 ? (
            <p className="text-sm text-mid-gray py-6 text-center">No more shifts this week</p>
          ) : (
            <div className="space-y-2">
              {weekShifts.slice(0, 5).map((shift) => (
                <div
                  key={shift.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-sage-pale/30"
                >
                  <div>
                    <p className="text-sm font-medium text-charcoal">
                      {getClientName(shift.clientId)}
                    </p>
                    <p className="text-xs text-mid-gray">
                      {formatDate(shift.date)} | {formatTime(shift.startTime)} -{' '}
                      {formatTime(shift.endTime)}
                    </p>
                  </div>
                  <StatusBadge status={shift.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Session Notes */}
        <div className="card">
          <h3 className="text-sm font-semibold text-charcoal mb-4">Recent Session Notes</h3>
          {recentNotes.length === 0 ? (
            <p className="text-sm text-mid-gray py-6 text-center">No session notes yet</p>
          ) : (
            <div className="space-y-2">
              {recentNotes.map((note) => (
                <div
                  key={note.id}
                  className="py-2 px-3 rounded-lg bg-sage-pale/30"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-charcoal">
                      {getClientName(note.clientId)}
                    </p>
                    <span className="text-xs text-mid-gray">{formatDate(note.createdAt)}</span>
                  </div>
                  <p className="text-xs text-mid-gray mt-1 line-clamp-2">{note.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Client Activity Feedback (activity ratings only, NOT carer ratings) */}
      {carerId && (() => {
        const myReviews = activityReviews
          .filter((r) => r.carerId === carerId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5);
        if (myReviews.length === 0) return null;
        return (
          <div className="card">
            <h3 className="text-sm font-semibold text-charcoal mb-4 flex items-center gap-2">
              <Star size={16} className="text-amber-500" />
              Client Activity Feedback
            </h3>
            <p className="text-xs text-mid-gray mb-3">See how clients rated activities (to help suggest better ones)</p>
            <div className="space-y-2">
              {myReviews.map((review) => {
                const shift = shifts.find((s) => s.id === review.shiftId);
                return (
                  <div key={review.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-sage-pale/30">
                    <div>
                      <p className="text-sm font-medium text-charcoal">
                        {shift?.serviceType || 'Activity'} - {getClientName(review.clientId)}
                      </p>
                      <p className="text-xs text-mid-gray">{formatDate(review.createdAt)}</p>
                      {review.activityFeedback && (
                        <p className="text-xs text-mid-gray mt-0.5 italic">"{review.activityFeedback}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-semibold text-charcoal">{review.activityRating}/5</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
