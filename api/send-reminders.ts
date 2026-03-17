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

function formatTime12(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${mStr}${suffix}`;
}

function buildTelesignAuth(
  customerId: string,
  apiKey: string,
  resource: string,
  method: string,
  contentType: string,
) {
  const date = new Date().toUTCString();
  const stringToSign = `${method}\n\n${contentType}\n${date}\n${resource}`;
  const decodedKey = Buffer.from(apiKey, 'base64');
  const signature = crypto
    .createHmac('sha256', decodedKey)
    .update(stringToSign)
    .digest('base64');
  return { date, authorization: `TSA ${customerId}:${signature}` };
}

function formatAuPhone(phone: string): string {
  let p = phone.replace(/[\s\-()]/g, '');
  if (p.startsWith('0')) p = '61' + p.substring(1);
  if (p.startsWith('+')) p = p.substring(1);
  return p;
}

async function sendSms(to: string, message: string): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  if (!telesignCustomerId || !telesignApiKey) {
    return { success: false, simulated: true, error: 'TeleSign not configured' };
  }

  const resource = '/v1/messaging';
  const contentType = 'application/x-www-form-urlencoded';
  const body = new URLSearchParams({
    phone_number: formatAuPhone(to),
    message,
    message_type: 'ARN',
  }).toString();

  const { date, authorization } = buildTelesignAuth(
    telesignCustomerId, telesignApiKey, resource, 'POST', contentType,
  );

  try {
    const res = await fetch(`https://rest-ww.telesign.com${resource}`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Accept: 'application/json',
        Date: date,
        Authorization: authorization,
      },
      body,
    });

    const data = await res.json();
    if (!res.ok || data.status?.code !== 290) {
      return { success: false, error: data.status?.description || 'TeleSign error' };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { shiftIds } = req.body || {};
    let shifts: any[];

    if (shiftIds && Array.isArray(shiftIds) && shiftIds.length > 0) {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .in('id', shiftIds);
      if (error) return res.status(500).json({ error: 'Failed to fetch shifts', details: error.message });
      shifts = data || [];
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('date', tomorrowStr)
        .in('status', ['Scheduled', 'Confirmed']);
      if (error) return res.status(500).json({ error: 'Failed to fetch shifts', details: error.message });
      shifts = data || [];
    }

    if (shifts.length === 0) {
      return res.status(200).json({ success: true, message: 'No shifts found', sent: 0, failed: 0 });
    }

    const carerIds = [...new Set(shifts.map((s: any) => s.carer_id).filter(Boolean))];
    const clientIds = [...new Set(shifts.map((s: any) => s.client_id).filter(Boolean))];

    const [carersResult, clientsResult] = await Promise.all([
      carerIds.length > 0 ? supabase.from('carers').select('*').in('id', carerIds) : { data: [], error: null },
      clientIds.length > 0 ? supabase.from('clients').select('*').in('id', clientIds) : { data: [], error: null },
    ]);

    const carersMap = new Map((carersResult.data || []).map((c: any) => [c.id, c]));
    const clientsMap = new Map((clientsResult.data || []).map((c: any) => [c.id, c]));

    let sent = 0, failed = 0, simulated = 0;
    const results: any[] = [];

    for (const shift of shifts) {
      const carer = carersMap.get(shift.carer_id);
      const client = clientsMap.get(shift.client_id);

      if (!carer || !carer.phone) {
        results.push({ shiftId: shift.id, status: 'skipped', reason: 'No carer phone' });
        failed++;
        continue;
      }

      const carerFirstName = carer.first_name || carer.name?.split(' ')[0] || 'there';
      const clientName = client
        ? `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'your client'
        : 'your client';
      const location = client?.address || '';
      const startTime = shift.start_time || '';

      let message = `Hi ${carerFirstName}, reminder: you have a shift with ${clientName} tomorrow at ${formatTime12(startTime)}`;
      if (location) message += ` at ${location}`;
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
      sent, simulated, failed, results,
    });
  } catch (error) {
    console.error('[Reminders] Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
