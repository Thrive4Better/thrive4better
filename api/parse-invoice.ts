import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY!;

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
    const { text, clientNames } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Missing required field: text' });
    }

    const today = new Date().toISOString().split('T')[0];

    const userPrompt = `Parse this natural language invoice entry into structured data. Today's date is ${today}.

Input text: "${text}"

${clientNames && clientNames.length > 0 ? `Known client names (fuzzy match against these): ${clientNames.join(', ')}` : ''}

Extract the following fields:
- clientName: The client's name (best fuzzy match from known clients if provided)
- serviceType: One of "Daily Living", "Community Access", "SIL", "Transport", "Social/Rec", "Other"
- date: The date in YYYY-MM-DD format (interpret relative dates like "Monday", "yesterday", "last Tuesday" relative to today ${today})
- startTime: Start time in HH:MM (24h) format if mentioned
- endTime: End time in HH:MM (24h) format if mentioned
- hours: Duration in hours (calculate from start/end if both given, or parse directly if stated like "3 hours")
- description: A brief description of the service provided
- supportCategory: Best matching NDIS support category from: "Core - Assistance with Daily Life", "Core - Transport", "Core - Assistance with Social & Community Participation", "Capacity Building - Support Coordination", "Capacity Building - Increased Social & Community Participation", "SIL - Supported Independent Living"

If a field cannot be determined, set it to null. Be flexible with natural language - users might say "community access" or "CA" for Community Access, "daily living" or "DL" etc.

Respond with valid JSON only in this exact structure:
{
  "clientName": "string or null",
  "serviceType": "string or null",
  "date": "YYYY-MM-DD or null",
  "startTime": "HH:MM or null",
  "endTime": "HH:MM or null",
  "hours": number or null,
  "description": "string or null",
  "supportCategory": "string or null",
  "confidence": number between 0 and 1
}`;

    // Call Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250514',
        max_tokens: 1024,
        system: 'You are an NDIS invoice data parser. Extract structured invoice data from natural language input. Output valid JSON only, no markdown formatting.',
        messages: [
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorBody);
      return res.status(502).json({ error: 'AI service unavailable', details: `Status ${anthropicResponse.status}` });
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData?.content?.[0]?.text || '';

    // Parse JSON from the response
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[1].trim());
        } catch {
          console.error('Failed to parse AI response as JSON:', rawText.substring(0, 500));
          return res.status(500).json({ error: 'Failed to parse AI response', rawText: rawText.substring(0, 1000) });
        }
      } else {
        console.error('Failed to parse AI response as JSON:', rawText.substring(0, 500));
        return res.status(500).json({ error: 'Failed to parse AI response', rawText: rawText.substring(0, 1000) });
      }
    }

    // Log to ai_generation_log
    try {
      await supabase.from('ai_generation_log').insert({
        user_id: user.id,
        generation_type: 'invoice_parse',
        model: 'claude-sonnet-4-5-20250514',
        input_tokens: anthropicData?.usage?.input_tokens || null,
        output_tokens: anthropicData?.usage?.output_tokens || null,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log AI generation:', logError);
    }

    return res.status(200).json({
      success: true,
      parsed,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
