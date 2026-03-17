import { supabase } from './supabase';

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

interface NotificationResult {
  success: boolean;
  results?: { channel: string; status: string; error?: string }[];
  error?: string;
}

export async function sendNotification(
  type: NotificationType,
  data: Record<string, any>,
  channel: Channel = 'email'
): Promise<NotificationResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, error: 'Not authenticated' };
    }

    const res = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, channel, data }),
    });

    const result = await res.json();
    return { success: result.success || false, results: result.results, error: result.error };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}

// Convenience functions for common notifications

export function notifyShiftAssigned(
  recipientEmail: string,
  recipientPhone: string | undefined,
  carerName: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string,
  serviceType?: string,
  address?: string,
  notes?: string,
  channel: Channel = 'email'
) {
  return sendNotification('shift_assigned', {
    recipientEmail, recipientPhone, carerName, clientName,
    date, startTime, endTime, serviceType, address, notes,
  }, channel);
}

export function notifyShiftConfirmed(
  recipientEmail: string,
  recipientPhone: string | undefined,
  carerName: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string,
  serviceType?: string,
  address?: string,
  notes?: string,
  channel: Channel = 'email'
) {
  return sendNotification('shift_confirmed', {
    recipientEmail, recipientPhone, carerName, clientName,
    date, startTime, endTime, serviceType, address, notes,
  }, channel);
}

export function notifyShiftCancelled(
  recipientEmail: string,
  recipientPhone: string | undefined,
  carerName: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string,
  reason?: string,
  channel: Channel = 'email'
) {
  return sendNotification('shift_cancelled', {
    recipientEmail, recipientPhone, carerName, clientName,
    date, startTime, endTime, reason,
  }, channel);
}

export function notifyShiftUpdated(
  recipientEmail: string,
  recipientPhone: string | undefined,
  carerName: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string,
  changeDescription?: string,
  channel: Channel = 'email'
) {
  return sendNotification('shift_updated', {
    recipientEmail, recipientPhone, carerName, clientName,
    date, startTime, endTime, changeDescription,
  }, channel);
}

export function notifyPayslipReady(
  recipientEmail: string,
  recipientPhone: string | undefined,
  staffName: string,
  payPeriod: string,
  netPay: string,
  payDate: string,
  channel: Channel = 'email'
) {
  return sendNotification('payslip_ready', {
    recipientEmail, recipientPhone, staffName, payPeriod, netPay, payDate,
  }, channel);
}

export function notifyContractorInvoiceApproved(
  recipientEmail: string,
  recipientPhone: string | undefined,
  contractorName: string,
  invoiceNumber: string,
  amount: string,
  approvedDate: string,
  channel: Channel = 'email'
) {
  return sendNotification('contractor_invoice_approved', {
    recipientEmail, recipientPhone, contractorName, invoiceNumber, amount, approvedDate,
  }, channel);
}

export function notifyContractorInvoiceRejected(
  recipientEmail: string,
  recipientPhone: string | undefined,
  contractorName: string,
  invoiceNumber: string,
  amount: string,
  reason?: string,
  channel: Channel = 'email'
) {
  return sendNotification('contractor_invoice_rejected', {
    recipientEmail, recipientPhone, contractorName, invoiceNumber, amount, reason,
  }, channel);
}

export function notifyOnboarding(
  recipientEmail: string,
  recipientPhone: string | undefined,
  firstName: string,
  role: string,
  channel: Channel = 'email'
) {
  return sendNotification('onboarding', {
    recipientEmail, recipientPhone, firstName, role,
    loginUrl: 'https://app.thrive4better.com.au',
  }, channel);
}
