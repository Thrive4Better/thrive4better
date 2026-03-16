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
