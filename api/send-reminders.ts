import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  shiftReminderEmail,
  clientAppointmentReminderEmail,
  overdueInvoiceReminderEmail,
} from './lib/email-templates.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'reminders@admin.thrive4better.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

type ReminderType = 'shift' | 'appointment' | 'overdue_invoice';
type ReminderChannel = 'none' | 'sms' | 'email' | 'both';

// ── Message Templates ──

const TEMPLATES = {
  shift: (carerName: string, clientName: string, time: string, location: string) => {
    let msg = `Hi ${carerName}, reminder: you have a shift with ${clientName} tomorrow at ${time}`;
    if (location) msg += ` at ${location}`;
    msg += '. - Thrive 4 Better';
    return msg;
  },
  appointment: (clientName: string, time: string, date: string) => {
    return `Hi, this is a reminder that ${clientName} has an appointment on ${date} at ${time}. Please contact us if you need to reschedule. - Thrive 4 Better`;
  },
  overdue_invoice: (clientName: string, invoiceNumber: string, amount: string, daysPastDue: number) => {
    return `Hi, this is a friendly reminder that invoice ${invoiceNumber} for ${clientName} ($${amount}) is ${daysPastDue} day(s) overdue. Please arrange payment at your earliest convenience. - Thrive 4 Better`;
  },
};

// ── Email Templates (using branded templates from lib) ──

const EMAIL_TEMPLATES = {
  shift: (carerName: string, clientName: string, time: string, date: string, location: string) => {
    const tpl = shiftReminderEmail(carerName, clientName, date, time, '', location);
    return { subject: tpl.subject, html: tpl.html };
  },
  appointment: (clientName: string, time: string, date: string, recipientName: string = '', carerName: string = '') => {
    const tpl = clientAppointmentReminderEmail(recipientName || 'there', clientName, date, time, carerName, '');
    return { subject: tpl.subject, html: tpl.html };
  },
  overdue_invoice: (clientName: string, invoiceNumber: string, amount: string, daysPastDue: number, dueDate: string, recipientName: string = '') => {
    const tpl = overdueInvoiceReminderEmail(recipientName || 'there', clientName, invoiceNumber, amount, dueDate, daysPastDue);
    return { subject: tpl.subject, html: tpl.html };
  },
};

