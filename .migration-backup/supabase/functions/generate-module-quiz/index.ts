import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const LOVABLE_API_URL = "https://api.lovable.dev/v1/chat";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { pathTitle, moduleNumber, totalModules, major, skillName, difficulty } = await req.json();

    if (!pathTitle || !moduleNumber) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Strategy 1: Try to pull from structured question bank first
    // Use service role client to bypass RLS (question bank is restricted to admins only)
    if (skillName && major) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      const { data: bankQuestions, error: bankError } = await serviceClient
        .from('skill_question_bank')
        .select('question, options, correct_index, explanation, difficulty')
        .eq('career_path', major)
        .eq('skill_name', skillName);

      if (!bankError && bankQuestions && bankQuestions.length >= 3) {
        // Shuffle and pick 3-5 questions
        const shuffled = bankQuestions.sort(() => Math.random() - 0.5);
        const count = Math.min(shuffled.length, Math.random() > 0.5 ? 5 : 3);
        const selected = shuffled.slice(0, count).map(q => ({
          question: q.question,
          options: q.options as string[],
          correctIndex: q.correct_index,
          explanation: q.explanation,
        }));

        return new Response(JSON.stringify({ 
          questions: selected, 
          source: 'question_bank',
          skillName,
          difficulty: difficulty || 'foundational',
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Strategy 2: AI-generated questions as fallback (for unsupported career paths)
    const progressPercent = Math.round((moduleNumber / totalModules) * 100);
    let diffLevel = difficulty || "foundational";
    if (!difficulty) {
      if (progressPercent > 75) diffLevel = "advanced";
      else if (progressPercent > 50) diffLevel = "intermediate";
      else if (progressPercent > 25) diffLevel = "developing";
    }

    const skillContext = skillName ? ` focusing on the skill "${skillName}"` : '';
    const prompt = `Generate exactly 3 multiple-choice quiz questions for a student studying "${major || 'General Studies'}" who is on learning path "${pathTitle}", currently at module ${moduleNumber} of ${totalModules} (${diffLevel} level)${skillContext}.

Each question must:
- Be relevant to the path topic and difficulty level
- Have exactly 4 options labeled A, B, C, D
- Have exactly one correct answer
- Be practical and career-relevant

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0,
    "explanation": "Brief explanation of the correct answer"
  }
]`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch(LOVABLE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a career education quiz generator. Return ONLY valid JSON arrays, no markdown formatting." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI API error:", errText);
      return new Response(JSON.stringify({ error: "Failed to generate quiz" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";

    let jsonStr = content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    let questions;
    try {
      questions = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse quiz JSON:", jsonStr);
      return new Response(JSON.stringify({ error: "Failed to parse quiz questions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!Array.isArray(questions) || questions.length < 3) {
      return new Response(JSON.stringify({ error: "Invalid quiz format" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      questions: questions.slice(0, 5),
      source: 'ai_generated',
      skillName: skillName || null,
      difficulty: diffLevel,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
