import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  shiftAssignedEmail,
  shiftCancelledEmail,
  shiftUpdatedEmail,
  shiftConfirmationEmail,
  weeklyRosterEmail,
  clientAppointmentReminderEmail,
  payslipReadyEmail,
  contractorInvoiceApprovedEmail,
  contractorInvoiceRejectedEmail,
  onboardingEmail,
  newClientAddedEmail,
  documentSignedEmail,
} from './lib/email-templates.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@admin.thrive4better.com';

// Twilio config
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

type NotificationType =
  | 'shift_assigned'
  | 'shift_confirmed'
  | 'shift_cancelled'
  | 'shift_updated'
  | 'roster_published'
  | 'appointment_reminder'
  | 'payslip_ready'
  | 'contractor_invoice_approved'
  | 'contractor_invoice_rejected'
  | 'onboarding'
  | 'new_client'
  | 'document_signed';

type Channel = 'email' | 'sms' | 'both';

async function sendSms(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  if (!twilioAccountSid || !twilioAuthToken || (!twilioMessagingServiceSid && !twilioPhoneNumber)) {
    return { success: false, error: 'Twilio not configured' };
  }
  const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');
  const body = new URLSearchParams({ To: to, Body: message });
  if (twilioMessagingServiceSid) body.set('MessagingServiceSid', twilioMessagingServiceSid);
  else body.set('From', twilioPhoneNumber!);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) { const d = await res.json(); return { success: false, error: d.message || 'Twilio error' }; }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      .end();
  }
  Object.entries(corsHeaders).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });

  const jwt = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { type, channel = 'email', data } = req.body as {
      type: NotificationType;
      channel: Channel;
      data: Record<string, any>;
    };

    if (!type || !data) return res.status(400).json({ error: 'Missing type or data' });

    const resend = new Resend(resendApiKey);
    const results: { channel: string; status: string; error?: string }[] = [];

    let emailTemplate: { subject: string; html: string } | null = null;
    let smsMessage: string | null = null;
    let recipientEmail: string | undefined = data.recipientEmail;
    let recipientPhone: string | undefined = data.recipientPhone;

    switch (type) {
      case 'shift_assigned':
        emailTemplate = shiftAssignedEmail(
          data.carerName, data.clientName, data.date,
          data.startTime, data.endTime, data.serviceType || '',
          data.address || '', data.notes || ''
        );
        smsMessage = `Hi ${data.carerName}, you've been assigned a new shift with ${data.clientName} on ${data.date} at ${data.startTime}. Check your roster for details. - Thrive 4 Better`;
        break;

      case 'shift_confirmed':
        emailTemplate = shiftConfirmationEmail(
          data.carerName, data.clientName, data.date,
          data.startTime, data.endTime, data.serviceType || '',
          data.address || '', data.notes || ''
        );
        smsMessage = `Hi ${data.carerName}, your shift with ${data.clientName} on ${data.date} at ${data.startTime} has been confirmed. - Thrive 4 Better`;
        break;

      case 'shift_cancelled':
        emailTemplate = shiftCancelledEmail(
          data.carerName, data.clientName, data.date,
          data.startTime, data.endTime, data.reason || ''
        );
        smsMessage = `Hi ${data.carerName}, your shift with ${data.clientName} on ${data.date} at ${data.startTime} has been cancelled. Check your roster for updates. - Thrive 4 Better`;
        break;

      case 'shift_updated':
        emailTemplate = shiftUpdatedEmail(
          data.carerName, data.clientName, data.date,
          data.startTime, data.endTime, data.changeDescription || 'Shift details have changed'
        );
        smsMessage = `Hi ${data.carerName}, your shift with ${data.clientName} on ${data.date} has been updated. Please check your roster. - Thrive 4 Better`;
        break;

      case 'roster_published':
        emailTemplate = weeklyRosterEmail(
          data.carerName, data.weekStart, data.weekEnd, data.shifts || []
        );
        smsMessage = `Hi ${data.carerName}, your roster for ${data.weekStart} - ${data.weekEnd} is ready. ${data.shifts?.length || 0} shifts scheduled. Check the app for details. - Thrive 4 Better`;
        break;

      case 'appointment_reminder':
        emailTemplate = clientAppointmentReminderEmail(
          data.recipientName, data.clientName, data.date,
          data.time, data.carerName || '', data.serviceType || ''
        );
        smsMessage = `Reminder: ${data.clientName} has an appointment on ${data.date} at ${data.time}. Contact us to reschedule. - Thrive 4 Better`;
        break;

      case 'payslip_ready':
        emailTemplate = payslipReadyEmail(
          data.staffName, data.payPeriod, data.netPay, data.payDate
        );
        smsMessage = `Hi ${data.staffName}, your payslip for ${data.payPeriod} is ready. Net pay: ${data.netPay}. View it in the app. - Thrive 4 Better`;
        break;

      case 'contractor_invoice_approved':
        emailTemplate = contractorInvoiceApprovedEmail(
          data.contractorName, data.invoiceNumber, data.amount, data.approvedDate
        );
        smsMessage = `Hi ${data.contractorName}, your invoice ${data.invoiceNumber} (${data.amount}) has been approved for payment. - Thrive 4 Better`;
        break;

      case 'contractor_invoice_rejected':
        emailTemplate = contractorInvoiceRejectedEmail(
          data.contractorName, data.invoiceNumber, data.amount, data.reason || ''
        );
        smsMessage = `Hi ${data.contractorName}, your invoice ${data.invoiceNumber} needs revision. Please check the app for details. - Thrive 4 Better`;
        break;

      case 'onboarding':
        emailTemplate = onboardingEmail(data.firstName, data.role, data.loginUrl || 'https://app.thrive4better.com.au');
        smsMessage = `Welcome to Thrive 4 Better, ${data.firstName}! Your account is ready. Log in at app.thrive4better.com.au to complete your onboarding. - Thrive 4 Better`;
        break;

      case 'new_client':
        emailTemplate = newClientAddedEmail(
          data.adminName, data.clientName, data.ndisNumber || '', data.fundingType || 'Self Managed'
        );
        // Admin-only notification, no SMS needed
        smsMessage = null;
        break;

      case 'document_signed':
        emailTemplate = documentSignedEmail(
          data.adminName, data.staffName, data.documentName, data.signedDate
        );
        smsMessage = null;
        break;

      default:
        return res.status(400).json({ error: `Unknown notification type: ${type}` });
    }

    // Send email
    if ((channel === 'email' || channel === 'both') && emailTemplate && recipientEmail) {
      try {
        const { error } = await resend.emails.send({
          from: `Thrive 4 Better <${fromEmail}>`,
          to: recipientEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });
        results.push({ channel: 'email', status: error ? 'failed' : 'sent', error: error?.message });
      } catch (err) {
        results.push({ channel: 'email', status: 'failed', error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    // Send SMS
    if ((channel === 'sms' || channel === 'both') && smsMessage && recipientPhone) {
      const smsResult = await sendSms(recipientPhone, smsMessage);
      results.push({ channel: 'sms', status: smsResult.success ? 'sent' : 'failed', error: smsResult.error });
    }

    return res.status(200).json({
      success: true,
      type,
      channel,
      results,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
