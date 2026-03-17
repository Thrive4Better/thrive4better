// Thrive 4 Better - Branded Email Templates
// Uses the user's custom HTML templates with Poppins font, T4B brand colors,
// and correct business details (ABN 15 694 748 297, 20 Zelkova Cct, Fraser Rise VIC 3336)

export interface EmailTemplate {
  subject: string;
  preview: string;
  html: string;
}

// ─── Brand Constants ──────────────────────────────────────────────────────────
const FOREST = '#2D5A3D';
const SAGE = '#7A9E7E';
const BURGUNDY = '#8B2252';
const CREAM = '#FDF8F0';
const DARK_TEXT = '#1A1A1A';
const MID_GREY = '#666666';
const LOGO_URL = 'https://www.thrive4better.com/thrive4better-logo.png';
const PRIVACY_URL = 'https://www.thrive4better.com/privacy';
const BASE_URL = 'https://app.thrive4better.com.au';

const FONT_STACK = "'Poppins','Calibri',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";

// ─── Shared Layout ────────────────────────────────────────────────────────────
function wrapInLayout(title: string, previewText: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
<!--[if mso]>
<style type="text/css">
body, table, td, p, h1, a { font-family: Calibri, Arial, sans-serif !important; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${CREAM};font-family:${FONT_STACK};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;">${previewText}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${CREAM};">
<tr><td align="center" style="padding:40px 16px;">

<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#FFFFFF;border-radius:8px;overflow:hidden;">

<tr>
<td align="center" style="background-color:${FOREST};padding:28px 40px;">
<img src="${LOGO_URL}" alt="Thrive 4 Better" width="180" height="48" style="display:block;border:0;outline:none;max-width:180px;height:auto;" />
</td>
</tr>

<tr>
<td style="background-color:${SAGE};height:3px;line-height:3px;font-size:1px;">&nbsp;</td>
</tr>

<tr>
<td style="padding:32px 40px;">
${bodyContent}
</td>
</tr>

<tr>
<td style="border-top:1px solid #E8E8E8;padding:20px 40px;text-align:center;">
<p style="font-size:12px;color:${MID_GREY};line-height:1.5;margin:0 0 4px;font-family:${FONT_STACK};">Thrive 4 Better | Supporting Your Growth</p>
<p style="font-size:12px;color:${MID_GREY};line-height:1.5;margin:0 0 4px;font-family:${FONT_STACK};">20 Zelkova Cct, Fraser Rise VIC 3336</p>
<p style="font-size:12px;color:${MID_GREY};line-height:1.5;margin:0 0 4px;font-family:${FONT_STACK};">
<a href="${PRIVACY_URL}" style="color:${SAGE};text-decoration:underline;">Privacy Policy</a>
&middot;
<a href="${BASE_URL}/unsubscribe" style="color:${SAGE};text-decoration:underline;">Unsubscribe</a>
</p>
<p style="font-size:11px;color:#999999;margin:8px 0 0;font-family:${FONT_STACK};">&copy; ${new Date().getFullYear()} Thrive 4 Better. All rights reserved.</p>
</td>
</tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ─── Reusable Components ──────────────────────────────────────────────────────
function ctaButton(text: string, url: string, color: string = FOREST): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td align="center" style="background-color:${color};border-radius:6px;">
<a href="${url}" target="_blank" style="display:inline-block;background-color:${color};border-radius:6px;color:#FFFFFF;font-size:15px;font-weight:600;font-family:${FONT_STACK};text-decoration:none;padding:12px 32px;border:1px solid ${color};">${text}</a>
</td></tr>
</table>`;
}

function infoBox(content: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px;">
<tr><td style="background-color:${CREAM};border-left:3px solid ${SAGE};padding:14px 18px;border-radius:0 4px 4px 0;">
${content}
</td></tr>
</table>`;
}

function p(text: string, size: number = 15, color: string = DARK_TEXT): string {
  return `<p style="font-size:${size}px;line-height:1.6;color:${color};margin:0 0 16px;font-family:${FONT_STACK};">${text}</p>`;
}

function h1(text: string): string {
  return `<h1 style="font-size:22px;font-weight:700;color:${DARK_TEXT};line-height:1.3;margin:0 0 16px;font-family:${FONT_STACK};">${text}</h1>`;
}

function smallText(text: string): string {
  return `<p style="font-size:13px;line-height:1.5;color:${MID_GREY};margin:0 0 16px;font-family:${FONT_STACK};">${text}</p>`;
}

function infoRow(label: string, value: string): string {
  return `<p style="font-size:14px;color:${DARK_TEXT};margin:0 0 4px;line-height:1.6;font-family:${FONT_STACK};"><strong>${label}:</strong> ${value}</p>`;
}

// ─── Template Functions ───────────────────────────────────────────────────────

export function welcomeEmail(firstName: string): EmailTemplate {
  const subject = `Welcome to Thrive 4 Better, ${firstName}`;
  const preview = `Welcome to Thrive 4 Better, ${firstName}`;

  const body = `${h1(`Welcome, ${firstName}`)}
${p("Thanks for creating your account with Thrive 4 Better. We're glad to have you on board.")}
${p("You can now log in to your portal to manage your details, view invoices, and stay connected with your support team.")}
${ctaButton('Go to your portal', BASE_URL)}
${smallText("If you didn't create this account, you can safely ignore this email.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

export function verificationEmail(
  firstName: string,
  verificationUrl: string,
  verificationCode: string,
  expiryMinutes: number = 60
): EmailTemplate {
  const subject = 'Verify your email address';
  const preview = 'Verify your email address';

  const body = `${h1('Verify your email')}
${p(`Hi ${firstName},`)}
${p("Please confirm your email address by clicking the button below. This helps us keep your account secure.")}
${ctaButton('Verify email address', verificationUrl)}
${p("Or enter this code manually:")}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td style="background-color:${CREAM};border:1px solid #E8E8E8;border-radius:6px;font-size:32px;font-weight:700;letter-spacing:0.2em;color:${FOREST};padding:14px 28px;font-family:'Courier New',monospace;text-align:center;">${verificationCode}</td></tr>
</table>
${smallText(`This link expires in ${expiryMinutes} minutes. If you didn't request this, no action is needed.`)}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

export function passwordResetEmail(
  firstName: string,
  resetUrl: string,
  expiryMinutes: number = 60
): EmailTemplate {
  const subject = 'Reset your password';
  const preview = 'Reset your password';

  const body = `${h1('Reset your password')}
${p(`Hi ${firstName},`)}
${p("We received a request to reset your password. Click the button below to choose a new one.")}
${ctaButton('Reset password', resetUrl, BURGUNDY)}
${smallText(`This link expires in ${expiryMinutes} minutes. If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.`)}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;"><tr><td style="border-top:1px solid #E8E8E8;height:1px;line-height:1px;font-size:1px;">&nbsp;</td></tr></table>
${infoBox(`<p style="font-size:13px;color:${MID_GREY};margin:0;line-height:1.5;font-family:${FONT_STACK};"><strong style="color:${DARK_TEXT};">Security tip:</strong> Thrive 4 Better will never ask for your password by email or phone. If you're unsure about this request, contact us directly.</p>`)}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

export function invoiceEmail(
  firstName: string,
  invoiceNumber: string,
  amountDue: string,
  dueDate: string
): EmailTemplate {
  const subject = `Invoice ${invoiceNumber} - ${amountDue} due ${dueDate}`;
  const preview = `Invoice ${invoiceNumber} - ${amountDue} due ${dueDate}`;

  const body = `${h1('New invoice')}
${p(`Hi ${firstName},`)}
${p("A new invoice has been issued for your account.")}
${infoBox(`${infoRow('Invoice', invoiceNumber)}${infoRow('Amount due', amountDue)}
<p style="font-size:14px;color:${DARK_TEXT};margin:0;line-height:1.6;font-family:${FONT_STACK};"><strong>Due date:</strong> ${dueDate}</p>`)}
${ctaButton('View invoice', `${BASE_URL}/invoices`)}
${smallText("If you have any questions about this invoice, reply to this email or contact your support coordinator.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

export function paymentConfirmationEmail(
  firstName: string,
  invoiceNumber: string,
  amountPaid: string,
  paymentDate: string
): EmailTemplate {
  const subject = `Payment received - ${amountPaid}`;
  const preview = `Payment received - ${amountPaid}`;

  const body = `${h1('Payment received')}
${p(`Hi ${firstName},`)}
${p("We've received your payment. Here's a summary:")}
${infoBox(`${infoRow('Invoice', invoiceNumber)}${infoRow('Amount paid', amountPaid)}
<p style="font-size:14px;color:${DARK_TEXT};margin:0;line-height:1.6;font-family:${FONT_STACK};"><strong>Date:</strong> ${paymentDate}</p>`)}
${ctaButton('View receipt', `${BASE_URL}/invoices`)}
${smallText("Thank you for your prompt payment.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

export function shiftConfirmationEmail(
  carerName: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string,
  serviceType: string,
  address: string,
  notes: string
): EmailTemplate {
  const subject = `Shift Confirmation - ${clientName} on ${date}`;
  const preview = `You have a confirmed shift with ${clientName} on ${date} from ${startTime} to ${endTime}.`;

  const detailRows = [
    infoRow('Client', clientName),
    infoRow('Date', date),
    infoRow('Time', `${startTime} - ${endTime}`),
    serviceType ? infoRow('Service Type', serviceType) : '',
    address ? infoRow('Location', address) : '',
    notes ? infoRow('Notes', notes) : '',
  ].filter(Boolean).join('');

  const body = `${h1('Shift confirmed')}
${p(`Hi ${carerName},`)}
${p("Your upcoming shift has been confirmed. Please review the details below:")}
${infoBox(detailRows)}
${smallText("If you have any questions or need to make changes to this shift, please contact us as soon as possible.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

export function magicLinkEmail(
  firstName: string,
  magicLinkUrl: string,
  expiryMinutes: number = 10
): EmailTemplate {
  const subject = 'Your sign-in link';
  const preview = 'Your sign-in link';

  const body = `${h1('Sign in to your account')}
${p(`Hi ${firstName},`)}
${p("Click the button below to sign in. No password needed.")}
${ctaButton('Sign in', magicLinkUrl)}
${smallText(`This link expires in ${expiryMinutes} minutes and can only be used once. If you didn't request this, no action is needed.`)}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

export function accountDeactivatedEmail(firstName: string): EmailTemplate {
  const subject = 'Your account has been deactivated';
  const preview = 'Your account has been deactivated';

  const body = `${h1('Account deactivated')}
${p(`Hi ${firstName},`)}
${p("Your Thrive 4 Better account has been deactivated as requested. Your data will be retained in accordance with our privacy policy and NDIS record-keeping requirements.")}
${p(`If this was a mistake or you'd like to reactivate your account, contact us at <a href="mailto:hello@thrive4better.com.au" style="color:${FOREST};text-decoration:underline;">hello@thrive4better.com.au</a>.`)}
${smallText("We wish you all the best. You're always welcome back.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

export function generalNotificationEmail(
  firstName: string,
  emailSubject: string,
  bodyLine1: string,
  bodyLine2: string,
  ctaLabel: string,
  ctaUrl: string
): EmailTemplate {
  const preview = emailSubject;

  const body = `${h1(emailSubject)}
${p(`Hi ${firstName},`)}
${p(bodyLine1)}
${p(bodyLine2)}
${ctaButton(ctaLabel, ctaUrl)}`;

  return { subject: emailSubject, preview, html: wrapInLayout(emailSubject, preview, body) };
}

// ─── Roster / Shift Assignment ──────────────────────────────────────────────
export function shiftAssignedEmail(
  carerName: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string,
  serviceType: string,
  address: string,
  notes: string
): EmailTemplate {
  const subject = `New Shift Assigned - ${clientName} on ${date}`;
  const preview = `You've been assigned a new shift with ${clientName} on ${date}.`;

  const detailRows = [
    infoRow('Client', clientName),
    infoRow('Date', date),
    infoRow('Time', `${startTime} - ${endTime}`),
    serviceType ? infoRow('Service Type', serviceType) : '',
    address ? infoRow('Location', address) : '',
    notes ? infoRow('Notes', notes) : '',
  ].filter(Boolean).join('');

  const body = `${h1('New shift assigned')}
${p(`Hi ${carerName},`)}
${p("You've been assigned a new shift. Please review the details below and confirm your availability.")}
${infoBox(detailRows)}
${ctaButton('View roster', `${BASE_URL}/roster`)}
${smallText("Please contact us immediately if you're unable to attend this shift.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Shift Cancelled ────────────────────────────────────────────────────────
export function shiftCancelledEmail(
  carerName: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string,
  reason: string
): EmailTemplate {
  const subject = `Shift Cancelled - ${clientName} on ${date}`;
  const preview = `Your shift with ${clientName} on ${date} has been cancelled.`;

  const detailRows = [
    infoRow('Client', clientName),
    infoRow('Date', date),
    infoRow('Time', `${startTime} - ${endTime}`),
    reason ? infoRow('Reason', reason) : '',
  ].filter(Boolean).join('');

  const body = `${h1('Shift cancelled')}
${p(`Hi ${carerName},`)}
${p("We wanted to let you know that the following shift has been cancelled:")}
${infoBox(detailRows)}
${p("Your roster has been updated accordingly. If you have any questions, please contact us.")}
${ctaButton('View roster', `${BASE_URL}/roster`)}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Shift Updated / Rescheduled ────────────────────────────────────────────
export function shiftUpdatedEmail(
  carerName: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string,
  changeDescription: string
): EmailTemplate {
  const subject = `Shift Updated - ${clientName} on ${date}`;
  const preview = `Your shift with ${clientName} has been updated.`;

  const detailRows = [
    infoRow('Client', clientName),
    infoRow('Date', date),
    infoRow('Time', `${startTime} - ${endTime}`),
    changeDescription ? infoRow('What changed', changeDescription) : '',
  ].filter(Boolean).join('');

  const body = `${h1('Shift updated')}
${p(`Hi ${carerName},`)}
${p("Your shift details have been updated. Please review the new information below:")}
${infoBox(detailRows)}
${ctaButton('View roster', `${BASE_URL}/roster`)}
${smallText("If you have any concerns about these changes, please contact us as soon as possible.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Roster Published / Weekly Schedule ─────────────────────────────────────
export function weeklyRosterEmail(
  carerName: string,
  weekStartDate: string,
  weekEndDate: string,
  shiftSummaries: { date: string; time: string; client: string }[]
): EmailTemplate {
  const subject = `Your Roster - Week of ${weekStartDate}`;
  const preview = `Your roster for the week of ${weekStartDate} is ready.`;

  const shiftRows = shiftSummaries.map(s =>
    `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:${DARK_TEXT};font-family:${FONT_STACK};">${s.date}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:${DARK_TEXT};font-family:${FONT_STACK};">${s.time}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:${DARK_TEXT};font-family:${FONT_STACK};">${s.client}</td>
    </tr>`
  ).join('');

  const shiftTable = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 24px;border:1px solid #e8e8e8;border-radius:6px;overflow:hidden;">
    <tr style="background-color:${FOREST};">
      <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#FFFFFF;font-family:${FONT_STACK};">Date</th>
      <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#FFFFFF;font-family:${FONT_STACK};">Time</th>
      <th style="padding:10px 12px;text-align:left;font-size:13px;font-weight:600;color:#FFFFFF;font-family:${FONT_STACK};">Client</th>
    </tr>
    ${shiftRows}
  </table>`;

  const body = `${h1('Your weekly roster')}
${p(`Hi ${carerName},`)}
${p(`Here's your schedule for <strong>${weekStartDate}</strong> to <strong>${weekEndDate}</strong>:`)}
${shiftSummaries.length > 0 ? shiftTable : infoBox(p('No shifts scheduled for this week.', 14))}
${p(`<strong>${shiftSummaries.length} shift${shiftSummaries.length !== 1 ? 's' : ''}</strong> scheduled this week.`)}
${ctaButton('View full roster', `${BASE_URL}/roster`)}
${smallText("If you need to swap or adjust a shift, please contact your coordinator as soon as possible.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Client Appointment Reminder ────────────────────────────────────────────
export function clientAppointmentReminderEmail(
  recipientName: string,
  clientName: string,
  date: string,
  time: string,
  carerName: string,
  serviceType: string
): EmailTemplate {
  const subject = `Appointment Reminder - ${clientName} on ${date}`;
  const preview = `Reminder: ${clientName} has an appointment on ${date} at ${time}.`;

  const detailRows = [
    infoRow('Participant', clientName),
    infoRow('Date', date),
    infoRow('Time', time),
    carerName ? infoRow('Support Worker', carerName) : '',
    serviceType ? infoRow('Service', serviceType) : '',
  ].filter(Boolean).join('');

  const body = `${h1('Appointment reminder')}
${p(`Hi ${recipientName},`)}
${p(`This is a friendly reminder of an upcoming appointment:`)}
${infoBox(detailRows)}
${p("If you need to reschedule, please contact us at least 24 hours in advance.")}
${ctaButton('View appointments', `${BASE_URL}/roster`)}
${smallText("Contact us if you have any questions about this appointment.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Payslip Ready ──────────────────────────────────────────────────────────
export function payslipReadyEmail(
  staffName: string,
  payPeriod: string,
  netPay: string,
  payDate: string
): EmailTemplate {
  const subject = `Your Payslip is Ready - ${payPeriod}`;
  const preview = `Your payslip for ${payPeriod} is ready to view.`;

  const body = `${h1('Payslip ready')}
${p(`Hi ${staffName},`)}
${p(`Your payslip for the period <strong>${payPeriod}</strong> is now available.`)}
${infoBox(`${infoRow('Pay Period', payPeriod)}${infoRow('Net Pay', netPay)}${infoRow('Pay Date', payDate)}`)}
${ctaButton('View payslip', `${BASE_URL}/payroll`)}
${smallText("If you have any questions about your pay, please contact the office.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Contractor Invoice Approved ────────────────────────────────────────────
export function contractorInvoiceApprovedEmail(
  contractorName: string,
  invoiceNumber: string,
  amount: string,
  approvedDate: string
): EmailTemplate {
  const subject = `Invoice ${invoiceNumber} Approved`;
  const preview = `Your invoice ${invoiceNumber} has been approved for payment.`;

  const body = `${h1('Invoice approved')}
${p(`Hi ${contractorName},`)}
${p("Great news! Your submitted invoice has been approved for payment.")}
${infoBox(`${infoRow('Invoice', invoiceNumber)}${infoRow('Amount', amount)}${infoRow('Approved', approvedDate)}`)}
${p("Payment will be processed in the next pay run. You'll receive a remittance advice when payment is made.")}
${ctaButton('View invoices', `${BASE_URL}/staff/invoices`)}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Contractor Invoice Rejected ────────────────────────────────────────────
export function contractorInvoiceRejectedEmail(
  contractorName: string,
  invoiceNumber: string,
  amount: string,
  reason: string
): EmailTemplate {
  const subject = `Invoice ${invoiceNumber} Requires Attention`;
  const preview = `Your invoice ${invoiceNumber} needs revision.`;

  const body = `${h1('Invoice needs revision')}
${p(`Hi ${contractorName},`)}
${p("Your submitted invoice requires some changes before it can be approved.")}
${infoBox(`${infoRow('Invoice', invoiceNumber)}${infoRow('Amount', amount)}${reason ? infoRow('Feedback', reason) : ''}`)}
${p("Please review the feedback and resubmit your invoice.")}
${ctaButton('Resubmit invoice', `${BASE_URL}/staff/invoices`)}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Onboarding Welcome ─────────────────────────────────────────────────────
export function onboardingEmail(
  firstName: string,
  role: string,
  loginUrl: string
): EmailTemplate {
  const subject = `Welcome to the Thrive 4 Better Team`;
  const preview = `Welcome ${firstName}! Your onboarding documents are ready.`;

  const body = `${h1(`Welcome to the team, ${firstName}!`)}
${p("We're thrilled to have you join Thrive 4 Better. Your account has been set up and there are a few things to get you started.")}
${infoBox(`${infoRow('Role', role)}${infoRow('Organisation', 'Thrive 4 Better')}`)}
${p("<strong>Next steps:</strong>")}
<ol style="font-size:15px;color:${DARK_TEXT};line-height:1.8;font-family:${FONT_STACK};margin:0 0 16px;padding-left:20px;">
  <li>Log in to your account using the button below</li>
  <li>Complete your onboarding checklist</li>
  <li>Review and sign the required company documents</li>
  <li>Set up your profile with your details and availability</li>
</ol>
${ctaButton('Get started', loginUrl)}
${smallText("If you need any help, reach out to your coordinator or reply to this email.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Overdue Invoice Reminder (branded) ─────────────────────────────────────
export function overdueInvoiceReminderEmail(
  recipientName: string,
  clientName: string,
  invoiceNumber: string,
  amount: string,
  dueDate: string,
  daysPastDue: number
): EmailTemplate {
  const subject = `Payment Reminder - Invoice ${invoiceNumber} Overdue`;
  const preview = `Invoice ${invoiceNumber} for ${clientName} is ${daysPastDue} days overdue.`;

  const body = `${h1('Payment reminder')}
${p(`Hi ${recipientName},`)}
${p("This is a friendly reminder regarding an outstanding invoice:")}
${infoBox(`${infoRow('Invoice', invoiceNumber)}${infoRow('Participant', clientName)}${infoRow('Amount', `$${amount}`)}${infoRow('Due Date', dueDate)}
<p style="font-size:14px;color:#dc2626;margin:4px 0 0;line-height:1.6;font-family:${FONT_STACK};"><strong>${daysPastDue} day(s) overdue</strong></p>`)}
${p("Please arrange payment at your earliest convenience. If payment has already been made, please disregard this reminder.")}
${ctaButton('View invoice', `${BASE_URL}/invoices`)}
${smallText("For payment queries, reply to this email or contact us at hello@thrive4better.com.au.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Shift Reminder (branded) ───────────────────────────────────────────────
export function shiftReminderEmail(
  carerName: string,
  clientName: string,
  date: string,
  startTime: string,
  endTime: string,
  address: string
): EmailTemplate {
  const subject = `Shift Reminder - ${clientName} tomorrow`;
  const preview = `Reminder: You have a shift with ${clientName} tomorrow at ${startTime}.`;

  const detailRows = [
    infoRow('Client', clientName),
    infoRow('Date', date),
    infoRow('Time', `${startTime} - ${endTime}`),
    address ? infoRow('Location', address) : '',
  ].filter(Boolean).join('');

  const body = `${h1('Shift reminder')}
${p(`Hi ${carerName},`)}
${p("Just a reminder about your upcoming shift:")}
${infoBox(detailRows)}
${p("Please arrive 5 minutes early and ensure you have everything you need for the session.")}
${ctaButton('View roster', `${BASE_URL}/roster`)}
${smallText("Contact us immediately if you're unable to attend.")}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── New Client Added ───────────────────────────────────────────────────────
export function newClientAddedEmail(
  adminName: string,
  clientName: string,
  ndisNumber: string,
  fundingType: string
): EmailTemplate {
  const subject = `New Client Added - ${clientName}`;
  const preview = `${clientName} has been added to the system.`;

  const body = `${h1('New client added')}
${p(`Hi ${adminName},`)}
${p("A new client has been added to the Thrive 4 Better system:")}
${infoBox(`${infoRow('Client', clientName)}${ndisNumber ? infoRow('NDIS Number', ndisNumber) : ''}${infoRow('Funding Type', fundingType)}`)}
${ctaButton('View client profile', `${BASE_URL}/clients`)}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}

// ─── Document Signed ────────────────────────────────────────────────────────
export function documentSignedEmail(
  adminName: string,
  staffName: string,
  documentName: string,
  signedDate: string
): EmailTemplate {
  const subject = `Document Signed - ${documentName} by ${staffName}`;
  const preview = `${staffName} has signed ${documentName}.`;

  const body = `${h1('Document signed')}
${p(`Hi ${adminName},`)}
${p(`<strong>${staffName}</strong> has completed and signed the following document:`)}
${infoBox(`${infoRow('Document', documentName)}${infoRow('Signed by', staffName)}${infoRow('Date', signedDate)}`)}
${ctaButton('View documents', `${BASE_URL}/documents`)}`;

  return { subject, preview, html: wrapInLayout(subject, preview, body) };
}