function formatTime12(time: string): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr}${suffix}`;
}

async function sendSms(to: string, message: string): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  if (!twilioAccountSid || !twilioAuthToken || (!twilioMessagingServiceSid && !twilioPhoneNumber)) {
    return { success: false, simulated: true, error: 'Twilio not configured' };
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

  const body = new URLSearchParams({ To: to, Body: message });
  if (twilioMessagingServiceSid) {
    body.set('MessagingServiceSid', twilioMessagingServiceSid);
  } else {
    body.set('From', twilioPhoneNumber!);
  }

  try {
    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.message || 'Twilio error' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  if (!resendApiKey) {
    return { success: false, simulated: true, error: 'Resend not configured' };
  }

  try {
    const resend = new Resend(resendApiKey);
    const { error } = await resend.emails.send({
      from: `Thrive 4 Better <${fromEmail}>`,
      to,
      subject,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

interface SendResult {
  id: string;
  smsSent?: boolean;
  emailSent?: boolean;
  smsSimulated?: boolean;
  emailSimulated?: boolean;
  status: string;
  errors?: string[];
  to?: string;
  message?: string;
}

async function sendViaChannel(
  channel: ReminderChannel,
  phone: string | undefined,
  email: string | undefined,
  smsMessage: string,
  emailSubject: string,
  emailHtml: string,
  id: string,
): Promise<{ sent: number; failed: number; simulated: number; result: SendResult }> {
  let sent = 0, failed = 0, simulated = 0;
  const result: SendResult = { id, status: 'ok', errors: [] };

  const shouldSms = channel === 'sms' || channel === 'both';
  const shouldEmail = channel === 'email' || channel === 'both';

  if (shouldSms) {
    if (!phone) {
      result.errors!.push('No phone number for SMS');
      failed++;
    } else {
      const smsResult = await sendSms(phone, smsMessage);
      if (smsResult.simulated) { simulated++; result.smsSimulated = true; }
      else if (smsResult.success) { sent++; result.smsSent = true; }
      else { failed++; result.errors!.push(`SMS: ${smsResult.error}`); }
    }
  }

  if (shouldEmail) {
    if (!email) {
      result.errors!.push('No email address');
      failed++;
    } else {
      const emailResult = await sendEmail(email, emailSubject, emailHtml);
      if (emailResult.simulated) { simulated++; result.emailSimulated = true; }
      else if (emailResult.success) { sent++; result.emailSent = true; }
      else { failed++; result.errors!.push(`Email: ${emailResult.error}`); }
    }
  }

  if (!shouldSms && !shouldEmail) {
    result.status = 'skipped';
  } else if (result.errors!.length > 0) {
    result.status = sent > 0 ? 'partial' : 'failed';
  } else {
    result.status = simulated > 0 ? 'simulated' : 'sent';
  }

  return { sent, failed, simulated, result };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      .end();
  }

  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const jwt = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { shiftIds, type = 'shift', channel = 'sms' } = req.body || {};
    const reminderType: ReminderType = type;
    const reminderChannel: ReminderChannel = channel;

    if (reminderChannel === 'none') {
      return res.status(200).json({ success: true, message: 'Reminders disabled for this type', sent: 0, failed: 0 });
    }

    let totalSent = 0;
    let totalFailed = 0;
    let totalSimulated = 0;
    const results: SendResult[] = [];

    // ── Overdue Invoice Reminders ──
    if (reminderType === 'overdue_invoice') {
      const today = new Date().toISOString().split('T')[0];
      const { data: overdueInvoices, error } = await supabase
        .from('invoices')
        .select('*')
        .in('status', ['Sent', 'Overdue'])
        .lt('due_date', today);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch overdue invoices', details: error.message });
      }

      if (!overdueInvoices || overdueInvoices.length === 0) {
        return res.status(200).json({ success: true, message: 'No overdue invoices found', sent: 0, failed: 0 });
      }

      const clientIds = [...new Set(overdueInvoices.map((i: any) => i.client_id).filter(Boolean))];
      const { data: clientsData } = clientIds.length > 0
        ? await supabase.from('clients').select('*').in('id', clientIds)
        : { data: [] };
      const clientsMap = new Map((clientsData || []).map((c: any) => [c.id, c]));

      for (const invoice of overdueInvoices) {
        const client = clientsMap.get(invoice.client_id);
        if (!client) {
          results.push({ id: invoice.id, status: 'skipped', errors: ['Client not found'] });
          totalFailed++;
          continue;
        }

        const recipientPhone = client.nominated_contact_phone || client.plan_manager_phone || client.phone;
        const recipientEmail = client.nominated_contact_email || client.plan_manager_email || client.email;
        const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'your client';
        const daysPastDue = Math.floor((new Date(today).getTime() - new Date(invoice.due_date).getTime()) / 86400000);
        const invNumber = invoice.invoice_number || invoice.id;
        const amount = invoice.total?.toString() || '0';

        const recipientName = client.nominated_contact_name || `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'there';
        const smsMsg = TEMPLATES.overdue_invoice(clientName, invNumber, amount, daysPastDue);
        const emailTpl = EMAIL_TEMPLATES.overdue_invoice(clientName, invNumber, amount, daysPastDue, invoice.due_date, recipientName);

        const { sent, failed, simulated, result } = await sendViaChannel(
          reminderChannel, recipientPhone, recipientEmail, smsMsg, emailTpl.subject, emailTpl.html, invoice.id
        );
        totalSent += sent; totalFailed += failed; totalSimulated += simulated;
        results.push(result);
      }

      return res.status(200).json({
        success: true,
        message: `Overdue invoice reminders: ${totalSent} sent, ${totalSimulated} simulated, ${totalFailed} failed`,
        sent: totalSent, simulated: totalSimulated, failed: totalFailed, results,
      });
    }

    // ── Appointment Reminders (to clients/nominees) ──
    if (reminderType === 'appointment') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data: tomorrowShifts, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('date', tomorrowStr)
        .in('status', ['Scheduled', 'Confirmed']);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch shifts', details: error.message });
      }

      if (!tomorrowShifts || tomorrowShifts.length === 0) {
        return res.status(200).json({ success: true, message: 'No appointments found', sent: 0, failed: 0 });
      }

      const clientIds = [...new Set(tomorrowShifts.map((s: any) => s.client_id).filter(Boolean))];
      const { data: clientsData } = clientIds.length > 0
        ? await supabase.from('clients').select('*').in('id', clientIds)
        : { data: [] };
      const clientsMap = new Map((clientsData || []).map((c: any) => [c.id, c]));

      for (const shift of tomorrowShifts) {
        const client = clientsMap.get(shift.client_id);
        if (!client) continue;

        const recipientPhone = client.nominated_contact_phone || client.phone;
        const recipientEmail = client.nominated_contact_email || client.email;
        const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'the participant';
        const appointmentRecipientName = client.nominated_contact_name || clientName;
        const smsMsg = TEMPLATES.appointment(clientName, formatTime12(shift.start_time || ''), tomorrowStr);
        const emailTpl = EMAIL_TEMPLATES.appointment(clientName, formatTime12(shift.start_time || ''), tomorrowStr, appointmentRecipientName);

        const { sent, failed, simulated, result } = await sendViaChannel(
          reminderChannel, recipientPhone, recipientEmail, smsMsg, emailTpl.subject, emailTpl.html, shift.id
        );
        totalSent += sent; totalFailed += failed; totalSimulated += simulated;
        results.push(result);
      }

      return res.status(200).json({
        success: true,
        message: `Appointment reminders: ${totalSent} sent, ${totalSimulated} simulated, ${totalFailed} failed`,
        sent: totalSent, simulated: totalSimulated, failed: totalFailed, results,
      });
    }

    // ── Shift Reminders (to carers) ──
    let shifts: any[];

    if (shiftIds && Array.isArray(shiftIds) && shiftIds.length > 0) {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch shifts', details: error.message });
      }
      shifts = data || [];
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('date', tomorrowStr)
        .in('status', ['Scheduled', 'Confirmed']);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch shifts', details: error.message });
      }
      shifts = data || [];
    }

    if (shifts.length === 0) {
      return res.status(200).json({ success: true, message: 'No shifts found to send reminders for', sent: 0, failed: 0 });
    }

    const carerIds = [...new Set(shifts.map((s: any) => s.carer_id).filter(Boolean))];
    const clientIds = [...new Set(shifts.map((s: any) => s.client_id).filter(Boolean))];

    const [carersResult, clientsResult] = await Promise.all([
      carerIds.length > 0
        ? supabase.from('carers').select('*').in('id', carerIds)
        : { data: [], error: null },
      clientIds.length > 0
        ? supabase.from('clients').select('*').in('id', clientIds)
        : { data: [], error: null },
    ]);

    const carersMap = new Map((carersResult.data || []).map((c: any) => [c.id, c]));
    const clientsMap = new Map((clientsResult.data || []).map((c: any) => [c.id, c]));

    for (const shift of shifts) {
      const carer = carersMap.get(shift.carer_id);
      const client = clientsMap.get(shift.client_id);

      if (!carer) {
        results.push({ id: shift.id, status: 'skipped', errors: ['Carer not found'] });
        totalFailed++;
        continue;
      }

      const carerFirstName = carer.first_name || carer.name?.split(' ')[0] || 'there';
      const clientName = client
        ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.name || 'your client'
        : 'your client';
      const location = client?.address || '';
      const startTime = shift.start_time || '';
      const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

      const smsMsg = TEMPLATES.shift(carerFirstName, clientName, formatTime12(startTime), location);
      const emailTpl = EMAIL_TEMPLATES.shift(carerFirstName, clientName, formatTime12(startTime), tomorrowStr, location);

      const { sent, failed, simulated, result } = await sendViaChannel(
        reminderChannel, carer.phone, carer.email, smsMsg, emailTpl.subject, emailTpl.html, shift.id
      );
      totalSent += sent; totalFailed += failed; totalSimulated += simulated;
      results.push(result);
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${shifts.length} shift(s): ${totalSent} sent, ${totalSimulated} simulated, ${totalFailed} failed`,
      sent: totalSent, simulated: totalSimulated, failed: totalFailed, results,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
