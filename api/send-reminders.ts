import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioMessagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function formatTime12(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr}${suffix}`;
}

async function sendSms(to: string, message: string): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  if (!twilioAccountSid || !twilioAuthToken || (!twilioMessagingServiceSid && !twilioPhoneNumber)) {
    return { success: false, simulated: true, error: 'Twilio not configured' };
  }

  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
  const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

  const body = new URLSearchParams({
    To: to,
    Body: message,
  });
  if (twilioMessagingServiceSid) {
    body.set('MessagingServiceSid', twilioMessagingServiceSid);
  } else {
    body.set('From', twilioPhoneNumber!);
  }

  try {
    const res = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const data = await res.json();
      return { success: false, error: data.message || 'Twilio error' };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
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
    // Accept optional shiftIds array; if not provided, look up tomorrow's shifts
    const { shiftIds } = req.body || {};

    let shifts: any[];

    if (shiftIds && Array.isArray(shiftIds) && shiftIds.length > 0) {
      // Send reminders for specific shifts
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch shifts', details: error.message });
      }
      shifts = data || [];
    } else {
      // Default: fetch tomorrow's shifts
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('date', tomorrowStr)
        .in('status', ['Scheduled', 'Confirmed']);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch shifts', details: error.message });
      }
      shifts = data || [];
    }

    if (shifts.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No shifts found to send reminders for',
        sent: 0,
        failed: 0,
      });
    }

    // Gather unique carer and client IDs
    const carerIds = [...new Set(shifts.map((s: any) => s.carer_id).filter(Boolean))];
    const clientIds = [...new Set(shifts.map((s: any) => s.client_id).filter(Boolean))];

    // Fetch carers and clients
    const [carersResult, clientsResult] = await Promise.all([
      carerIds.length > 0
        ? supabase.from('carers').select('*').in('id', carerIds)
        : { data: [], error: null },
      clientIds.length > 0
        ? supabase.from('clients').select('*').in('id', clientIds)
        : { data: [], error: null },
    ]);

    const carersMap = new Map((carersResult.data || []).map((c: any) => [c.id, c]));
    const clientsMap = new Map((clientsResult.data || []).map((c: any) => [c.id, c]));

    let sent = 0;
    let failed = 0;
    let simulated = 0;
    const results: any[] = [];

    for (const shift of shifts) {
      const carer = carersMap.get(shift.carer_id);
      const client = clientsMap.get(shift.client_id);

      if (!carer || !carer.phone) {
        results.push({ shiftId: shift.id, status: 'skipped', reason: 'No carer phone number' });
        failed++;
        continue;
      }

      const carerFirstName = carer.first_name || carer.name?.split(' ')[0] || 'there';
      const clientName = client
        ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || client.name || 'your client'
        : 'your client';
      const location = client?.address || '';
      const startTime = shift.start_time || '';

      let message = `Hi ${carerFirstName}, reminder: you have a shift with ${clientName} tomorrow at ${formatTime12(startTime)}`;
      if (location) {
        message += ` at ${location}`;
      }
      message += '. - Thrive 4 Better';

      const smsResult = await sendSms(carer.phone, message);

      if (smsResult.simulated) {
        simulated++;
        results.push({ shiftId: shift.id, status: 'simulated', to: carer.phone, message });
      } else if (smsResult.success) {
        sent++;
        results.push({ shiftId: shift.id, status: 'sent', to: carer.phone });
      } else {
        failed++;
        results.push({ shiftId: shift.id, status: 'failed', error: smsResult.error });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Processed ${shifts.length} shift(s): ${sent} sent, ${simulated} simulated, ${failed} failed`,
      sent,
      simulated,
      failed,
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
