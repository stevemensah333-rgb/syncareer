import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Type Definitions ──────────────────────────────────────────────

interface InterviewRequest {
  action: 'start' | 'answer' | 'feedback';
  interviewId?: string;
  jobRole?: string;
  industry?: string;
  difficulty?: string;
  interviewType?: string;
  resumeText?: string;
  jobDescription?: string;
  questionIndex?: number;
  answer?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  sessionLength?: 'standard' | 'extended' | 'quick';
}

interface AIResponse {
  choices: Array<{ message: { content: string } }>;
}

interface QuestionMeta {
  question: string;
  type: string;
  category: string;
  round: number;
  isFollowUp: boolean;
}

// ─── Interview Round Structure ─────────────────────────────────────

const SESSION_LENGTHS = {
  quick: { total: 8, rounds: { intro: 1, technical: 3, behavioral: 2, situational: 1, closing: 1 } },
  standard: { total: 15, rounds: { intro: 2, technical: 5, behavioral: 4, situational: 3, closing: 1 } },
  extended: { total: 20, rounds: { intro: 2, technical: 7, behavioral: 5, situational: 4, closing: 2 } },
};

function getRoundForQuestion(questionNum: number, sessionLength: keyof typeof SESSION_LENGTHS): { round: string; roundNum: number } {
  const config = SESSION_LENGTHS[sessionLength];
  const r = config.rounds;
  let cumulative = 0;

  const rounds = [
    { name: 'intro', count: r.intro },
    { name: 'technical', count: r.technical },
    { name: 'behavioral', count: r.behavioral },
    { name: 'situational', count: r.situational },
    { name: 'closing', count: r.closing },
  ];

  for (let i = 0; i < rounds.length; i++) {
    cumulative += rounds[i].count;
    if (questionNum <= cumulative) {
      return { round: rounds[i].name, roundNum: i + 1 };
    }
  }
  return { round: 'closing', roundNum: 5 };
}

// ─── Prompts ───────────────────────────────────────────────────────

const getSystemPrompt = (role: string, level: string, type: string, resumeText: string, jobDescription: string, sessionConfig: typeof SESSION_LENGTHS['standard']) => `
You are SynAssist, a senior professional interviewer on the Syncareer platform conducting a thorough, realistic mock interview.

Your goal is to simulate a real multi-round interview. You must be honest, specific, and constructive.
Do NOT be overly encouraging or give generic praise. Push the candidate to demonstrate real competency.

SCOPE ENFORCEMENT — CRITICAL:
You are strictly an interview simulator. You only ask interview questions, evaluate answers, and provide interview-related feedback.
If the candidate says anything that is not an answer to an interview question (e.g., asks you to do homework, write code for them, discuss unrelated topics, or anything outside the interview context), respond with:
"I'm SynAssist, your interview coach. I'm here to conduct your mock interview for the ${role} role. Let's stay focused — [re-ask the current question or move to the next one]."
Never break character as an interviewer. Never introduce yourself as the candidate.

INTERVIEW CONTEXT:
- Target role: ${role}
- Seniority level: ${level}
- Interview type: ${type}
- Total questions planned: ${sessionConfig.total}
${resumeText ? `- Resume content: ${resumeText}` : ''}
${jobDescription ? `- Job description: ${jobDescription}` : ''}

INTERVIEW STRUCTURE (${sessionConfig.total} questions total):
Round 1 - INTRODUCTION (${sessionConfig.rounds.intro} questions):
  - Warm-up: "Tell me about yourself", motivation for role, career goals
  - Gauge communication style and self-awareness

Round 2 - TECHNICAL / HARD SKILLS (${sessionConfig.rounds.technical} questions):
  - Role-specific knowledge (coding, domain expertise, tools)
  - Problem-solving with real scenarios
  - Progressively harder based on performance
  - Ask follow-up probes when answers lack depth

Round 3 - BEHAVIORAL / SOFT SKILLS (${sessionConfig.rounds.behavioral} questions):
  - STAR-method questions: teamwork, conflict, leadership, failure
  - Test self-awareness, emotional intelligence, communication
  - Probe for specifics when answers are vague

Round 4 - SITUATIONAL / SCENARIO-BASED (${sessionConfig.rounds.situational} questions):
  - "What would you do if..." scenarios relevant to the role
  - Test judgment, prioritization, ethical reasoning
  - Present realistic workplace dilemmas

Round 5 - CLOSING (${sessionConfig.rounds.closing} questions):
  - "Do you have questions for us?" or "Why should we hire you?"
  - Assess genuine interest and preparation

CRITICAL RULES:
1. Ask ONE question at a time. Never bundle multiple questions.
2. ADAPT difficulty based on previous answers:
   - Strong answers → increase complexity, ask deeper follow-ups
   - Weak answers → probe understanding, offer chance to elaborate before moving on
3. Ask follow-up probes when answers are vague, surface-level, or missing the STAR structure.
4. If a candidate claims experience with a skill, TEST that skill in depth.
5. Keep conversational tone professional but approachable.
6. Never reveal scoring criteria unless feedback is requested.
7. Transition between rounds naturally (e.g., "Let's move on to some technical questions...").
8. For technical roles: include at least one problem-solving or design question.
9. For non-technical roles: include at least one case study or analytical question.

You are testing for: technical competence, communication clarity, problem-solving ability,
self-awareness, cultural fit, and genuine interest in the role.
`;

