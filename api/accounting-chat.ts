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
    const { question, context } = req.body;

    if (!question || typeof question !== 'string') {
      return res.status(400).json({ error: 'Missing required field: question' });
    }

    if (question.length > 2000) {
      return res.status(400).json({ error: 'Question must be under 2000 characters' });
    }

    const systemPrompt = `You are an expert Australian accounting assistant specialising in NDIS provider businesses. You help with:

1. **GST/BAS Obligations**: Understanding BAS requirements, GST-free vs taxable supplies for NDIS providers, lodgement deadlines, and ATO compliance.
2. **Transaction Categorisation**: Helping classify expenses and income into correct chart of account categories.
3. **NDIS-Specific Accounting**: Mixed supply situations, claiming input tax credits, GST treatment of different NDIS support categories.
4. **Financial Summaries**: Interpreting profit & loss, balance sheet, and cash flow data.
5. **Payroll & Super**: PAYG withholding, super guarantee obligations (currently 11.5% for 2025-26), STP reporting.
6. **General Accounting Concepts**: Explaining debits/credits, accrual vs cash accounting, and other bookkeeping fundamentals.

Key facts:
- Most NDIS supports are GST-free under Division 38 of the GST Act (A New Tax System)
- Some NDIS services like plan management may attract GST
- BAS is lodged quarterly (Q1: Jul-Sep, Q2: Oct-Dec, Q3: Jan-Mar, Q4: Apr-Jun)
- BAS due date is 28 days after the end of the quarter
- Super guarantee rate is 11.5% for the 2025-26 financial year
- PAYG withholding must be remitted to the ATO as part of BAS
- ABN holders registered for GST must lodge BAS

When providing advice:
- Be clear and practical
- Use Australian English spelling
- Reference ATO guidelines where relevant
- Always recommend consulting a qualified accountant for complex or high-stakes decisions
- Keep responses concise but thorough
- Format with markdown for readability`;

    const userMessage = context
      ? `Here is a summary of the business's current financial data:\n\n${context}\n\n---\n\nQuestion: ${question}`
      : question;

    // Call Anthropic API
    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-3-5-20241022',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errorBody = await anthropicResponse.text();
      console.error('Anthropic API error:', anthropicResponse.status, errorBody);
      return res.status(502).json({ error: 'AI service unavailable', details: `Status ${anthropicResponse.status}` });
    }

    const anthropicData = await anthropicResponse.json();
    const responseText = anthropicData?.content?.[0]?.text || 'Sorry, I was unable to generate a response.';

    // Log to ai_generation_log
    try {
      await supabase.from('ai_generation_log').insert({
        user_id: user.id,
        generation_type: 'accounting_chat',
        model: 'claude-haiku-3-5-20241022',
        input_tokens: anthropicData?.usage?.input_tokens || null,
        output_tokens: anthropicData?.usage?.output_tokens || null,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log AI generation:', logError);
    }

    return res.status(200).json({
      success: true,
      response: responseText,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
