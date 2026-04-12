const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { university, major } = await req.json()
    if (!university || !major) {
      return new Response(JSON.stringify({ error: 'university and major required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check cache
    const { data: cached } = await supabase
      .from('university_insights')
      .select('top_careers, graduate_outcomes')
      .eq('university_name', university)
      .eq('major', major)
      .maybeSingle()

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Generate via Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `You are a career guidance expert for Ghana. Generate career insights for ${major} students at ${university}.

Return a JSON object with:
1. "top_careers": array of 5 objects, each with "title" (career name), "match_percentage" (60-95), "description" (one sentence about why this career suits these graduates)
2. "graduate_outcomes": object with 4-5 key-value pairs showing what graduates typically do, e.g. {"Corporate Finance": "35%", "Consulting": "20%", "Entrepreneurship": "15%", "Further Studies": "20%", "Public Sector": "10%"}

Be realistic and specific to Ghana's job market. Consider the university's strengths and reputation.
Return ONLY valid JSON, no markdown.`

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    })

    if (!aiResponse.ok) {
      throw new Error(`AI request failed: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const content = aiData.choices?.[0]?.message?.content || ''
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    // Cache the result
    await supabase.from('university_insights').upsert({
      university_name: university,
      major: major,
      top_careers: parsed.top_careers || [],
      graduate_outcomes: parsed.graduate_outcomes || {},
    }, { onConflict: 'university_name,major' })

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
