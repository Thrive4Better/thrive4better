import { useState, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  startOfWeek,
  endOfWeek,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import {
  Plus,
  Phone,
  Mail,
  Users,
  Clock,
  Trash2,
  Edit3,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import type { Carer } from '@/types';
import { cn } from '@/lib/utils';
import SlideOver from '@/components/ui/SlideOver';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StatusBadge from '@/components/ui/StatusBadge';
import EmptyState from '@/components/ui/EmptyState';

// ── Constants ──────────────────────────────────────────────

const CARER_STATUSES = ['Active', 'Unavailable', 'On Leave'] as const;

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const QUALIFICATIONS = [
  'First Aid',
  'NDIS Worker Screening',
  'Manual Handling',
  'Medication Administration',
];

const AVATAR_COLORS = [
  'bg-forest text-white',
  'bg-sage text-white',
  'bg-burgundy text-white',
  'bg-amber-500 text-white',
  'bg-blue-500 text-white',
  'bg-forest-mid text-white',
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── Carer Form Schema ──────────────────────────────────────

const carerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().min(1, 'Phone is required'),
  email: z.string().email('Valid email is required'),
  role: z.string().min(1, 'Role is required'),
  qualifications: z.array(z.string()),
  availability: z.array(z.string()),
  status: z.enum(CARER_STATUSES),
  notes: z.string(),
});

type CarerFormData = z.infer<typeof carerSchema>;

// ── Component ──────────────────────────────────────────────

export default function CarersList() {
  const {
    carers,
    shifts,
    clients,
    addCarer,
    updateCarer,
    deleteCarer,
    getShiftsByCarer,
  } = useStore();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingCarer, setEditingCarer] = useState<Carer | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Current week for hours calculation
  const thisWeekStart = useMemo(
    () => startOfWeek(new Date(), { weekStartsOn: 1 }),
    []
  );
  const thisWeekEnd = useMemo(
    () => endOfWeek(new Date(), { weekStartsOn: 1 }),
    []
  );

  // Per-carer stats
  const carerStats = useMemo(() => {
    const stats: Record<string, { weeklyHours: number; clientCount: number }> = {};
    carers.forEach((carer) => {
      const carerShifts = getShiftsByCarer(carer.id);
      const weekShifts = carerShifts.filter((s) => {
        const d = parseISO(s.date);
        return isWithinInterval(d, { start: thisWeekStart, end: thisWeekEnd });
      });
      const weeklyHours = weekShifts.reduce((sum, s) => sum + s.hours, 0);
      const uniqueClients = new Set(carerShifts.map((s) => s.clientId));
      stats[carer.id] = {
        weeklyHours: Math.round(weeklyHours * 100) / 100,
        clientCount: uniqueClients.size,
      };
    });
    return stats;
  }, [carers, getShiftsByCarer, thisWeekStart, thisWeekEnd]);

  // Drawer actions
  const openNewCarer = useCallback(() => {
    setEditingCarer(null);
    setDrawerOpen(true);
  }, []);

  const openEditCarer = useCallback((carer: Carer) => {
    setEditingCarer(carer);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditingCarer(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Carers</h1>
          <p className="text-sm text-mid-gray mt-1">
            {carers.length} carer{carers.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button onClick={openNewCarer} className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          Add Carer
        </button>
      </div>

      {/* Carer Cards */}
      {carers.length === 0 ? (
        <EmptyState
          icon={UserPlus}
          title="No carers yet"
          description="Add your first carer to start building your team roster."
          action={{ label: 'Add Carer', onClick: openNewCarer }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {carers.map((carer) => {
            const initials = `${carer.firstName[0]}${carer.lastName[0]}`.toUpperCase();
            const stats = carerStats[carer.id] || { weeklyHours: 0, clientCount: 0 };
            const avatarColor = getAvatarColor(carer.id);

            return (
              <div
                key={carer.id}
                className="card p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openEditCarer(carer)}
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                      avatarColor
                    )}
                  >
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-charcoal truncate">
                        {carer.firstName} {carer.lastName}
                      </h3>
                      <StatusBadge status={carer.status} />
                    </div>
                    <p className="text-sm text-mid-gray mt-0.5">{carer.role}</p>

                    {/* Contact */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm text-mid-gray">
                        <Phone size={13} className="flex-shrink-0" />
                        <span className="truncate">{carer.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-mid-gray">
                        <Mail size={13} className="flex-shrink-0" />
                        <span className="truncate">{carer.email}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-sage-pale">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock size={14} className="text-sage" />
                        <span className="text-charcoal font-medium">
                          {stats.weeklyHours}h
                        </span>
                        <span className="text-mid-gray">this week</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users size={14} className="text-sage" />
                        <span className="text-charcoal font-medium">
                          {stats.clientCount}
                        </span>
                        <span className="text-mid-gray">
                          client{stats.clientCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Qualifications preview */}
                    {carer.qualifications.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {carer.qualifications.map((q) => (
                          <span
                            key={q}
                            className="inline-block text-[11px] px-2 py-0.5 rounded-full bg-sage-pale text-forest"
                          >
                            {q}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Carer Drawer */}
      <SlideOver
        open={drawerOpen}
        onClose={closeDrawer}
        title={editingCarer ? 'Edit Carer' : 'New Carer'}
        wide
      >
        <CarerForm
          carer={editingCarer}
          onSave={(data) => {
            if (editingCarer) {
              updateCarer(editingCarer.id, data);
              toast.success('Carer updated');
            } else {
              addCarer(data);
              toast.success('Carer added');
            }
            closeDrawer();
          }}
          onDelete={
            editingCarer
              ? () => setDeleteModalOpen(true)
              : undefined
          }
          onCancel={closeDrawer}
        />
      </SlideOver>

      {/* Delete Confirmation */}
      <ConfirmModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          if (editingCarer) {
            deleteCarer(editingCarer.id);
            toast.success('Carer deleted');
            setDeleteModalOpen(false);
            closeDrawer();
          }
        }}
        title="Delete Carer"
        message="Are you sure you want to delete this carer? All associated shift assignments will remain but won't have an assigned carer."
      />
    </div>
  );
}

// ── Carer Form Sub-Component ───────────────────────────────

interface CarerFormProps {
  carer: Carer | null;
  onSave: (data: Omit<Carer, 'id' | 'createdAt'>) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

function CarerForm({ carer, onSave, onDelete, onCancel }: CarerFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CarerFormData>({
    resolver: zodResolver(carerSchema),
    defaultValues: carer
      ? {
          firstName: carer.firstName,
          lastName: carer.lastName,
          phone: carer.phone,
          email: carer.email,
          role: carer.role,
          qualifications: carer.qualifications,
          availability: carer.availability,
          status: carer.status,
          notes: carer.notes,
        }
      : {
          firstName: '',
          lastName: '',
          phone: '',
          email: '',
          role: '',
          qualifications: [],
          availability: [],
          status: 'Active',
          notes: '',
        },
  });

  const qualifications = watch('qualifications');
  const availability = watch('availability');

  const toggleQualification = useCallback(
    (qual: string) => {
      const current = qualifications || [];
      if (current.includes(qual)) {
        setValue(
          'qualifications',
          current.filter((q) => q !== qual)
        );
      } else {
        setValue('qualifications', [...current, qual]);
      }
    },
    [qualifications, setValue]
  );

  const toggleAvailability = useCallback(
    (day: string) => {
      const current = availability || [];
      if (current.includes(day)) {
        setValue(
          'availability',
          current.filter((d) => d !== day)
        );
      } else {
        setValue('availability', [...current, day]);
      }
    },
    [availability, setValue]
  );

  const onSubmit = (data: CarerFormData) => {
    onSave({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      role: data.role,
      qualifications: data.qualifications,
      availability: data.availability,
      status: data.status,
      notes: data.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">First Name</label>
          <input {...register('firstName')} className="input-field" placeholder="First name" />
          {errors.firstName && (
            <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-charcoal mb-1">Last Name</label>
          <input {...register('lastName')} className="input-field" placeholder="Last name" />
          {errors.lastName && (
            <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Contact */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Phone</label>
        <input {...register('phone')} className="input-field" placeholder="04xx xxx xxx" />
        {errors.phone && (
          <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
        <input
          type="email"
          {...register('email')}
          className="input-field"
          placeholder="carer@example.com"
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Role / Title</label>
        <input
          {...register('role')}
          className="input-field"
          placeholder="e.g. Support Worker, Team Leader"
        />
        {errors.role && (
          <p className="text-sm text-red-600 mt-1">{errors.role.message}</p>
        )}
      </div>

      {/* Qualifications */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-2">Qualifications</label>
        <div className="grid grid-cols-2 gap-2">
          {QUALIFICATIONS.map((qual) => {
            const checked = (qualifications || []).includes(qual);
            return (
              <label
                key={qual}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm',
                  checked
                    ? 'border-forest bg-sage-pale/50 text-forest'
                    : 'border-sage-pale text-mid-gray hover:border-sage'
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleQualification(qual)}
                  className="rounded border-sage text-forest focus:ring-forest"
                />
                {qual}
              </label>
            );
          })}
        </div>
      </div>

      {/* Availability */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-2">Availability</label>
        <div className="flex flex-wrap gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const active = (availability || []).includes(day);
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggleAvailability(day)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                  active
                    ? 'bg-forest text-white'
                    : 'bg-sage-pale text-mid-gray hover:bg-sage-light'
                )}
              >
                {day.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Status</label>
        <select {...register('status')} className="input-field">
          {CARER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-charcoal mb-1">Notes</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="input-field resize-none"
          placeholder="Any additional notes about this carer..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-sage-pale">
        <div>
          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {carer ? 'Update Carer' : 'Add Carer'}
          </button>
        </div>
      </div>
    </form>
  );
}
