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
    const {
      location,
      willingToDrive,
      maxDistance,
      interests,
      supportNeeds,
      budget,
      groupSize,
      clientName,
    } = req.body;

    if (!location || !interests || !Array.isArray(interests) || interests.length === 0 || !budget) {
      return res.status(400).json({ error: 'Missing required fields: location, interests (array), budget' });
    }

    const budgetLabels: Record<string, string> = {
      free: 'Free activities only',
      low: 'Low cost ($0-$50)',
      medium: 'Medium cost ($50-$150)',
      high: 'Higher cost ($150+)',
    };

    const userPrompt = `Suggest 6-8 inclusive, accessible activities for an NDIS participant with the following preferences:

**Location:** ${location}, Australia
**Willing to travel:** ${willingToDrive ? `Yes, up to ${maxDistance || 20}km` : 'No, local activities preferred'}
**Interests:** ${interests.join(', ')}
**Support needs:** ${supportNeeds || 'Not specified'}
**Budget range:** ${budgetLabels[budget] || budget}
**Group size preference:** ${groupSize || 'Any'}
${clientName ? `**Participant name:** ${clientName}` : ''}

For each activity, consider:
- Physical accessibility and sensory considerations
- Whether it could be NDIS-funded under capacity building or community participation
- Local venues or providers in the area
- How it matches the participant's interests and support needs

Respond with valid JSON as an array in this exact structure:
[
  {
    "name": "Activity Name",
    "description": "2-3 sentence description of the activity",
    "whySuitable": "Why this activity is great for the participant based on their interests and needs",
    "estimatedCost": "$X per session / Free / etc",
    "accessibilityNotes": "Accessibility features and considerations",
    "ndisFundingEligible": true,
    "suggestedVenues": ["Venue Name 1", "Venue Name 2"]
  }
]`;

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
        max_tokens: 4096,
        system: 'You are a creative NDIS activity coordinator in Australia. Suggest inclusive, accessible activities tailored to participants\' interests and support needs. Consider NDIS funding eligibility. Output valid JSON only.',
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
    let parsedActivities: any;
    try {
      parsedActivities = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsedActivities = JSON.parse(jsonMatch[1].trim());
        } catch {
          console.error('Failed to parse AI response as JSON:', rawText.substring(0, 500));
          return res.status(500).json({ error: 'Failed to parse AI response', rawText: rawText.substring(0, 1000) });
        }
      } else {
        console.error('Failed to parse AI response as JSON:', rawText.substring(0, 500));
        return res.status(500).json({ error: 'Failed to parse AI response', rawText: rawText.substring(0, 1000) });
      }
    }

    // Ensure it's an array
    const activities = Array.isArray(parsedActivities) ? parsedActivities : parsedActivities?.activities || [];

    // Log to ai_generation_log
    try {
      await supabase.from('ai_generation_log').insert({
        user_id: user.id,
        generation_type: 'activity_ideas',
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
      activities,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