const getNextQuestionPrompt = (
  round: string,
  questionNum: number,
  totalQuestions: number,
  runningAvgScore: number,
  lastVerdict: string,
  wasFollowUp: boolean
) => {
  const difficultyGuidance = runningAvgScore >= 7
    ? "The candidate is performing well. INCREASE difficulty. Ask deeper, more nuanced questions that test edge-case thinking."
    : runningAvgScore >= 4
    ? "The candidate is performing at an average level. Maintain current difficulty but probe for more specifics."
    : "The candidate is struggling. Keep the current difficulty but phrase questions more clearly. Give them a fair chance to demonstrate knowledge.";

  const followUpGuidance = lastVerdict === 'Weak' && !wasFollowUp
    ? "The last answer was weak. Before moving on, ask ONE targeted follow-up to give the candidate a chance to elaborate or demonstrate understanding. Frame it as: 'Could you tell me more about...' or 'Can you walk me through...'"
    : "";

  return `You are now on question ${questionNum} of ${totalQuestions}.
Current round: ${round.toUpperCase()}
${followUpGuidance}

DIFFICULTY ADAPTATION:
${difficultyGuidance}

Ask your next question. Remember:
- ONE question only
- Must be a ${round} question appropriate for the current round
- ${round === 'technical' ? 'Focus on role-specific skills, problem-solving, or domain knowledge' : ''}
- ${round === 'behavioral' ? 'Use STAR-encouraging prompts about past experiences' : ''}
- ${round === 'situational' ? 'Present a realistic workplace scenario and ask how they would handle it' : ''}
- ${round === 'closing' ? 'Ask a reflective question or invite the candidate to ask questions' : ''}
- ${round === 'intro' ? 'Keep it warm but evaluative - assess communication and motivation' : ''}

${questionNum > 1 ? 'Transition naturally from the previous topic.' : ''}`;
};

const getFeedbackPrompt = (question: string, answer: string, category: string, round: string) => `
The candidate answered a ${category} question in the ${round} round:

Question: "${question}"
Candidate's Answer: "${answer}"

Evaluate thoroughly. Return JSON with this exact structure:
{
  "verdict": "Strong" | "Average" | "Weak",
  "score": <number 1-10>,
  "feedback": "<2-3 sentences of specific, actionable feedback. Reference what was good AND what was missing.>",
  "improvedAnswer": "<A concise, interview-ready example answer that demonstrates best practices for this type of question.>",
  "tip": "<One specific, actionable tip the candidate can practice immediately>",
  "skillsAssessed": ["<skill1>", "<skill2>"],
  "followUpRecommended": <boolean - true if the answer was weak/vague and deserves a follow-up probe>
}

Evaluation criteria by category:
${category === 'technical' ? '- Accuracy of technical knowledge\n- Problem-solving approach\n- Depth of understanding\n- Practical application ability' : ''}
${category === 'behavioral' ? '- STAR method usage (Situation, Task, Action, Result)\n- Specificity of examples\n- Self-awareness and growth mindset\n- Impact and outcomes mentioned' : ''}
${category === 'situational' ? '- Practicality of proposed solution\n- Consideration of stakeholders\n- Decision-making reasoning\n- Risk awareness' : ''}
${category === 'intro' ? '- Clarity and conciseness\n- Relevance to role\n- Enthusiasm and motivation\n- Professional presentation' : ''}
${category === 'closing' ? '- Thoughtfulness of questions asked\n- Genuine interest demonstrated\n- Preparation evident\n- Professional closing' : ''}

Be honest and constructive. Do not inflate scores.
`;

