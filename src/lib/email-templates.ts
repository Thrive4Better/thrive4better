// Re-export all email templates from the shared API lib.
// This file allows frontend code to import templates using the @/ alias
// while the canonical source lives in api/lib/ for serverless function access.
export {
  welcomeEmail,
  verificationEmail,
  passwordResetEmail,
  invoiceEmail,
  paymentConfirmationEmail,
  shiftConfirmationEmail,
  magicLinkEmail,
  accountDeactivatedEmail,
  generalNotificationEmail,
} from '../../api/lib/email-templates';

export type { EmailTemplate } from '../../api/lib/email-templates';
