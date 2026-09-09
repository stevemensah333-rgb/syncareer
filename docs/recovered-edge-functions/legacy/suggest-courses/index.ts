import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user's skills and student details in parallel
    const [skillsResult, studentResult] = await Promise.all([
      supabase.from('user_skills').select('skill_name, category, proficiency').eq('user_id', user.id),
      supabase.from('student_details').select('major, degree_type, school').eq('user_id', user.id).maybeSingle(),
    ]);

    const skills = skillsResult.data || [];
    const student = studentResult.data;
    const major = student?.major || 'General Studies';

    if (skills.length === 0) {
      return new Response(
        JSON.stringify({ courses: [], message: 'Upload and analyze your CV first to get personalized course suggestions.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const skillsList = skills.map(s => `${s.skill_name} (${s.proficiency})`).join(', ');

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a career education advisor. Based on a student's current skills and major, suggest courses that will help fill skill gaps and advance their career. Focus on practical, available online courses from platforms like Coursera, edX, Udemy, LinkedIn Learning, etc.`
          },
          {
            role: "user",
            content: `Student major: ${major}\nDegree: ${student?.degree_type || 'Unknown'}\nSchool: ${student?.school || 'Unknown'}\nCurrent skills: ${skillsList}\n\nSuggest 5-8 courses that would help this student develop missing skills and advance in their field.`
          }
        ],
        tools: [{
          type: "function",
          function: {
            name: "suggest_courses",
            description: "Return structured course suggestions for the student.",
            parameters: {
              type: "object",
              properties: {
                courses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Course title" },
                      platform: { type: "string", description: "Platform name (Coursera, Udemy, etc.)" },
                      skill_addressed: { type: "string", description: "The skill gap this course fills" },
                      difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"], description: "Difficulty level" },
                      reason: { type: "string", description: "Brief reason why this course is recommended" },
                      estimated_hours: { type: "number", description: "Estimated hours to complete" },
                      url: { type: "string", description: "URL to the course if known, otherwise empty string" }
                    },
                    required: ["title", "platform", "skill_addressed", "difficulty", "reason", "estimated_hours"],
                    additionalProperties: false
                  }
                },
                summary: {
                  type: "string",
                  description: "A brief summary of the learning path recommendation"
                }
              },
              required: ["courses", "summary"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_courses" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall?.function?.arguments) {
      try {
        const structured = JSON.parse(toolCall.function.arguments);
        return new Response(
          JSON.stringify(structured),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (e) {
        console.error("Failed to parse tool call:", e);
      }
    }

    return new Response(
      JSON.stringify({ courses: [], summary: 'Unable to generate suggestions at this time.' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("suggest-courses error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
