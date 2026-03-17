import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { invoiceEmail } from './lib/email-templates.js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'invoices@admin.thrive4better.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      .end();
  }

  // Set CORS headers on all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Extract and verify JWT
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
    const { invoiceId, pdfBase64 } = req.body;

    if (!invoiceId || !pdfBase64) {
      return res.status(400).json({ error: 'Missing required fields: invoiceId, pdfBase64' });
    }

    // Fetch the invoice with line items
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    // Fetch the client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', invoice.client_id)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Determine recipient email based on funding type
    let recipientEmail: string;
    switch (invoice.funding_type) {
      case 'Plan Managed':
        recipientEmail = client.plan_manager_email || client.email;
        break;
      case 'Self Managed':
      case 'Agency Managed':
      default:
        recipientEmail = client.email;
        break;
    }

    if (!recipientEmail) {
      return res.status(400).json({ error: 'No recipient email address available for this client' });
    }

    // Build branded email from template
    const totalFormatted = `$${(Number(invoice.total) || 0).toFixed(2)}`;
    const dueDate = invoice.due_date || invoice.period_end || '';
    const clientFirstName = (client.first_name || client.name || 'Client').split(' ')[0];
    const emailTemplate = invoiceEmail(
      clientFirstName,
      invoice.invoice_number,
      totalFormatted,
      dueDate
    );

    // Send email via Resend
    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: recipientEmail,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      attachments: [
        {
          filename: `${invoice.invoice_number}.pdf`,
          content: pdfBase64,
        },
      ],
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return res.status(500).json({ error: 'Failed to send email', details: emailError.message });
    }

    // Update invoice status to Sent
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'Sent' })
      .eq('id', invoiceId);

    if (updateError) {
      console.error('Failed to update invoice status:', updateError);
      // Email was sent successfully, so we still return 200 but note the update failure
      return res.status(200).json({
        success: true,
        message: 'Invoice email sent successfully, but failed to update invoice status',
      });
    }

    return res.status(200).json({
      success: true,
      message: `Invoice ${invoice.invoice_number} sent to ${recipientEmail}`,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
