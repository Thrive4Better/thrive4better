import { useState } from 'react';
import { Bell, Clock, FileText, Mail, MessageSquare, Phone, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import type { ReminderSettings as ReminderSettingsType, ReminderChannel } from '@/types';

const STORAGE_KEY = 't4b_reminderSettings';

function loadSettings(): ReminderSettingsType {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate old settings that don't have channel fields
      return {
        ...parsed,
        shiftReminderChannel: parsed.shiftReminderChannel || (parsed.shiftRemindersEnabled ? 'sms' : 'none'),
        appointmentReminderChannel: parsed.appointmentReminderChannel || (parsed.appointmentRemindersEnabled ? 'sms' : 'none'),
        overdueInvoiceReminderChannel: parsed.overdueInvoiceReminderChannel || (parsed.overdueInvoiceRemindersEnabled ? 'sms' : 'none'),
      };
    }
  } catch {}
  return {
    shiftRemindersEnabled: true,
    shiftReminderHoursBefore: 24,
    shiftReminderChannel: 'sms',
    appointmentRemindersEnabled: true,
    appointmentReminderHoursBefore: 24,
    appointmentReminderChannel: 'both',
    overdueInvoiceRemindersEnabled: false,
    overdueInvoiceReminderDaysAfter: 7,
    overdueInvoiceReminderChannel: 'email',
  };
}

function saveSettings(settings: ReminderSettingsType) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const CHANNEL_OPTIONS: { value: ReminderChannel; label: string; icon: typeof Mail }[] = [
  { value: 'none', label: 'No reminders', icon: Bell },
  { value: 'sms', label: 'SMS only', icon: Phone },
  { value: 'email', label: 'Email only', icon: Mail },
  { value: 'both', label: 'SMS & Email', icon: MessageSquare },
];

function ChannelSelector({
  value,
  onChange,
}: {
  value: ReminderChannel;
  onChange: (v: ReminderChannel) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
      {CHANNEL_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
              selected
                ? 'border-forest bg-forest/10 text-forest'
                : 'border-gray-200 bg-white text-mid-gray hover:border-gray-300'
            }`}
          >
            <Icon size={16} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ReminderSettings() {
  const [settings, setSettings] = useState<ReminderSettingsType>(loadSettings);

  const update = (field: keyof ReminderSettingsType, value: boolean | number | ReminderChannel) => {
    setSettings((prev) => {
      const next = { ...prev, [field]: value };
      // Sync enabled state with channel
      if (field === 'shiftReminderChannel') next.shiftRemindersEnabled = value !== 'none';
      if (field === 'appointmentReminderChannel') next.appointmentRemindersEnabled = value !== 'none';
      if (field === 'overdueInvoiceReminderChannel') next.overdueInvoiceRemindersEnabled = value !== 'none';
      return next;
    });
  };

  const handleSave = () => {
    saveSettings(settings);
    toast.success('Reminder settings saved');
  };

  return (
    <div className="space-y-6">
      {/* Shift Reminders */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
            <Clock size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-charcoal">Shift Reminders</h3>
            <p className="text-xs text-mid-gray">Notify carers before their scheduled shifts</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-charcoal mb-1">How should we send reminders?</label>
        <ChannelSelector
          value={settings.shiftReminderChannel}
          onChange={(v) => update('shiftReminderChannel', v)}
        />

        {settings.shiftReminderChannel !== 'none' && (
          <div className="mt-4">
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
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <MessageSquare size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-charcoal">Appointment Reminders</h3>
            <p className="text-xs text-mid-gray">Notify clients or their nominated contacts before appointments</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-charcoal mb-1">How should we send reminders?</label>
        <ChannelSelector
          value={settings.appointmentReminderChannel}
          onChange={(v) => update('appointmentReminderChannel', v)}
        />

        {settings.appointmentReminderChannel !== 'none' && (
          <div className="mt-4">
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
              Sent to the client's nominated contact if set, otherwise to the client directly.
            </p>
          </div>
        )}
      </div>

      {/* Overdue Invoice Reminders */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-charcoal">Overdue Invoice Reminders</h3>
            <p className="text-xs text-mid-gray">Notify plan managers or nominated contacts for overdue invoices</p>
          </div>
        </div>

        <label className="block text-sm font-medium text-charcoal mb-1">How should we send reminders?</label>
        <ChannelSelector
          value={settings.overdueInvoiceReminderChannel}
          onChange={(v) => update('overdueInvoiceReminderChannel', v)}
        />

        {settings.overdueInvoiceReminderChannel !== 'none' && (
          <div className="mt-4">
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
              Sent to the client's nominated contact (e.g. plan manager, family member).
            </p>
          </div>
        )}
      </div>

      {/* Test Notifications */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-forest/10 text-forest">
            <Send size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-charcoal">Test Notifications</h3>
            <p className="text-xs text-mid-gray">
              Send a single test email or all 17 templates to verify formatting and delivery before going live.
            </p>
          </div>
        </div>
        <SendTestEmailsButton />
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

function SendTestEmailsButton() {
  const [sending, setSending] = useState(false);
  const [sendingAll, setSendingAll] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleSendTest = async (sendAll: boolean) => {
    if (sendAll) setSendingAll(true);
    else setSending(true);
    setLastResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Not authenticated — please sign in again');
        return;
      }

      const res = await fetch('/api/send-test-emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendAll ? {} : { template: 'Welcome' }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const msg = errorData?.error || errorData?.details || `Server error ${res.status}`;
        toast.error(msg);
        setLastResult(`Error: ${msg}`);
        return;
      }

      const data = await res.json();
      if (data.success) {
        toast.success(`${data.sent} test email${data.sent !== 1 ? 's' : ''} sent to ${data.recipient}`);
        setLastResult(`Sent ${data.sent} email${data.sent !== 1 ? 's' : ''} to ${data.recipient}`);
        if (data.failed > 0) {
          const failedNames = data.results
            ?.filter((r: { status: string }) => r.status === 'failed')
            .map((r: { template: string; error?: string }) => `${r.template}: ${r.error}`)
            .join(', ');
          toast.error(`${data.failed} failed: ${failedNames}`);
          setLastResult(prev => `${prev} | ${data.failed} failed: ${failedNames}`);
        }
      } else {
        toast.error(data.error || 'Failed to send test emails');
        setLastResult(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      toast.error(`Failed: ${msg}`);
      setLastResult(`Error: ${msg}`);
    } finally {
      setSending(false);
      setSendingAll(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleSendTest(false)}
          disabled={sending || sendingAll}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-forest text-forest hover:bg-forest/5 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Send size={16} />
          {sending ? 'Sending...' : 'Send 1 Test Email'}
        </button>
        <button
          onClick={() => handleSendTest(true)}
          disabled={sending || sendingAll}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-mid-gray hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Mail size={16} />
          {sendingAll ? 'Sending 17 emails...' : 'Send All 17 Templates'}
        </button>
      </div>
      <p className="text-xs text-mid-gray">
        Test emails are sent to <span className="font-medium">hello@thrive4better.com.au</span>
      </p>
      {lastResult && (
        <p className={`text-xs font-medium ${lastResult.startsWith('Error') ? 'text-red-600' : 'text-forest'}`}>
          {lastResult}
        </p>
      )}
    </div>
  );
}
