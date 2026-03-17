import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

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
    const { to, message, type } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields: to, message' });
    }

    // Check if Twilio is configured
    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      console.warn('Twilio not configured - SMS not sent');
      return res.status(200).json({
        success: false,
        simulated: true,
        message: `SMS not sent (Twilio not configured). Would have sent to ${to}: "${message}"`,
      });
    }

    // Use Twilio REST API directly (no SDK dependency needed)
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

    const body = new URLSearchParams({
      To: to,
      From: twilioPhoneNumber,
      Body: message,
    });

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error('Twilio error:', twilioData);
      return res.status(500).json({
        error: 'Failed to send SMS',
        details: twilioData.message || 'Unknown Twilio error',
      });
    }

    return res.status(200).json({
      success: true,
      message: `SMS sent to ${to}`,
      sid: twilioData.sid,
      type: type || 'general',
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
