import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Clock, MapPin, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import { useStore } from '@/stores/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate, formatTime, generateId } from '@/lib/utils';
import EmptyState from '@/components/ui/EmptyState';
import type { ShiftLog } from '@/types';

const STORAGE_KEY = 't4b_shiftLogs';

function loadShiftLogs(): ShiftLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveShiftLogs(logs: ShiftLog[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
}

const ACTIVITY_TYPES = [
  'Daily Living Support',
  'Community Access',
  'Transport',
  'Social & Recreation',
  'Personal Care',
  'Meal Preparation',
  'Household Tasks',
  'Skill Building',
  'Other',
];

export default function LogShift() {
  const { clients, carers, addShift, addTimesheet } = useStore();
  const { profile } = useAuth();

  const carerId = profile?.carerId || '';
  const carer = carers.find((c) => c.id === carerId);
  const isSubcontractor = carer?.isSubcontractor || false;

  // Only show clients the subcontractor is assigned to (for now, show all active)
  const activeClients = clients.filter((c) => c.status === 'Active');

  const [shiftLogs, setShiftLogs] = useState<ShiftLog[]>(loadShiftLogs);
  const myLogs = useMemo(
    () => shiftLogs.filter((l) => l.carerId === carerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [shiftLogs, carerId],
  );

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');
  const [activityType, setActivityType] = useState(ACTIVITY_TYPES[0]);
  const [notes, setNotes] = useState('');
  const [goalsAddressed, setGoalsAddressed] = useState('');
  const [travelKm, setTravelKm] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setClientId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setStartTime('09:00');
    setEndTime('12:00');
    setActivityType(ACTIVITY_TYPES[0]);
    setNotes('');
    setGoalsAddressed('');
    setTravelKm(0);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
      toast.error('Please select a client');
      return;
    }
    if (!carerId) {
      toast.error('No linked carer profile found');
      return;
    }

    setSubmitting(true);
    try {
      // Calculate hours
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      const totalMinutes = (eh * 60 + em) - (sh * 60 + sm);
      const hours = Math.round((totalMinutes / 60) * 100) / 100;

      if (hours <= 0) {
        toast.error('End time must be after start time');
        setSubmitting(false);
        return;
      }

      // Create shift record
      await addShift({
        clientId,
        carerId,
        date,
        startTime,
        endTime,
        serviceType: 'Daily Living',
        supportCategory: activityType,
        ndisLineItemCode: '',
        hourlyRate: 0,
        totalAmount: 0,
        hours,
        notes: `[Subcontractor Log] ${notes}`,
        status: 'Completed',
        convertToInvoice: false,
      });

      // Create timesheet entry
      const clockIn = new Date(`${date}T${startTime}:00`).toISOString();
      const clockOut = new Date(`${date}T${endTime}:00`).toISOString();
      await addTimesheet({
        carerId,
        shiftId: '', // Will be linked by date/time
        clockIn,
        clockOut,
        breakMinutes: 0,
        totalHours: hours,
        status: 'pending',
        notes: `Logged by subcontractor: ${activityType}`,
      });

      // Save shift log
      const newLog: ShiftLog = {
        id: generateId(),
        carerId,
        clientId,
        date,
        startTime,
        endTime,
        activityType,
        notes,
        goalsAddressed,
        travelKm,
        createdAt: new Date().toISOString(),
      };
      const updatedLogs = [...shiftLogs, newLog];
      saveShiftLogs(updatedLogs);
      setShiftLogs(updatedLogs);

      toast.success('Shift logged successfully');
      resetForm();
    } catch (err) {
      toast.error('Failed to log shift');
    } finally {
      setSubmitting(false);
    }
  };

  const getClientName = (id: string) => {
    const client = clients.find((c) => c.id === id);
    return client ? `${client.firstName} ${client.lastName}` : 'Unknown';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-charcoal">Log Shift</h1>
          <p className="text-sm text-mid-gray mt-1">
            {isSubcontractor ? 'Record your shift work as a subcontractor' : 'Record your shift work'}
          </p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Log New Shift
          </button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card p-5 space-y-5">
          <h2 className="text-base font-semibold text-charcoal">New Shift Entry</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="input-field"
                required
              >
                <option value="">Select client...</option>
                {activeClients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Activity Type</label>
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value)}
                className="input-field"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-charcoal mb-1">Travel Distance (km)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={travelKm}
                onChange={(e) => setTravelKm(parseFloat(e.target.value) || 0)}
                className="input-field"
                placeholder="0"
              />
              <p className="text-xs text-mid-gray mt-1">For vehicle reimbursement</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Notes - What was done</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input-field"
              placeholder="Describe the activities, support provided..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-charcoal mb-1">Goals Addressed</label>
            <textarea
              value={goalsAddressed}
              onChange={(e) => setGoalsAddressed(e.target.value)}
              rows={2}
              className="input-field"
              placeholder="Which care plan goals were worked on..."
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Submitting...' : 'Submit Shift'}
            </button>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Previous Shift Logs */}
      <div>
        <h2 className="text-lg font-semibold text-charcoal mb-3">Previous Shift Logs</h2>
        {myLogs.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No shifts logged yet"
            description="Use the button above to log your first shift."
          />
        ) : (
          <div className="space-y-3">
            {myLogs.map((log) => (
              <div key={log.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-charcoal">{getClientName(log.clientId)}</span>
                      <span className="badge text-xs bg-sage-pale text-forest">{log.activityType}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-mid-gray">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(log.date)} | {formatTime(log.startTime)} - {formatTime(log.endTime)}
                      </span>
                      {log.travelKm > 0 && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {log.travelKm} km
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {log.notes && (
                  <p className="text-sm text-mid-gray mt-2">{log.notes}</p>
                )}
                {log.goalsAddressed && (
                  <div className="mt-2 flex items-start gap-1">
                    <FileText size={12} className="text-forest mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-forest">{log.goalsAddressed}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
