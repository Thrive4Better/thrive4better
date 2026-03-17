import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate, formatTime } from '@/lib/utils';
import type { ReviewMood } from '@/types';
import {
  Star,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const MOOD_OPTIONS: { value: ReviewMood; label: string; emoji: string; color: string }[] = [
  { value: 'great', label: 'Great', emoji: '\uD83D\uDE01', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'good', label: 'Good', emoji: '\uD83D\uDE0A', color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'okay', label: 'Okay', emoji: '\uD83D\uDE10', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: 'not_great', label: 'Not Great', emoji: '\uD83D\uDE1F', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'bad', label: 'Bad', emoji: '\uD83D\uDE1E', color: 'bg-red-100 text-red-700 border-red-300' },
];

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div>
      <label className="text-sm font-medium text-charcoal">{label}</label>
      <div className="flex gap-1 mt-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(star)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              size={28}
              className={`transition-colors ${
                star <= (hovered || value)
                  ? 'text-amber-400 fill-amber-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
        {value > 0 && (
          <span className="text-xs text-mid-gray ml-2 self-center">
            {value}/5
          </span>
        )}
      </div>
    </div>
  );
}

export default function RateActivity() {
  const [searchParams] = useSearchParams();
  const preselectedShiftId = searchParams.get('shift');
  const { profile } = useAuth();
  const { shifts, activityReviews, addActivityReview } = useStore();
  const getCarerById = useStore((s) => s.getCarerById);

  const myClientId = profile?.carerId || '';

  const completedShifts = useMemo(() => {
    if (!myClientId) return [];
    return shifts
      .filter((s) => s.clientId === myClientId && s.status === 'Completed')
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [myClientId, shifts]);

  const reviewedShiftIds = useMemo(
    () => new Set(activityReviews.filter((r) => r.clientId === myClientId).map((r) => r.shiftId)),
    [activityReviews, myClientId],
  );

  const unratedShifts = useMemo(
    () => completedShifts.filter((s) => !reviewedShiftIds.has(s.id)),
    [completedShifts, reviewedShiftIds],
  );

  const ratedShifts = useMemo(
    () => completedShifts.filter((s) => reviewedShiftIds.has(s.id)),
    [completedShifts, reviewedShiftIds],
  );

  const [activeShiftId, setActiveShiftId] = useState<string | null>(preselectedShiftId || (unratedShifts[0]?.id ?? null));
  const [activityRating, setActivityRating] = useState(0);
  const [carerRating, setCarerRating] = useState(0);
  const [activityFeedback, setActivityFeedback] = useState('');
  const [carerFeedback, setCarerFeedback] = useState('');
  const [mood, setMood] = useState<ReviewMood | ''>('');
  const [submitting, setSubmitting] = useState(false);
  const [showRated, setShowRated] = useState(false);

  const activeShift = completedShifts.find((s) => s.id === activeShiftId);
  const activeCarer = activeShift ? getCarerById(activeShift.carerId) : null;

  const resetForm = () => {
    setActivityRating(0);
    setCarerRating(0);
    setActivityFeedback('');
    setCarerFeedback('');
    setMood('');
  };

  const handleSubmit = async () => {
    if (!activeShift || !mood) return;
    if (activityRating === 0 || carerRating === 0) {
      toast.error('Please provide both ratings');
      return;
    }

    setSubmitting(true);
    try {
      await addActivityReview({
        shiftId: activeShift.id,
        clientId: myClientId,
        carerId: activeShift.carerId,
        activityRating,
        carerRating,
        activityFeedback,
        carerFeedback,
        mood: mood as ReviewMood,
      });
      toast.success('Thank you for your feedback!');
      resetForm();
      // Move to next unrated shift
      const remaining = unratedShifts.filter((s) => s.id !== activeShift.id);
      setActiveShiftId(remaining[0]?.id ?? null);
    } catch (err) {
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">Rate Activities</h1>
        <p className="text-sm text-mid-gray mt-1">
          Share your feedback on completed activities. Your input helps us improve.
        </p>
      </div>

      {/* Unrated activities */}
      {unratedShifts.length === 0 && !activeShiftId ? (
        <div className="card p-8 text-center">
          <Check size={48} className="mx-auto text-green-500 mb-3" />
          <p className="text-charcoal font-medium">All caught up!</p>
          <p className="text-sm text-mid-gray mt-1">You have rated all your completed activities.</p>
        </div>
      ) : (
        <>
          {/* Activity selector */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-sage-pale bg-sage-pale/20">
              <h2 className="font-semibold text-charcoal text-sm">
                Activities to Rate ({unratedShifts.length})
              </h2>
            </div>
            <div className="divide-y divide-sage-pale/50 max-h-48 overflow-y-auto">
              {unratedShifts.map((shift) => {
                const carer = getCarerById(shift.carerId);
                return (
                  <button
                    key={shift.id}
                    onClick={() => { setActiveShiftId(shift.id); resetForm(); }}
                    className={`w-full px-4 py-3 text-left hover:bg-sage-pale/10 transition-colors ${
                      activeShiftId === shift.id ? 'bg-sage-pale/20 border-l-2 border-forest' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-charcoal">{shift.serviceType}</p>
                        <p className="text-xs text-mid-gray">
                          {carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown'} - {formatDate(shift.date)}
                        </p>
                      </div>
                      <span className="text-xs text-mid-gray">
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating form */}
          {activeShift && !reviewedShiftIds.has(activeShift.id) && (
            <div className="card p-5 space-y-5">
              <div className="bg-sage-pale/20 rounded-lg p-4">
                <p className="text-sm font-semibold text-charcoal">{activeShift.serviceType}</p>
                <p className="text-xs text-mid-gray mt-0.5">
                  {formatDate(activeShift.date)} | {formatTime(activeShift.startTime)} - {formatTime(activeShift.endTime)}
                  {activeCarer && ` | ${activeCarer.firstName} ${activeCarer.lastName}`}
                </p>
              </div>

              {/* Mood */}
              <div>
                <label className="text-sm font-medium text-charcoal">How are you feeling about this activity?</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {MOOD_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setMood(opt.value)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                        mood === opt.value
                          ? `${opt.color} border-current shadow-sm`
                          : 'bg-white border-gray-200 text-mid-gray hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-1.5">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Rating */}
              <StarRating
                value={activityRating}
                onChange={setActivityRating}
                label="How was the activity?"
              />

              <div>
                <label className="text-sm font-medium text-charcoal">Activity feedback (optional)</label>
                <textarea
                  value={activityFeedback}
                  onChange={(e) => setActivityFeedback(e.target.value)}
                  rows={2}
                  className="input mt-1"
                  placeholder="What did you enjoy? What could be better?"
                />
              </div>

              {/* Carer Rating */}
              <StarRating
                value={carerRating}
                onChange={setCarerRating}
                label="How was your support worker?"
              />

              <div>
                <label className="text-sm font-medium text-charcoal">Support worker feedback (optional)</label>
                <textarea
                  value={carerFeedback}
                  onChange={(e) => setCarerFeedback(e.target.value)}
                  rows={2}
                  className="input mt-1"
                  placeholder="How did your support worker do?"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || activityRating === 0 || carerRating === 0 || !mood}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <Check size={16} />
                )}
                Submit Feedback
              </button>
            </div>
          )}
        </>
      )}

      {/* Already rated */}
      {ratedShifts.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowRated(!showRated)}
            className="w-full px-4 py-3 border-b border-sage-pale bg-sage-pale/20 flex items-center justify-between"
          >
            <h2 className="font-semibold text-charcoal text-sm">
              Previously Rated ({ratedShifts.length})
            </h2>
            {showRated ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showRated && (
            <div className="divide-y divide-sage-pale/50">
              {ratedShifts.map((shift) => {
                const carer = getCarerById(shift.carerId);
                const review = activityReviews.find((r) => r.shiftId === shift.id);
                return (
                  <div key={shift.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-charcoal">{shift.serviceType}</p>
                        <p className="text-xs text-mid-gray">
                          {carer ? `${carer.firstName} ${carer.lastName}` : 'Unknown'} - {formatDate(shift.date)}
                        </p>
                      </div>
                      {review && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-0.5">
                            <Star size={14} className="text-amber-400 fill-amber-400" />
                            <span className="text-xs text-charcoal">{review.activityRating}/5</span>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            {MOOD_OPTIONS.find((m) => m.value === review.mood)?.emoji}{' '}
                            {MOOD_OPTIONS.find((m) => m.value === review.mood)?.label}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
