import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const telesignCustomerId = process.env.TELESIGN_CUSTOMER_ID;
const telesignApiKey = process.env.TELESIGN_API_KEY;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

// TeleSign requires HMAC-SHA256 authentication
function buildTelesignAuth(
  customerId: string,
  apiKey: string,
  resource: string,
  method: string,
  contentType: string,
  body: string,
) {
  const date = new Date().toUTCString();
  const contentMd5 = contentType === 'application/x-www-form-urlencoded'
    ? ''
    : '';
  const stringToSign = `${method}\n${contentMd5}\n${contentType}\n${date}\n${resource}`;
  const decodedKey = Buffer.from(apiKey, 'base64');
  const signature = crypto
    .createHmac('sha256', decodedKey)
    .update(stringToSign)
    .digest('base64');

  return {
    date,
    authorization: `TSA ${customerId}:${signature}`,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      .end();
  }

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

    // Check if TeleSign is configured
    if (!telesignCustomerId || !telesignApiKey) {
      console.warn('[SMS] TeleSign not configured - SMS not sent');
      return res.status(200).json({
        success: false,
        simulated: true,
        message: `SMS not sent (TeleSign not configured). Would have sent to ${to}: "${message}"`,
      });
    }

    // Format phone number — ensure it has country code (default AU +61)
    let phoneNumber = to.replace(/[\s\-()]/g, '');
    if (phoneNumber.startsWith('0')) {
      phoneNumber = '61' + phoneNumber.substring(1);
    }
    if (phoneNumber.startsWith('+')) {
      phoneNumber = phoneNumber.substring(1);
    }

    // TeleSign Messaging API
    const resource = '/v1/messaging';
    const contentType = 'application/x-www-form-urlencoded';
    const body = new URLSearchParams({
      phone_number: phoneNumber,
      message: message,
      message_type: 'ARN', // Alerts, Reminders, Notifications
    }).toString();

    const { date, authorization } = buildTelesignAuth(
      telesignCustomerId,
      telesignApiKey,
      resource,
      'POST',
      contentType,
      body,
    );

    const telesignRes = await fetch(`https://rest-ww.telesign.com${resource}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Accept: 'application/json',
        Date: date,
        Authorization: authorization,
      },
      body,
    });

    const telesignData = await telesignRes.json();

    if (!telesignRes.ok || telesignData.status?.code !== 290) {
      console.error('[SMS] TeleSign error:', telesignData);
      return res.status(500).json({
        error: 'Failed to send SMS',
        details: telesignData.status?.description || 'Unknown TeleSign error',
      });
    }

    console.log(`[SMS] Sent to ${phoneNumber}: ${telesignData.reference_id}`);

    return res.status(200).json({
      success: true,
      message: `SMS sent to ${to}`,
      referenceId: telesignData.reference_id,
      type: type || 'general',
    });
  } catch (error) {
    console.error('[SMS] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
