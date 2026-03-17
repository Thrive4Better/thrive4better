import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import {
  shiftConfirmationEmail,
  shiftAssignedEmail,
  shiftCancelledEmail,
  shiftUpdatedEmail,
  shiftReminderEmail,
  weeklyRosterEmail,
  clientAppointmentReminderEmail,
  invoiceEmail,
  paymentConfirmationEmail,
  overdueInvoiceReminderEmail,
  payslipReadyEmail,
  contractorInvoiceApprovedEmail,
  contractorInvoiceRejectedEmail,
  onboardingEmail,
  welcomeEmail,
  newClientAddedEmail,
  documentSignedEmail,
} from './lib/email-templates.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

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

  // Validate env vars early
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'notifications@info.thrive4better.com';
  const testRecipient = 'hello@thrive4better.com.au';

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({ error: 'Server misconfigured: missing Supabase env vars' });
  }
  if (!resendApiKey) {
    return res.status(500).json({ error: 'Server misconfigured: RESEND_API_KEY is not set. Add it in Vercel → Settings → Environment Variables.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const jwt = authHeader.replace('Bearer ', '');
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized', details: authError?.message });
  }

  // Support sending a single template or all templates
  const { template: requestedTemplate } = req.body || {};

  try {
    const resend = new Resend(resendApiKey);
    const results: { template: string; status: string; error?: string }[] = [];

    // All sample email templates
    const allEmails = [
      {
        name: 'Shift Confirmation',
        ...shiftConfirmationEmail('Sarah', 'James Wilson', '2026-03-20', '9:00am', '1:00pm', 'Community Access', '45 Oak Street, Brunswick VIC 3056', 'Client enjoys park visits'),
      },
      {
        name: 'Shift Assigned',
        ...shiftAssignedEmail('Sarah', 'James Wilson', '2026-03-22', '10:00am', '2:00pm', 'Social Participation', '45 Oak Street, Brunswick VIC 3056', 'First session with this client'),
      },
      {
        name: 'Shift Cancelled',
        ...shiftCancelledEmail('Sarah', 'James Wilson', '2026-03-22', '10:00am', '2:00pm', 'Client unwell - rescheduling for next week'),
      },
      {
        name: 'Shift Updated',
        ...shiftUpdatedEmail('Sarah', 'James Wilson', '2026-03-22', '11:00am', '3:00pm', 'Time changed from 10:00am-2:00pm to 11:00am-3:00pm'),
      },
      {
        name: 'Shift Reminder',
        ...shiftReminderEmail('Sarah', 'James Wilson', '2026-03-21', '9:00am', '1:00pm', '45 Oak Street, Brunswick VIC 3056'),
      },
      {
        name: 'Weekly Roster',
        ...weeklyRosterEmail('Sarah', '24 Mar 2026', '28 Mar 2026', [
          { date: 'Mon 24 Mar', time: '9:00am - 1:00pm', client: 'James Wilson' },
          { date: 'Tue 25 Mar', time: '10:00am - 2:00pm', client: 'Emma Thompson' },
          { date: 'Thu 27 Mar', time: '8:30am - 12:30pm', client: 'James Wilson' },
          { date: 'Fri 28 Mar', time: '1:00pm - 5:00pm', client: 'Liam Chen' },
        ]),
      },
      {
        name: 'Client Appointment Reminder',
        ...clientAppointmentReminderEmail('Margaret Wilson', 'James Wilson', '2026-03-21', '9:00am', 'Sarah Johnson', 'Community Access'),
      },
      {
        name: 'Invoice',
        ...invoiceEmail('Margaret', 'INV-2026-0042', '$1,250.00', '2026-04-01'),
      },
      {
        name: 'Payment Confirmation',
        ...paymentConfirmationEmail('Margaret', 'INV-2026-0042', '$1,250.00', '2026-03-28'),
      },
      {
        name: 'Overdue Invoice Reminder',
        ...overdueInvoiceReminderEmail('Margaret Wilson', 'James Wilson', 'INV-2026-0035', '850.00', '2026-03-01', 16),
      },
      {
        name: 'Payslip Ready',
        ...payslipReadyEmail('Sarah Johnson', '1 Mar - 15 Mar 2026', '$2,340.50', '2026-03-18'),
      },
      {
        name: 'Contractor Invoice Approved',
        ...contractorInvoiceApprovedEmail('Mike Rivera', 'CINV-2026-008', '$780.00', '2026-03-17'),
      },
      {
        name: 'Contractor Invoice Rejected',
        ...contractorInvoiceRejectedEmail('Mike Rivera', 'CINV-2026-009', '$640.00', 'Hours don\'t match the shift log. Please correct the total hours and resubmit.'),
      },
      {
        name: 'Onboarding Welcome',
        ...onboardingEmail('Sarah', 'Support Worker', 'https://app.thrive4better.com.au'),
      },
      {
        name: 'Welcome',
        ...welcomeEmail('James'),
      },
      {
        name: 'New Client Added',
        ...newClientAddedEmail('Melissa', 'James Wilson', '431 234 567', 'Plan Managed'),
      },
      {
        name: 'Document Signed',
        ...documentSignedEmail('Melissa', 'Sarah Johnson', 'Code of Conduct', '2026-03-17'),
      },
    ];

    // If a specific template is requested, only send that one
    const emailsToSend = requestedTemplate
      ? allEmails.filter(e => e.name.toLowerCase() === requestedTemplate.toLowerCase())
      : allEmails;

    if (requestedTemplate && emailsToSend.length === 0) {
      return res.status(400).json({
        error: `Template "${requestedTemplate}" not found`,
        availableTemplates: allEmails.map(e => e.name),
      });
    }

    // Send each email
    for (const email of emailsToSend) {
      try {
        const { data, error } = await resend.emails.send({
          from: `Thrive 4 Better <${fromEmail}>`,
          to: testRecipient,
          subject: `[TEST] ${email.subject}`,
          html: email.html,
        });

        if (error) {
          results.push({ template: email.name, status: 'failed', error: error.message });
        } else {
          results.push({ template: email.name, status: 'sent' });
        }
      } catch (err) {
        results.push({ template: email.name, status: 'failed', error: err instanceof Error ? err.message : 'Unknown' });
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    return res.status(200).json({
      success: true,
      message: `Test emails: ${sent} sent, ${failed} failed to ${testRecipient}`,
      sent,
      failed,
      recipient: testRecipient,
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
