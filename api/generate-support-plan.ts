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
    const { clientId, additionalContext, sectionType, existingSectionsContext } = req.body;

    if (!clientId) {
      return res.status(400).json({ error: 'Missing required field: clientId' });
    }

    // Fetch client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Fetch existing care plan with goals
    const { data: carePlan } = await supabase
      .from('care_plans')
      .select('*, care_plan_goals(*)')
      .eq('client_id', clientId)
      .maybeSingle();

    // Fetch support categories
    const { data: supportCategories } = await supabase
      .from('client_support_categories')
      .select('*')
      .eq('client_id', clientId);

    // Fetch recent session notes (last 10)
    const { data: sessionNotes } = await supabase
      .from('session_notes')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Calculate age from DOB
    const dob = client.date_of_birth;
    let age = '';
    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      const years = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      const adjustedAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
        ? years - 1
        : years;
      age = `${adjustedAge} years old`;
    }

    // Build existing goals summary
    const existingGoals = (carePlan?.care_plan_goals || []).map((g: any) => ({
      description: g.description,
      status: g.status,
      targetDate: g.target_date,
    }));

    // Build session notes summary
    const notesSummary = (sessionNotes || []).map((n: any) => ({
      date: n.created_at,
      content: n.content,
      mood: n.participant_mood,
      goalsAddressed: n.goals_addressed,
      followUpRequired: n.follow_up_required,
      followUpNotes: n.follow_up_notes,
    }));

    // Build categories/budget summary
    const categoriesSummary = (supportCategories || []).map((c: any) => ({
      categoryName: c.category_name,
      allocatedBudget: c.allocated_budget,
      spentAmount: c.spent_amount,
    }));

    // ── Section-specific generation ──
    if (sectionType) {
      const sectionTitles: Record<string, string> = {
        participant_details: 'Participant Details',
        plan_overview: 'Plan Overview',
        support_needs: 'Support Needs',
        goals_and_outcomes: 'Goals and Outcomes',
        risk_assessment: 'Risk Assessment',
        communication_plan: 'Communication Plan',
        daily_routine: 'Daily Routine',
        medication_management: 'Medication Management',
        behaviour_support: 'Behaviour Support',
        cultural_considerations: 'Cultural Considerations',
        emergency_contacts: 'Emergency Contacts',
        review_schedule: 'Review Schedule',
        custom: 'Custom Section',
      };

      const sectionTitle = sectionTitles[sectionType] || sectionType;

      const sectionPrompt = `Generate content for the "${sectionTitle}" section of an NDIS care plan.

**Participant:** ${client.first_name} ${client.last_name}
**Age:** ${age || 'Unknown'}
**NDIS Number:** ${client.ndis_number || 'N/A'}
**Funding Type:** ${client.funding_type || 'N/A'}
**Disability/Needs:** ${carePlan?.support_needs_summary || 'Not yet documented'}
**Medical Info:** ${carePlan?.medical_info || 'Not yet documented'}

${existingSectionsContext ? `**Context from other sections in this plan:**\n${existingSectionsContext}\n` : ''}
${additionalContext ? `**Additional context from staff:** ${additionalContext}` : ''}

Write professional, detailed content for ONLY the "${sectionTitle}" section. Be specific to this participant. Write in a professional but warm tone suitable for an NDIS care plan document. Output plain text only (no JSON, no markdown headers). The content should be 2-4 paragraphs.`;

      const sectionResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250514',
          max_tokens: 1024,
          system: 'You are an NDIS support plan specialist. Generate professional care plan section content. Be specific, practical, and aligned with NDIS guidelines. Output plain text only.',
          messages: [{ role: 'user', content: sectionPrompt }],
        }),
      });

      if (!sectionResponse.ok) {
        const errorBody = await sectionResponse.text();
        console.error('Anthropic API error:', sectionResponse.status, errorBody);
        return res.status(502).json({ error: 'AI service unavailable', details: `Status ${sectionResponse.status}` });
      }

      const sectionData = await sectionResponse.json();
      const sectionText = sectionData?.content?.[0]?.text || '';

      // Log
      try {
        await supabase.from('ai_generation_log').insert({
          user_id: user.id,
          client_id: clientId,
          generation_type: `section_${sectionType}`,
          model: 'claude-sonnet-4-5-20250514',
          input_tokens: sectionData?.usage?.input_tokens || null,
          output_tokens: sectionData?.usage?.output_tokens || null,
          created_at: new Date().toISOString(),
        });
      } catch (logError) {
        console.error('Failed to log AI generation:', logError);
      }

      return res.status(200).json({
        success: true,
        sectionContent: sectionText,
      });
    }

    // ── Full plan generation (legacy) ──

    // Build the user prompt
    const userPrompt = `Generate a structured NDIS support plan for the following participant:

**Participant:** ${client.first_name} ${client.last_name}
**Age:** ${age || 'Unknown'}
**NDIS Number:** ${client.ndis_number || 'N/A'}
**Funding Type:** ${client.funding_type || 'N/A'}

**Existing Support Needs Summary:** ${carePlan?.support_needs_summary || 'Not yet documented'}

**Medical Information:** ${carePlan?.medical_info || 'Not yet documented'}

**Communication Needs:** ${carePlan?.communication_needs || 'Not yet documented'}

**Likes and Preferences:** ${carePlan?.likes_and_preferences || 'Not yet documented'}

**Risk Notes:** ${carePlan?.risk_notes || 'Not yet documented'}

**Preferred Routines:** ${carePlan?.preferred_routines || 'Not yet documented'}

**Existing Goals and Status:**
${existingGoals.length > 0
  ? existingGoals.map((g: any) => `- ${g.description} (Status: ${g.status}, Target: ${g.targetDate || 'N/A'})`).join('\n')
  : 'No existing goals'}

**Support Categories and Budget:**
${categoriesSummary.length > 0
  ? categoriesSummary.map((c: any) => `- ${c.categoryName}: $${c.allocatedBudget} allocated, $${c.spentAmount} spent`).join('\n')
  : 'No categories assigned'}

**Recent Session Notes (most recent first):**
${notesSummary.length > 0
  ? notesSummary.map((n: any) => `- [${n.date}] Mood: ${n.mood}. ${n.content}${n.followUpRequired ? ` (Follow-up needed: ${n.followUpNotes})` : ''}`).join('\n')
  : 'No session notes recorded'}

${additionalContext ? `**Additional Context from Staff:** ${additionalContext}` : ''}

Based on all the above information, generate a comprehensive support plan. Respond with valid JSON in this exact structure:
{
  "supportNeedsSummary": "A comprehensive summary of the participant's support needs",
  "goals": [
    {
      "description": "Specific, measurable goal description",
      "targetDate": "YYYY-MM-DD format, approximately 3-12 months from now",
      "rationale": "Why this goal is important and how it aligns with the participant's needs"
    }
  ],
  "preferredRoutines": "Description of preferred daily/weekly routines and structure",
  "riskNotes": "Risk assessment notes and mitigation strategies",
  "communicationStrategies": "Specific communication strategies and approaches"
}

Generate 3-6 goals that are SMART (Specific, Measurable, Achievable, Relevant, Time-bound). Consider the participant's existing progress, preferences, and NDIS plan categories.`;

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
        system: 'You are an NDIS support plan specialist. Generate structured support plans based on participant data. Be specific, practical, and aligned with NDIS guidelines. Output valid JSON only.',
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

    // Parse JSON from the response (handle potential markdown code blocks)
    let parsedPlan: any;
    try {
      // Try direct parse first
      parsedPlan = JSON.parse(rawText);
    } catch {
      // Try extracting JSON from markdown code block
      const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          parsedPlan = JSON.parse(jsonMatch[1].trim());
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
        client_id: clientId,
        generation_type: 'support_plan',
        model: 'claude-sonnet-4-5-20250514',
        input_tokens: anthropicData?.usage?.input_tokens || null,
        output_tokens: anthropicData?.usage?.output_tokens || null,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      // Don't fail the request if logging fails
      console.error('Failed to log AI generation:', logError);
    }

    return res.status(200).json({
      success: true,
      plan: parsedPlan,
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
