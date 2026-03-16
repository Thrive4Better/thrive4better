import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import type { SessionNote, ParticipantMood } from '@/types';
import SlideOver from '@/components/ui/SlideOver';

// ── Constants ──

const MOOD_OPTIONS: { value: ParticipantMood; label: string }[] = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'low', label: 'Low' },
  { value: 'distressed', label: 'Distressed' },
];

// ── Schema ──

const sessionNoteSchema = z.object({
  content: z.string().min(1, 'Session note content is required'),
  participantMood: z.enum(['great', 'good', 'neutral', 'low', 'distressed'] as const),
  goalsAddressed: z.array(z.string()),
  followUpRequired: z.boolean(),
  followUpNotes: z.string(),
});

type SessionNoteFormData = z.infer<typeof sessionNoteSchema>;

// ── Props ──

interface SessionNoteFormProps {
  shiftId: string;
  clientId: string;
  carerId: string;
  onClose: () => void;
  existingNote?: SessionNote;
}

// ── Component ──

export default function SessionNoteForm({
  shiftId,
  clientId,
  carerId,
  onClose,
  existingNote,
}: SessionNoteFormProps) {
  const {
    addSessionNote,
    updateSessionNote,
    deleteSessionNote,
    getCarePlanByClient,
  } = useStore();

  // Get goals from care plan if available
  const carePlan = getCarePlanByClient(clientId);
  const goals = useMemo(() => {
    if (!carePlan?.goals) return [];
    return carePlan.goals;
  }, [carePlan]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SessionNoteFormData>({
    resolver: zodResolver(sessionNoteSchema),
    defaultValues: existingNote
      ? {
          content: existingNote.content,
          participantMood: existingNote.participantMood,
          goalsAddressed: existingNote.goalsAddressed,
          followUpRequired: existingNote.followUpRequired,
          followUpNotes: existingNote.followUpNotes,
        }
      : {
          content: '',
          participantMood: 'good',
          goalsAddressed: [],
          followUpRequired: false,
          followUpNotes: '',
        },
  });

  const followUpRequired = watch('followUpRequired');

  const onSubmit = async (data: SessionNoteFormData) => {
    try {
      if (existingNote) {
        await updateSessionNote(existingNote.id, data);
        toast.success('Session note updated');
      } else {
        await addSessionNote({
          shiftId,
          clientId,
          carerId,
          ...data,
        });
        toast.success('Session note added');
      }
      onClose();
    } catch {
      toast.error('Failed to save session note');
    }
  };

  const handleDelete = async () => {
    if (!existingNote) return;
    try {
      await deleteSessionNote(existingNote.id);
      toast.success('Session note deleted');
      onClose();
    } catch {
      toast.error('Failed to delete session note');
    }
  };

  return (
    <SlideOver
      open
      onClose={onClose}
      title={existingNote ? 'Edit Session Note' : 'Add Session Note'}
      wide
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Session Notes</label>
          <textarea
            {...register('content')}
            rows={5}
            className="input-field resize-none"
            placeholder="Describe the session, activities, participant engagement..."
          />
          {errors.content && (
            <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>
          )}
        </div>

        {/* Participant Mood */}
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Participant Mood</label>
          <select {...register('participantMood')} className="input-field">
            {MOOD_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Goals Addressed */}
        {goals.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-charcoal mb-2">Goals Addressed</label>
            <div className="space-y-2">
              {goals.map((goal) => (
                <label
                  key={goal.id}
                  className="flex items-start gap-2 text-sm text-charcoal cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={goal.id}
                    {...register('goalsAddressed')}
                    className="rounded border-sage text-forest focus:ring-forest mt-0.5"
                  />
                  <span>{goal.description}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {goals.length === 0 && (
          <div className="text-sm text-mid-gray italic">
            No care plan goals found for this participant. Goals can be added in the care plan.
          </div>
        )}

        {/* Follow-up */}
        <label className="flex items-center gap-2 text-sm text-charcoal cursor-pointer">
          <input
            type="checkbox"
            {...register('followUpRequired')}
            className="rounded border-sage text-forest focus:ring-forest"
          />
          Follow-up Required
        </label>

        {followUpRequired && (
          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Follow-up Notes</label>
            <textarea
              {...register('followUpNotes')}
              rows={3}
              className="input-field resize-none"
              placeholder="Describe follow-up actions needed..."
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-sage-pale">
          <div>
            {existingNote && (
              <button
                type="button"
                onClick={handleDelete}
                className="btn-danger flex items-center gap-2"
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {existingNote ? 'Update Note' : 'Save Note'}
            </button>
          </div>
        </div>
      </form>
    </SlideOver>
  );
}