const getOverallFeedbackPrompt = (role: string, level: string, answers: any[]) => {
  const categories = { intro: [] as any[], technical: [] as any[], behavioral: [] as any[], situational: [] as any[], closing: [] as any[] };

  answers.forEach(a => {
    const cat = a.category || 'technical';
    if (categories[cat as keyof typeof categories]) {
      categories[cat as keyof typeof categories].push(a);
    }
  });

  const categoryBreakdown = Object.entries(categories)
    .filter(([_, items]) => items.length > 0)
    .map(([cat, items]) => {
      const avgScore = items.reduce((sum: number, a: any) => sum + (a.score || 0), 0) / items.length;
      return `${cat.toUpperCase()}: ${items.length} questions, avg score ${avgScore.toFixed(1)}/10`;
    })
    .join('\n');

  return `
The mock interview for ${role} (${level} level) has concluded.

CATEGORY BREAKDOWN:
${categoryBreakdown}

DETAILED PERFORMANCE:
${answers.map((a, i) => `
Q${i + 1} [${(a.category || 'general').toUpperCase()}${a.isFollowUp ? ' - FOLLOW-UP' : ''}]:
Question: ${a.question}
Answer: ${a.answer}
Score: ${a.score}/10 | Verdict: ${a.verdict}
Skills: ${(a.skillsAssessed || []).join(', ')}
`).join('\n')}

Provide a comprehensive end-of-interview assessment as JSON:
{
  "overallScore": <number 0-100>,
  "overallVerdict": "Not Ready" | "Needs Work" | "Promising" | "Strong" | "Exceptional",
  "assessment": "<3-4 sentence overall performance assessment. Be specific about what stood out, both positive and negative.>",
  "strengths": ["<strength 1 with specific example>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1 with specific example>", "<weakness 2>", "<weakness 3>"],
  "categoryScores": {
    "technical": <number 0-100 or null if no technical questions>,
    "behavioral": <number 0-100 or null>,
    "situational": <number 0-100 or null>,
    "communication": <number 0-100>,
    "overall_impression": <number 0-100>
  },
  "priorities": ["<priority 1: most impactful thing to improve>", "<priority 2>", "<priority 3>"],
  "readiness": "Not Ready" | "Needs Practice" | "Almost Ready" | "Ready",
  "nextSteps": ["<actionable step 1>", "<actionable step 2>", "<actionable step 3>"],
  "interviewerNote": "<1-2 sentence note as if from a real interviewer to their hiring manager about this candidate>"
}

Be honest and specific. This assessment directly impacts how the candidate prepares.
`;
};

// ─── Utility Functions ─────────────────────────────────────────────

function safeJsonParse(content: string, fallback: any): any {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("[mock-interview] JSON parse error:", e);
  }
  return fallback;
}

