import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { shiftConfirmationEmail } from './lib/email-templates';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const resendApiKey = process.env.RESEND_API_KEY!;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'invoices@thrive4better.com.au';

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
    const { shiftId } = req.body;

    if (!shiftId) {
      return res.status(400).json({ error: 'Missing required field: shiftId' });
    }

    // Fetch the shift
    const { data: shift, error: shiftError } = await supabase
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .single();

    if (shiftError || !shift) {
      return res.status(404).json({ error: 'Shift not found' });
    }

    // Fetch carer details
    const { data: carer, error: carerError } = await supabase
      .from('carers')
      .select('*')
      .eq('id', shift.carer_id)
      .single();

    if (carerError || !carer) {
      return res.status(404).json({ error: 'Carer not found' });
    }

    // Fetch client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', shift.client_id)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    if (!carer.email) {
      return res.status(400).json({ error: 'Carer does not have an email address' });
    }

    // Format date and times for display
    const shiftDate = shift.date || shift.shift_date || '';
    const startTime = shift.start_time || '';
    const endTime = shift.end_time || '';
    const serviceType = shift.service_type || '';
    const location = client.address || '';
    const notes = shift.notes || '';

    // Build branded email from template
    const emailTemplate = shiftConfirmationEmail(
      carer.name || 'Carer',
      client.name,
      shiftDate,
      startTime,
      endTime,
      serviceType,
      location,
      notes
    );

    // Send confirmation email to carer
    const resend = new Resend(resendApiKey);

    const { error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: carer.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if (emailError) {
      console.error('Resend error:', emailError);
      return res.status(500).json({ error: 'Failed to send email', details: emailError.message });
    }

    return res.status(200).json({
      success: true,
      message: `Shift confirmation sent to ${carer.email}`,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
