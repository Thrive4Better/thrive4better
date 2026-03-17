import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatTime } from '@/lib/utils';
import StatusBadge from '@/components/ui/StatusBadge';
import {
  Star,
  MessageSquare,
  ClipboardList,
  Calendar,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { parseISO, isAfter, isBefore, startOfDay } from 'date-fns';

export default function ClientDashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { shifts, activityReviews, clients, carers } = useStore();
  const getCarerById = useStore((s) => s.getCarerById);

  const userName = profile?.fullName || 'there';

  // Find client record linked to this user profile
  // The profile.id is the auth user id; we match by looking for a client
  // whose id matches profile.carerId (repurposed for client linking) or by email
  const myClientId = profile?.carerId || '';

  const myShifts = useMemo(() => {
    if (!myClientId) return [];
    return shifts.filter((s) => s.clientId === myClientId);
  }, [myClientId, shifts]);

  const upcomingShifts = useMemo(() => {
    const today = startOfDay(new Date());
    return myShifts
      .filter((s) => {
        try {
          return isAfter(parseISO(s.date), today) || formatDate(s.date) === formatDate(new Date().toISOString());
        } catch {
          return false;
        }
      })
      .filter((s) => s.status !== 'Cancelled' && s.status !== 'Completed')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 5);
  }, [myShifts]);

  const recentCompleted = useMemo(() => {
    return myShifts
      .filter((s) => s.status === 'Completed')
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [myShifts]);

  const myReviews = useMemo(() => {
    if (!myClientId) return [];
    return activityReviews.filter((r) => r.clientId === myClientId);
  }, [myClientId, activityReviews]);

  const reviewedShiftIds = useMemo(() => new Set(myReviews.map((r) => r.shiftId)), [myReviews]);

  const unratedCompleted = useMemo(() => {
    return myShifts
      .filter((s) => s.status === 'Completed' && !reviewedShiftIds.has(s.id))
      .length;
  }, [myShifts, reviewedShiftIds]);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card p-6 bg-gradient-to-r from-forest/5 to-sage/10">
        <h1 className="text-2xl font-bold text-charcoal">
          Welcome back, {userName.split(' ')[0]}
        </h1>
        <p className="text-sm text-mid-gray mt-1">
          Here is an overview of your upcoming activities and recent history.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/rate-activities')}
          className="card p-4 hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Star size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal group-hover:text-forest transition-colors">Rate an Activity</p>
              {unratedCompleted > 0 && (
                <p className="text-xs text-amber-600">{unratedCompleted} unrated</p>
              )}
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/my-profile')}
          className="card p-4 hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MessageSquare size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal group-hover:text-forest transition-colors">My Profile</p>
              <p className="text-xs text-mid-gray">Update preferences</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/my-care-plan')}
          className="card p-4 hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <ClipboardList size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-charcoal group-hover:text-forest transition-colors">My Care Plan</p>
              <p className="text-xs text-mid-gray">View your plan</p>
            </div>
          </div>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Shifts */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-sage-pale bg-sage-pale/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-forest" />
              <h2 className="font-semibold text-charcoal">Upcoming Appointments</h2>
            </div>
          </div>
          <div className="divide-y divide-sage-pale/50">
            {upcomingShifts.length === 0 ? (
              <div className="p-6 text-center text-mid-gray text-sm">
                No upcoming appointments
              </div>
            ) : (
              upcomingShifts.map((shift) => {
                const carer = getCarerById(shift.carerId);
                return (
                  <div key={shift.id} className="px-4 py-3 hover:bg-sage-pale/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {shift.serviceType}
                        </p>
                        <p className="text-xs text-mid-gray mt-0.5">
                          with {carer ? `${carer.firstName} ${carer.lastName}` : 'TBA'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-charcoal">{formatDate(shift.date)}</p>
                        <p className="text-xs text-mid-gray flex items-center gap-1 justify-end">
                          <Clock size={12} />
                          {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-sage-pale bg-sage-pale/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-forest" />
              <h2 className="font-semibold text-charcoal">Recent Activity</h2>
            </div>
            {recentCompleted.length > 0 && (
              <button
                onClick={() => navigate('/rate-activities')}
                className="text-xs text-forest hover:underline flex items-center gap-1"
              >
                Rate activities <ArrowRight size={12} />
              </button>
            )}
          </div>
          <div className="divide-y divide-sage-pale/50">
            {recentCompleted.length === 0 ? (
              <div className="p-6 text-center text-mid-gray text-sm">
                No recent activity
              </div>
            ) : (
              recentCompleted.map((shift) => {
                const carer = getCarerById(shift.carerId);
                const hasReview = reviewedShiftIds.has(shift.id);
                return (
                  <div key={shift.id} className="px-4 py-3 hover:bg-sage-pale/10 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-charcoal">
                          {shift.serviceType}
                        </p>
                        <p className="text-xs text-mid-gray mt-0.5">
                          {carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown'} - {formatDate(shift.date)}
                        </p>
                      </div>
                      {hasReview ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Rated</span>
                      ) : (
                        <button
                          onClick={() => navigate(`/rate-activities?shift=${shift.id}`)}
                          className="text-xs text-forest hover:underline"
                        >
                          Rate
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
