import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_CV_CONTENT_LENGTH = 50000;
const MAX_PORTFOLIO_CONTENT_LENGTH = 50000;
const MAX_FILENAME_LENGTH = 255;

interface PortfolioRequest {
  cvContent?: string;
  fileBase64?: string;
  fileMimeType?: string;
  portfolioContent?: string;
  fileName: string;
}

function validatePortfolioRequest(body: unknown): { valid: boolean; error?: string; data?: PortfolioRequest } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const request = body as Record<string, unknown>;

  if (typeof request.fileName !== "string" || request.fileName.length === 0) {
    return { valid: false, error: "fileName is required and must be a non-empty string" };
  }
  if (request.fileName.length > MAX_FILENAME_LENGTH) {
    return { valid: false, error: `fileName exceeds maximum length of ${MAX_FILENAME_LENGTH} characters` };
  }

  if (request.cvContent !== undefined) {
    if (typeof request.cvContent !== "string") return { valid: false, error: "cvContent must be a string" };
    if (request.cvContent.length > MAX_CV_CONTENT_LENGTH) return { valid: false, error: `cvContent exceeds ${MAX_CV_CONTENT_LENGTH} characters` };
  }

  if (request.fileBase64 !== undefined) {
    if (typeof request.fileBase64 !== "string") return { valid: false, error: "fileBase64 must be a string" };
    if (typeof request.fileMimeType !== "string") return { valid: false, error: "fileMimeType is required with fileBase64" };
  }

  if (request.portfolioContent !== undefined) {
    if (typeof request.portfolioContent !== "string") return { valid: false, error: "portfolioContent must be a string" };
    if (request.portfolioContent.length > MAX_PORTFOLIO_CONTENT_LENGTH) return { valid: false, error: `portfolioContent exceeds ${MAX_PORTFOLIO_CONTENT_LENGTH} characters` };
  }

  if (!request.cvContent && !request.portfolioContent && !request.fileBase64) {
    return { valid: false, error: "At least one of cvContent, fileBase64, or portfolioContent must be provided" };
  }

  return {
    valid: true,
    data: {
      cvContent: request.cvContent as string | undefined,
      fileBase64: request.fileBase64 as string | undefined,
      fileMimeType: request.fileMimeType as string | undefined,
      portfolioContent: request.portfolioContent as string | undefined,
      fileName: request.fileName as string,
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid authorization header' }),
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
      console.error('JWT verification failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = validatePortfolioRequest(requestBody);
    if (!validation.valid) {
      console.warn('Input validation failed:', validation.error);
      return new Response(
        JSON.stringify({ error: validation.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { cvContent, fileBase64, fileMimeType, portfolioContent, fileName } = validation.data!;
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert career advisor and portfolio reviewer. Analyze the provided CV and portfolio content thoroughly.

Your analysis must cover:
1. **Strengths**: Key strengths and standout skills
2. **Areas for Improvement**: Specific areas that need work
3. **Skills Gap Analysis**: Missing skills that are in demand
4. **Project Quality**: Assessment of portfolio projects
5. **Market Fit**: How well the profile fits the candidate's target job market
6. **Actionable Recommendations**: Specific steps to improve

When analysing a CV, ALWAYS extract structured personal info, education, and experience entries into the dedicated fields (extractedPersonal, extractedEducation, extractedExperience) so the data can be used to pre-fill a CV builder. Only populate fields you are confident are present in the document — leave unknown values as empty strings/arrays.

Be constructive, specific, and practical in your advice.`;

    // Build user message parts - supports both text and binary document input
    const userMessageParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    if (fileBase64 && fileMimeType) {
      // For binary files (PDF/DOCX), send as inline document for AI extraction
      userMessageParts.push({
        type: "text",
        text: `Please extract all text from the attached document and analyze this career profile.\n\n${portfolioContent ? `**Portfolio/Projects:**\n${portfolioContent}\n\n` : ''}File: ${fileName}`
      });
      userMessageParts.push({
        type: "image_url",
        image_url: {
          url: `data:${fileMimeType};base64,${fileBase64}`
        }
      });
    } else {
      // For text content
      userMessageParts.push({
        type: "text",
        text: `Please analyze this career profile:\n\n${cvContent ? `**CV/Resume:**\n${cvContent}\n\n` : ''}${portfolioContent ? `**Portfolio/Projects:**\n${portfolioContent}` : ''}\n\nFile: ${fileName}`
      });
    }

    // Use tool calling for structured skill extraction
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessageParts },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "analyze_portfolio",
              description: "Return a structured analysis of the CV/portfolio including extracted skills, experience summary, scores, and detailed analysis text.",
              parameters: {
                type: "object",
                properties: {
                  analysis: {
                    type: "string",
                    description: "The full detailed analysis text in markdown format, covering strengths, weaknesses, recommendations, market fit, etc."
                  },
                  extractedSkills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string", description: "Skill name" },
                        category: { type: "string", enum: ["technical", "soft", "domain", "tool"], description: "Skill category" },
                        proficiency: { type: "string", enum: ["beginner", "intermediate", "advanced", "expert"], description: "Estimated proficiency level" }
                      },
                      required: ["name", "category", "proficiency"],
                      additionalProperties: false
                    },
                    description: "All skills extracted from the CV/portfolio"
                  },
                  experienceSummary: {
                    type: "object",
                    properties: {
                      totalYears: { type: "number", description: "Estimated total years of experience" },
                      industries: { type: "array", items: { type: "string" }, description: "Industries the candidate has experience in" },
                      educationLevel: { type: "string", description: "Highest education level detected" },
                      keyAchievements: { type: "array", items: { type: "string" }, description: "Top 3-5 notable achievements" }
                    },
                    required: ["totalYears", "industries", "educationLevel", "keyAchievements"],
                    additionalProperties: false
                  },
                  scores: {
                    type: "object",
                    properties: {
                      overall: { type: "number", description: "Overall CV quality score 0-100" },
                      formatting: { type: "number", description: "Formatting and presentation score 0-100" },
                      content: { type: "number", description: "Content depth and quality score 0-100" },
                      relevance: { type: "number", description: "Market relevance score 0-100" },
                      impact: { type: "number", description: "Achievement impact score 0-100" }
                    },
                    required: ["overall", "formatting", "content", "relevance", "impact"],
                    additionalProperties: false
                  },
                  suggestedRoles: {
                    type: "array",
                    items: { type: "string" },
                    description: "Top 3-5 job roles this candidate is suited for"
                  },
                  missingSkills: {
                    type: "array",
                    items: { type: "string" },
                    description: "Key skills the candidate should develop to improve employability"
                  },
                  extractedPersonal: {
                    type: "object",
                    properties: {
                      firstName: { type: "string" },
                      lastName: { type: "string" },
                      email: { type: "string" },
                      phone: { type: "string" },
                      linkedIn: { type: "string" },
                      nationality: { type: "string" }
                    },
                    required: ["firstName", "lastName", "email", "phone", "linkedIn", "nationality"],
                    additionalProperties: false,
                    description: "Personal info extracted from the CV. Use empty string for unknown values."
                  },
                  extractedEducation: {
                    type: "object",
                    properties: {
                      university: { type: "string" },
                      degree: { type: "string" },
                      location: { type: "string" },
                      graduationDate: { type: "string" },
                      gpa: { type: "string" }
                    },
                    required: ["university", "degree", "location", "graduationDate", "gpa"],
                    additionalProperties: false,
                    description: "Most recent / highest education entry. Use empty string for unknown values."
                  },
                  extractedExperience: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        company: { type: "string" },
                        role: { type: "string" },
                        location: { type: "string" },
                        date: { type: "string" },
                        bullets: { type: "array", items: { type: "string" } }
                      },
                      required: ["company", "role", "location", "date", "bullets"],
                      additionalProperties: false
                    },
                    description: "Work experience entries extracted from the CV."
                  }
                },
                required: ["analysis", "extractedSkills", "experienceSummary", "scores", "suggestedRoles", "missingSkills", "extractedPersonal", "extractedEducation", "extractedExperience"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "analyze_portfolio" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract structured data from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      try {
        const structured = JSON.parse(toolCall.function.arguments);
        console.log(`[analyze-portfolio] Structured extraction: ${structured.extractedSkills?.length || 0} skills, score: ${structured.scores?.overall || 'N/A'}`);
        
        return new Response(
          JSON.stringify({
            analysis: structured.analysis || '',
            extractedSkills: structured.extractedSkills || [],
            experienceSummary: structured.experienceSummary || null,
            scores: structured.scores || null,
            suggestedRoles: structured.suggestedRoles || [],
            missingSkills: structured.missingSkills || [],
            extractedPersonal: structured.extractedPersonal || null,
            extractedEducation: structured.extractedEducation || null,
            extractedExperience: structured.extractedExperience || [],
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        console.error("[analyze-portfolio] Failed to parse tool call arguments:", parseError);
      }
    }

    // Fallback: extract content from regular message if tool calling didn't work
    const fallbackContent = data.choices?.[0]?.message?.content || '';
    console.warn("[analyze-portfolio] Tool calling failed, falling back to text analysis");
    
    return new Response(
      JSON.stringify({
        analysis: fallbackContent,
        extractedSkills: [],
        experienceSummary: null,
        scores: null,
        suggestedRoles: [],
        missingSkills: [],
        extractedPersonal: null,
        extractedEducation: null,
        extractedExperience: [],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-portfolio function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