async function callAI(messages: Array<{ role: string; content: string }>, apiKey: string): Promise<string> {
  const startTime = Date.now();
  console.log(`[mock-interview] Calling AI with ${messages.length} messages`);

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
    }),
  });

  const elapsed = Date.now() - startTime;
  console.log(`[mock-interview] AI response: ${response.status} in ${elapsed}ms`);

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      throw { status: 429, message: "Rate limit exceeded. Please wait before trying again." };
    }
    if (status === 402) {
      throw { status: 402, message: "Service quota exceeded." };
    }
    const errText = await response.text().catch(() => 'Unknown error');
    console.error(`[mock-interview] AI error: ${status} - ${errText}`);
    throw { status: 500, message: "AI service temporarily unavailable." };
  }

  const data: AIResponse = await response.json();
  return data.choices[0]?.message?.content || '';
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function successResponse(data: any) {
  return new Response(
    JSON.stringify(data),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function computeRunningAvg(answers: any[]): number {
  if (answers.length === 0) return 5;
  const total = answers.reduce((sum, a) => sum + (a.score || 5), 0);
  return total / answers.length;
}

// ─── Main Handler ──────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();
  console.log(`[mock-interview][${requestId}] Request received`);

  try {
    // ── Auth ──
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      console.warn(`[mock-interview][${requestId}] Missing auth header`);
      return errorResponse('Missing authorization header', 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.warn(`[mock-interview][${requestId}] Invalid token`);
      return errorResponse('Invalid token', 401);
    }

    const userId = claimsData.claims.sub;
    console.log(`[mock-interview][${requestId}] User: ${userId}`);

    // ── Parse Body ──
    let body: InterviewRequest;
    try {
      body = await req.json();
    } catch {
      return errorResponse('Invalid request body', 400);
    }

    if (!body.action || !['start', 'answer', 'feedback'].includes(body.action)) {
      return errorResponse('Invalid action. Must be: start, answer, or feedback', 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error(`[mock-interview][${requestId}] LOVABLE_API_KEY not configured`);
      return errorResponse('AI service not configured', 500);
    }

    // ── Server-side feature gate ──────────────────────────────────
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    let isPremiumUser = false;
    if (subscription?.tier === 'premium' && subscription?.status === 'active') {
      isPremiumUser = !subscription.current_period_end || new Date(subscription.current_period_end) > new Date();
    }

    // Gate 'start' action: check monthly mock_interview usage
    if (body.action === 'start') {
      if (!isPremiumUser) {
        const now = new Date();
        const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const { data: usageRow } = await supabase
          .from('usage_logs')
          .select('usage_count')
          .eq('user_id', userId)
          .eq('feature_key', 'mock_interview')
          .eq('month', month)
          .maybeSingle();

        const used = usageRow?.usage_count ?? 0;
        if (used >= 3) {
          return new Response(
            JSON.stringify({
              error: 'limit_reached',
              message: 'You have used all 3 mock interview sessions for this month. Upgrade to Premium for unlimited interviews.',
              used,
              limit: 3,
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Block advanced modes for free users
        if (body.interviewType === 'voice') {
          return new Response(
            JSON.stringify({
              error: 'premium_required',
              message: 'Voice interview mode is a Premium feature. Upgrade to unlock advanced interview modes.',
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Increment usage
        const { data: existingLog } = await serviceSupabase
          .from('usage_logs')
          .select('id, usage_count')
          .eq('user_id', userId)
          .eq('feature_key', 'mock_interview')
          .eq('month', month)
          .maybeSingle();

        if (existingLog) {
          await serviceSupabase
            .from('usage_logs')
            .update({ usage_count: existingLog.usage_count + 1, updated_at: new Date().toISOString() })
            .eq('id', existingLog.id);
        } else {
          await serviceSupabase
            .from('usage_logs')
            .insert({ user_id: userId, feature_key: 'mock_interview', month, usage_count: 1 });
        }
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: START
    // ══════════════════════════════════════════════════════════════
    if (body.action === 'start') {
      if (!body.jobRole?.trim()) {
        return errorResponse('jobRole is required', 400);
      }

      const role = body.jobRole;
      const level = body.difficulty === 'beginner' ? 'entry-level/internship' :
                    body.difficulty === 'advanced' ? 'senior level' : 'mid-level (2-5 years)';
      const type = body.interviewType || 'mixed';
      const sessionLength = (body.sessionLength || 'standard') as keyof typeof SESSION_LENGTHS;
      const sessionConfig = SESSION_LENGTHS[sessionLength] || SESSION_LENGTHS.standard;
      const resumeText = (body.resumeText || '').slice(0, 3000);
      const jobDescription = (body.jobDescription || '').slice(0, 3000);

      console.log(`[mock-interview][${requestId}] Starting interview: role=${role}, level=${level}, type=${type}, length=${sessionLength} (${sessionConfig.total}Q)`);

      const systemPrompt = getSystemPrompt(role, level, type, resumeText, jobDescription, sessionConfig);

      const firstQuestion = await callAI([
        { role: "system", content: systemPrompt },
        { role: "user", content: `Begin the interview. Introduce yourself as "SynAssist, your AI interview partner" (always use this exact name, never use any other name or the candidate's name). Welcome the candidate, then ask your first INTRODUCTORY question. This is question 1 of ${sessionConfig.total}. Keep the intro warm but professional. ONE question only.` }
      ], LOVABLE_API_KEY);

      if (!firstQuestion) {
        return errorResponse('Failed to generate interview question', 500);
      }

      const questionMeta: QuestionMeta = {
        question: firstQuestion,
        type,
        category: 'intro',
        round: 1,
        isFollowUp: false,
      };

      const { data: interview, error: insertError } = await supabase
        .from('mock_interviews')
        .insert({
          user_id: userId,
          job_role: body.jobRole,
          industry: body.industry || null,
          difficulty: body.difficulty || 'intermediate',
          questions: [questionMeta],
          answers: [],
          status: 'in_progress'
        })
        .select()
        .single();

      if (insertError) {
        console.error(`[mock-interview][${requestId}] Insert error:`, insertError);
        return errorResponse('Failed to create interview record', 500);
      }

      console.log(`[mock-interview][${requestId}] Interview created: ${interview.id} in ${Date.now() - startTime}ms`);

      return successResponse({
        interview,
        currentQuestion: firstQuestion,
        questionNumber: 1,
        totalQuestions: sessionConfig.total,
        category: 'intro',
        round: 1,
        roundName: 'Introduction',
        sessionLength,
      });
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: ANSWER
    // ══════════════════════════════════════════════════════════════
    if (body.action === 'answer') {
      if (!body.interviewId) {
        return errorResponse('interviewId is required', 400);
      }
      if (!body.answer?.trim()) {
        return errorResponse('answer is required', 400);
      }

      const { data: interview, error: fetchErr } = await supabase
        .from('mock_interviews')
        .select('*')
        .eq('id', body.interviewId)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !interview) {
        console.warn(`[mock-interview][${requestId}] Interview not found: ${body.interviewId}`);
        return errorResponse('Interview not found', 404);
      }

      const questions = (interview.questions as any[]) || [];
      const currentQuestionMeta = questions[questions.length - 1] || {};
      const currentQuestion = currentQuestionMeta.question || '';
      const currentCategory = currentQuestionMeta.category || 'technical';
      const currentRound = currentQuestionMeta.round || 1;
      const isFollowUp = currentQuestionMeta.isFollowUp || false;

      const role = interview.job_role;
      const level = interview.difficulty === 'beginner' ? 'entry-level/internship' :
                    interview.difficulty === 'advanced' ? 'senior level' : 'mid-level (2-5 years)';
      const type = body.interviewType || 'mixed';

      // Determine session config from question count pattern
      const sessionLength = (body.sessionLength ||
        (questions.length <= 8 ? 'quick' : questions.length <= 15 ? 'standard' : 'extended')) as keyof typeof SESSION_LENGTHS;
      const sessionConfig = SESSION_LENGTHS[sessionLength] || SESSION_LENGTHS.standard;

      console.log(`[mock-interview][${requestId}] Processing answer for Q${questions.length} [${currentCategory}]`);

      // Get detailed feedback
      let feedback = {
        verdict: "Average" as string,
        score: 5,
        feedback: "Good attempt.",
        improvedAnswer: "",
        tip: "",
        skillsAssessed: [] as string[],
        followUpRecommended: false,
      };

      try {
        const feedbackContent = await callAI([
          { role: "system", content: "You are an expert interview coach evaluating candidate responses. Be honest, specific, and constructive. Your feedback directly impacts candidate preparation." },
          { role: "user", content: getFeedbackPrompt(currentQuestion, body.answer, currentCategory, currentCategory) }
        ], LOVABLE_API_KEY);

        const parsed = safeJsonParse(feedbackContent, feedback);
        feedback = { ...feedback, ...parsed };
        feedback.skillsAssessed = Array.isArray(feedback.skillsAssessed) ? feedback.skillsAssessed : [];
      } catch (e) {
        console.warn(`[mock-interview][${requestId}] Feedback generation failed, using defaults:`, e);
      }

      // Update answers
      const answers = (interview.answers as any[]) || [];
      answers.push({
        question: currentQuestion,
        answer: body.answer,
        feedback: feedback.feedback,
        score: feedback.score,
        verdict: feedback.verdict,
        improvedAnswer: feedback.improvedAnswer,
        tip: feedback.tip,
        category: currentCategory,
        round: currentRound,
        isFollowUp,
        skillsAssessed: feedback.skillsAssessed,
      });

      const runningAvg = computeRunningAvg(answers);

      // Determine if we need a follow-up or next question
      const shouldFollowUp = feedback.followUpRecommended && feedback.verdict === 'Weak' && !isFollowUp;
      const effectiveQuestionCount = questions.filter((q: any) => !q.isFollowUp).length;
      const isLastQuestion = !shouldFollowUp && effectiveQuestionCount >= sessionConfig.total;

      if (!isLastQuestion) {
        // Determine next round
        const nextQuestionNum = shouldFollowUp ? effectiveQuestionCount : effectiveQuestionCount + 1;
        const { round: nextRound } = getRoundForQuestion(nextQuestionNum, sessionLength);

        let nextQuestion = "Tell me about a challenging project you worked on.";
        let nextCategory = shouldFollowUp ? currentCategory : nextRound;

        try {
          const conversationHistory = (body.conversationHistory || []).slice(-12);
          const systemPrompt = getSystemPrompt(role, level, type, '', '', sessionConfig);

          const questionPrompt = shouldFollowUp
            ? `The candidate just gave a weak answer to: "${currentQuestion}". Ask ONE targeted follow-up probe to give them a chance to elaborate. Don't repeat the original question — instead dig deeper into the specific area they struggled with. Be encouraging but probing.`
            : getNextQuestionPrompt(nextRound, nextQuestionNum, sessionConfig.total, runningAvg, feedback.verdict, isFollowUp);

          const nextContent = await callAI([
            { role: "system", content: systemPrompt },
            ...conversationHistory.map(h => ({ role: h.role === 'assistant' ? 'assistant' as const : 'user' as const, content: h.content })),
            { role: "user", content: body.answer },
            { role: "user", content: questionPrompt }
          ], LOVABLE_API_KEY);

          if (nextContent) nextQuestion = nextContent;
        } catch (e) {
          console.warn(`[mock-interview][${requestId}] Next question generation failed, using fallback:`, e);
        }

        const nextMeta: QuestionMeta = {
          question: nextQuestion,
          type,
          category: nextCategory,
          round: shouldFollowUp ? currentRound : nextQuestionNum,
          isFollowUp: shouldFollowUp,
        };

        questions.push(nextMeta);

        const { error: updateErr } = await supabase
          .from('mock_interviews')
          .update({ questions, answers })
          .eq('id', body.interviewId);

        if (updateErr) {
          console.error(`[mock-interview][${requestId}] Update error:`, updateErr);
        }

        const roundNames: Record<string, string> = {
          intro: 'Introduction',
          technical: 'Technical Skills',
          behavioral: 'Behavioral',
          situational: 'Scenario-Based',
          closing: 'Closing',
        };

        console.log(`[mock-interview][${requestId}] Answer processed → Q${questions.length} [${nextCategory}${shouldFollowUp ? ' follow-up' : ''}] avg=${runningAvg.toFixed(1)} in ${Date.now() - startTime}ms`);

        return successResponse({
          feedback,
          nextQuestion,
          questionNumber: questions.length,
          totalQuestions: sessionConfig.total + questions.filter((q: any) => q.isFollowUp).length,
          category: nextCategory,
          roundName: roundNames[nextCategory] || nextCategory,
          isFollowUp: shouldFollowUp,
          isComplete: false,
          progress: {
            answered: answers.length,
            total: sessionConfig.total,
            runningScore: Math.round(runningAvg * 10),
            currentRound: nextCategory,
          },
        });
      } else {
        // Last question — finalize
        const { error: updateErr } = await supabase
          .from('mock_interviews')
          .update({ answers })
          .eq('id', body.interviewId);

        if (updateErr) {
          console.error(`[mock-interview][${requestId}] Update error:`, updateErr);
        }

        console.log(`[mock-interview][${requestId}] Final answer processed, avg=${runningAvg.toFixed(1)} in ${Date.now() - startTime}ms`);

        return successResponse({
          feedback,
          isComplete: true,
          questionNumber: questions.length,
          totalQuestions: questions.length,
          progress: {
            answered: answers.length,
            total: answers.length,
            runningScore: Math.round(runningAvg * 10),
            currentRound: 'complete',
          },
        });
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ACTION: FEEDBACK
    // ══════════════════════════════════════════════════════════════
    if (body.action === 'feedback') {
      if (!body.interviewId) {
        return errorResponse('interviewId is required', 400);
      }

      const { data: interview, error: fetchErr } = await supabase
        .from('mock_interviews')
        .select('*')
        .eq('id', body.interviewId)
        .eq('user_id', userId)
        .single();

      if (fetchErr || !interview) {
        return errorResponse('Interview not found', 404);
      }

      const answers = (interview.answers as any[]) || [];
      const role = interview.job_role;
      const level = interview.difficulty === 'beginner' ? 'entry-level/internship' :
                    interview.difficulty === 'advanced' ? 'senior level' : 'mid-level (2-5 years)';

      console.log(`[mock-interview][${requestId}] Generating overall feedback for ${answers.length} answers`);

      let overallFeedback: any = {
        overallScore: 50,
        overallVerdict: "Needs Work",
        assessment: "You showed potential but need more practice to be interview-ready.",
        strengths: ["Clear communication"],
        weaknesses: ["Could provide more specific examples"],
        categoryScores: { technical: null, behavioral: null, situational: null, communication: 50, overall_impression: 50 },
        priorities: ["Practice STAR method", "Research the company", "Prepare questions to ask"],
        readiness: "Needs Practice",
        nextSteps: ["Practice with more mock interviews", "Review technical fundamentals", "Prepare behavioral stories"],
        interviewerNote: "Candidate shows interest but needs more preparation before real interviews.",
      };

      try {
        const content = await callAI([
          { role: "system", content: "You are an expert interview coach providing final assessment. Be honest, constructive, and specific. Your assessment must help the candidate understand exactly where they stand and what to do next." },
          { role: "user", content: getOverallFeedbackPrompt(role, level, answers) }
        ], LOVABLE_API_KEY);

        const parsed = safeJsonParse(content, overallFeedback);
        overallFeedback = { ...overallFeedback, ...parsed };
      } catch (e) {
        console.warn(`[mock-interview][${requestId}] Overall feedback generation failed, using defaults:`, e);
      }

      // Ensure arrays are valid
      overallFeedback.strengths = Array.isArray(overallFeedback.strengths) ? overallFeedback.strengths : [];
      overallFeedback.weaknesses = Array.isArray(overallFeedback.weaknesses) ? overallFeedback.weaknesses : [];
      overallFeedback.priorities = Array.isArray(overallFeedback.priorities) ? overallFeedback.priorities : [];
      overallFeedback.nextSteps = Array.isArray(overallFeedback.nextSteps) ? overallFeedback.nextSteps : [];

      if (!overallFeedback.categoryScores || typeof overallFeedback.categoryScores !== 'object') {
        overallFeedback.categoryScores = { technical: null, behavioral: null, situational: null, communication: 50, overall_impression: 50 };
      }

      const { error: updateErr } = await supabase
        .from('mock_interviews')
        .update({
          status: 'completed',
          overall_score: overallFeedback.overallScore,
          feedback: overallFeedback,
          completed_at: new Date().toISOString()
        })
        .eq('id', body.interviewId);

      if (updateErr) {
        console.error(`[mock-interview][${requestId}] Final update error:`, updateErr);
      }

      // ── Trigger intelligence recompute so SynAI sees latest interview data ──
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      fetch(`${supabaseUrl}/functions/v1/compute-user-intelligence`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }).catch(e => console.warn(`[mock-interview][${requestId}] Intelligence recompute failed:`, e));

      console.log(`[mock-interview][${requestId}] Feedback complete: score=${overallFeedback.overallScore}, verdict=${overallFeedback.overallVerdict} in ${Date.now() - startTime}ms`);

      return successResponse({ overallFeedback, answers });
    }

    return errorResponse('Invalid action', 400);

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[mock-interview][${requestId}] Error after ${elapsed}ms:`, error);

    if (error.status && error.message) {
      return errorResponse(error.message, error.status);
    }

    return errorResponse(
      error instanceof Error ? error.message : 'An unexpected error occurred',
      500
    );
  }
});
