import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_TTS_LENGTH = 5000;

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const requestId = crypto.randomUUID().slice(0, 8);
  const startTime = Date.now();

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn(`[interview-tts][${requestId}] Missing auth header`);
      return errorResponse("Missing or invalid authorization header", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.warn(`[interview-tts][${requestId}] JWT verification failed`);
      return errorResponse("Invalid or expired token", 401);
    }

    const userId = user.id;

    // ── Parse & Validate ──
    let body: { text?: string; voiceId?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid request body", 400);
    }

    const { text, voiceId } = body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return errorResponse("Text is required and must be a non-empty string", 400);
    }

    if (text.length > MAX_TTS_LENGTH) {
      return errorResponse(`Text exceeds maximum length of ${MAX_TTS_LENGTH} characters`, 400);
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      console.error(`[interview-tts][${requestId}] ELEVENLABS_API_KEY not configured`);
      return errorResponse("TTS service not configured", 500);
    }

    // George voice (professional male) by default
    const selectedVoiceId = voiceId || "JBFqnCBsd6RMkjVDRZzb";

    console.log(`[interview-tts][${requestId}] Generating TTS: ${text.length} chars for user ${userId}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown');
      console.error(`[interview-tts][${requestId}] ElevenLabs error: ${response.status} - ${errorText}`);

      if (response.status === 429) {
        return errorResponse("TTS rate limit exceeded. Please wait before trying again.", 429);
      }

      return errorResponse("TTS generation failed", 500);
    }

    const audioBuffer = await response.arrayBuffer();
    const elapsed = Date.now() - startTime;
    console.log(`[interview-tts][${requestId}] TTS generated: ${audioBuffer.byteLength} bytes in ${elapsed}ms`);

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[interview-tts][${requestId}] Error after ${elapsed}ms:`, error);
    return errorResponse(
      error instanceof Error ? error.message : "Unknown error",
      500
    );
  }
});
