import { useState } from 'react';
import { Bell, Clock, FileText, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import type { ReminderSettings as ReminderSettingsType } from '@/types';

const STORAGE_KEY = 't4b_reminderSettings';

function loadSettings(): ReminderSettingsType {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    shiftRemindersEnabled: true,
    shiftReminderHoursBefore: 24,
    appointmentRemindersEnabled: true,
    appointmentReminderHoursBefore: 24,
    overdueInvoiceRemindersEnabled: false,
    overdueInvoiceReminderDaysAfter: 7,
  };
}

function saveSettings(settings: ReminderSettingsType) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export default function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettingsType>(loadSettings);

  const update = (field: keyof ReminderSettingsType, value: boolean | number) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveSettings(settings);
    toast.success('Reminder settings saved');
  };

  return (
    <div className="space-y-6">
      {/* Shift Reminders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-charcoal">Shift Reminders</h3>
              <p className="text-xs text-mid-gray">Send SMS to carers before their scheduled shifts</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.shiftRemindersEnabled}
              onChange={(e) => update('shiftRemindersEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-forest/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
          </label>
        </div>
        {settings.shiftRemindersEnabled && (
          <div className="ml-11">
            <label className="block text-sm font-medium text-charcoal mb-1">Send reminder</label>
            <div className="flex items-center gap-2">
              <select
                value={settings.shiftReminderHoursBefore}
                onChange={(e) => update('shiftReminderHoursBefore', parseInt(e.target.value))}
                className="input-field w-32"
              >
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
              </select>
              <span className="text-sm text-mid-gray">before shift start</span>
            </div>
          </div>
        )}
      </div>

      {/* Appointment Reminders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-charcoal">Appointment Reminders</h3>
              <p className="text-xs text-mid-gray">Send SMS to clients or their nominated contacts before appointments</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.appointmentRemindersEnabled}
              onChange={(e) => update('appointmentRemindersEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-forest/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
          </label>
        </div>
        {settings.appointmentRemindersEnabled && (
          <div className="ml-11">
            <label className="block text-sm font-medium text-charcoal mb-1">Send reminder</label>
            <div className="flex items-center gap-2">
              <select
                value={settings.appointmentReminderHoursBefore}
                onChange={(e) => update('appointmentReminderHoursBefore', parseInt(e.target.value))}
                className="input-field w-32"
              >
                <option value={2}>2 hours</option>
                <option value={4}>4 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
              </select>
              <span className="text-sm text-mid-gray">before appointment</span>
            </div>
            <p className="text-xs text-mid-gray mt-2">
              SMS will be sent to the client's nominated contact number if set, otherwise to the client's phone.
            </p>
          </div>
        )}
      </div>

      {/* Overdue Invoice Reminders */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-charcoal">Overdue Invoice Reminders</h3>
              <p className="text-xs text-mid-gray">Send SMS to plan managers or nominated contacts for overdue invoices</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.overdueInvoiceRemindersEnabled}
              onChange={(e) => update('overdueInvoiceRemindersEnabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-forest/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-forest"></div>
          </label>
        </div>
        {settings.overdueInvoiceRemindersEnabled && (
          <div className="ml-11">
            <label className="block text-sm font-medium text-charcoal mb-1">Send reminder after</label>
            <div className="flex items-center gap-2">
              <select
                value={settings.overdueInvoiceReminderDaysAfter}
                onChange={(e) => update('overdueInvoiceReminderDaysAfter', parseInt(e.target.value))}
                className="input-field w-32"
              >
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
              <span className="text-sm text-mid-gray">past due date</span>
            </div>
            <p className="text-xs text-mid-gray mt-2">
              Reminders sent to the client's nominated contact (e.g. plan manager, family member).
            </p>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button onClick={handleSave} className="btn-primary">
          Save Reminder Settings
        </button>
      </div>
    </div>
  );
}
