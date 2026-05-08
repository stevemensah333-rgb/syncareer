import { useState, useRef, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type {
  InterviewMessage,
  InterviewPhase,
} from '@/types/interview';

interface UseVoiceInterviewOptions {
  jobRole: string;
  industry?: string;
  difficulty?: string;
  interviewType?: string;
  resumeContext?: string;
  jobDescription?: string;
  sessionLength?: 'quick' | 'standard' | 'extended';
}

export interface InterviewProgress {
  answered: number;
  total: number;
  runningScore: number;
  currentRound: string;
  questionNumber: number;
  totalQuestions: number;
  category: string;
  roundName: string;
  isFollowUp: boolean;
}

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

// ─── Retry utility with exponential backoff ─────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 8000 },
  label = 'operation'
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < config.maxRetries) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt),
          config.maxDelayMs
        );
        console.warn(`[Interview] ${label} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}

// ─── Safe string extraction ────────────────────────────────────────

function safeString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '[Object]';
  }
}

export function useVoiceInterview({
  jobRole,
  industry,
  difficulty,
  interviewType,
  resumeContext,
  jobDescription,
  sessionLength = 'standard',
}: UseVoiceInterviewOptions) {
  const [phase, setPhase] = useState<InterviewPhase>('idle');
  const [messages, setMessages] = useState<InterviewMessage[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<InterviewProgress>({
    answered: 0,
    total: 15,
    runningScore: 0,
    currentRound: 'intro',
    questionNumber: 1,
    totalQuestions: 15,
    category: 'intro',
    roundName: 'Introduction',
    isFollowUp: false,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const interviewIdRef = useRef<string | null>(null);
  const questionCountRef = useRef(0);
  const conversationHistoryRef = useRef<Array<{ role: string; content: string }>>([]);
  const isMountedRef = useRef(true);
  const isStoppingRef = useRef(false);

  // ─── Cleanup on unmount ──────────────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[Interview] Unhandled rejection:', event.reason);
      event.preventDefault();
    };
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('unhandledrejection', handleRejection);
      cleanupResources();
    };
  }, []);

  // ─── Resource cleanup ────────────────────────────────────────────

  const cleanupResources = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current.abort();
      } catch (e) {
        console.warn('[Interview] Recognition cleanup error:', e);
      }
      recognitionRef.current = null;
    }

    if (audioRef.current) {
      try {
        audioRef.current.pause();
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      } catch (e) {
        console.warn('[Interview] Audio cleanup error:', e);
      }
      audioRef.current = null;
    }
  }, []);

  // ─── Safe state update ───────────────────────────────────────────

  const safeSetPhase = useCallback((newPhase: InterviewPhase) => {
    if (isMountedRef.current && !isStoppingRef.current) {
      setPhase(newPhase);
    }
  }, []);

  // ─── TTS with retry and fallback ─────────────────────────────────

  const speakText = useCallback(async (text: string): Promise<void> => {
    if (!isMountedRef.current || isStoppingRef.current) return;
    safeSetPhase('ai_speaking');

    try {
      const audioBlob = await withRetry(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('No authenticated session');

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/interview-tts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ text: text.slice(0, 5000) }),
          }
        );

        if (response.status === 429) throw new Error('Rate limited');
        if (!response.ok) throw new Error(`TTS failed: ${response.status}`);

        return await response.blob();
      }, { maxRetries: 2, baseDelayMs: 1500, maxDelayMs: 6000 }, 'TTS');

      if (!isMountedRef.current || isStoppingRef.current) return;

      const audioUrl = URL.createObjectURL(audioBlob);

      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) URL.revokeObjectURL(audioRef.current.src);
      }

      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          if (isMountedRef.current && !isStoppingRef.current) {
            resolve();
          }
        };

        audio.onerror = () => {
          URL.revokeObjectURL(audioUrl);
          reject(new Error('Audio playback failed'));
        };

        audio.play().catch(reject);
      });

      if (isMountedRef.current && !isStoppingRef.current) {
        startListening();
      }
    } catch (err) {
      console.error('[Interview] TTS error:', err);
      if (!isMountedRef.current || isStoppingRef.current) return;

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.onend = () => {
          if (isMountedRef.current && !isStoppingRef.current) {
            startListening();
          }
        };
        utterance.onerror = () => {
          safeSetPhase('error');
          setError('Audio playback failed. Please check your speakers.');
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        safeSetPhase('error');
        setError('Audio playback unavailable. Please try again.');
      }
    }
  }, []);

  // ─── Speech Recognition ──────────────────────────────────────────

  const startListening = useCallback(() => {
    if (!isMountedRef.current || isStoppingRef.current) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      toast.error('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      safeSetPhase('error');
      setError('Speech recognition not supported. Use Chrome or Edge.');
      return;
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognitionClass();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let finalTranscriptAccumulator = '';

    recognition.onstart = () => {
      if (isMountedRef.current) {
        safeSetPhase('user_speaking');
        setCurrentTranscript('');
        finalTranscriptAccumulator = '';
      }
    };

    recognition.onresult = (event: any) => {
      if (!isMountedRef.current || isStoppingRef.current) return;

      try {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = safeString(event.results[i][0]?.transcript);
          if (event.results[i].isFinal) {
            finalTranscriptAccumulator += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setCurrentTranscript(finalTranscriptAccumulator + interimTranscript);

        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (finalTranscriptAccumulator.trim() && isMountedRef.current && !isStoppingRef.current) {
            handleUserResponse(finalTranscriptAccumulator.trim());
          }
        }, 2500);
      } catch (err) {
        console.error('[Interview] Recognition result error:', err);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[Interview] Recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable it in browser settings.');
        safeSetPhase('error');
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        setTimeout(() => {
          if (isMountedRef.current && !isStoppingRef.current && phase === 'user_speaking') {
            startListening();
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (silenceTimer) clearTimeout(silenceTimer);
      if (finalTranscriptAccumulator.trim() && isMountedRef.current && !isStoppingRef.current) {
        handleUserResponse(finalTranscriptAccumulator.trim());
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error('[Interview] Failed to start recognition:', err);
      safeSetPhase('error');
      setError('Could not start speech recognition. Please refresh and try again.');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (isMountedRef.current) {
      setCurrentTranscript('');
    }
  }, []);

  // ─── Handle user response ────────────────────────────────────────

  const handleUserResponse = useCallback(async (userText: string) => {
    if (!isMountedRef.current || isStoppingRef.current) return;
    stopListening();

    const userMessage: InterviewMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setCurrentTranscript('');
    safeSetPhase('processing');

    conversationHistoryRef.current.push({ role: 'user', content: userText });

    try {
      const { data, error: fnError } = await withRetry(
        () => supabase.functions.invoke('mock-interview', {
          body: {
            action: 'answer',
            interviewId: interviewIdRef.current,
            answer: userText,
            conversationHistory: conversationHistoryRef.current,
            sessionLength,
          },
        }),
        { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 8000 },
        'AI response'
      );

      if (fnError) throw fnError;
      if (!isMountedRef.current || isStoppingRef.current) return;

      questionCountRef.current++;

      // Update progress from backend
      if (data.progress) {
        setProgress(prev => ({
          ...prev,
          answered: data.progress.answered,
          total: data.progress.total,
          runningScore: data.progress.runningScore,
          currentRound: data.progress.currentRound,
          questionNumber: data.questionNumber || prev.questionNumber,
          totalQuestions: data.totalQuestions || prev.totalQuestions,
          category: data.category || prev.category,
          roundName: data.roundName || prev.roundName,
          isFollowUp: data.isFollowUp || false,
        }));
      }

      let responseText = '';

      if (!data.isComplete && data.nextQuestion) {
        responseText = safeString(data.nextQuestion);
        conversationHistoryRef.current.push({ role: 'assistant', content: responseText });
      } else if (data.isComplete) {
        responseText = "Excellent! You've completed all the interview questions. Let me prepare your comprehensive feedback report...";

        try {
          const { data: feedbackData } = await supabase.functions.invoke('mock-interview', {
            body: {
              action: 'feedback',
              interviewId: interviewIdRef.current,
            },
          });

          if (feedbackData?.overallFeedback) {
            const fb = feedbackData.overallFeedback;
            const strengths = Array.isArray(fb.strengths) ? fb.strengths.join(', ') : 'N/A';
            const weaknesses = Array.isArray(fb.weaknesses) ? fb.weaknesses.join(', ') : 'N/A';
            const nextSteps = Array.isArray(fb.nextSteps) ? fb.nextSteps.join(', ') : '';

            responseText = `🎯 Interview Complete!\n\nScore: ${fb.overallScore ?? 'N/A'}/100 — ${fb.overallVerdict || 'N/A'}\nReadiness: ${fb.readiness || 'N/A'}\n\n${safeString(fb.assessment)}\n\n✅ Strengths: ${strengths}\n⚠️ Areas to Improve: ${weaknesses}${nextSteps ? `\n\n📋 Next Steps: ${nextSteps}` : ''}${fb.interviewerNote ? `\n\n💼 Interviewer's Note: ${fb.interviewerNote}` : ''}`;
          }
        } catch (feedbackErr) {
          console.error('[Interview] Feedback fetch error:', feedbackErr);
          responseText = "Interview complete! There was an issue loading detailed feedback, but your responses have been saved. Check your interview history for results.";
        }

        setProgress(prev => ({ ...prev, currentRound: 'complete', answered: prev.total }));
        safeSetPhase('completed');
      }

      if (responseText && isMountedRef.current) {
        const aiMessage: InterviewMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiMessage]);

        if (!data.isComplete) {
          await speakText(responseText);
        }
      }
    } catch (err) {
      console.error('[Interview] Response error:', err);
      if (!isMountedRef.current || isStoppingRef.current) return;

      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      if (errorMsg.includes('Rate limit') || errorMsg.includes('429')) {
        toast.error('Too many requests. Please wait a moment before continuing.');
        setTimeout(() => {
          if (isMountedRef.current && !isStoppingRef.current) {
            startListening();
          }
        }, 5000);
      } else {
        toast.error('Failed to get AI response. You can try speaking again.');
        startListening();
      }
    }
  }, [speakText, stopListening, startListening, sessionLength]);

  // ─── Start interview ─────────────────────────────────────────────

  const start = useCallback(async () => {
    isStoppingRef.current = false;
    setMessages([]);
    setError(null);
    questionCountRef.current = 0;
    conversationHistoryRef.current = [];
    safeSetPhase('connecting');

    const totalMap = { quick: 8, standard: 15, extended: 20 };
    setProgress({
      answered: 0,
      total: totalMap[sessionLength] || 15,
      runningScore: 0,
      currentRound: 'intro',
      questionNumber: 1,
      totalQuestions: totalMap[sessionLength] || 15,
      category: 'intro',
      roundName: 'Introduction',
      isFollowUp: false,
    });

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const { data, error: fnError } = await withRetry(
        () => supabase.functions.invoke('mock-interview', {
          body: {
            action: 'start',
            jobRole,
            industry,
            resumeText: resumeContext,
            jobDescription,
            difficulty: difficulty || 'intermediate',
            interviewType: interviewType || 'mixed',
            sessionLength,
          },
        }),
        { maxRetries: 2, baseDelayMs: 2000, maxDelayMs: 8000 },
        'Start interview'
      );

      if (fnError) throw fnError;
      if (!isMountedRef.current) return;

      interviewIdRef.current = data.interview?.id ?? null;
      const greeting = safeString(data.currentQuestion);

      if (data.totalQuestions) {
        setProgress(prev => ({
          ...prev,
          totalQuestions: data.totalQuestions,
          total: data.totalQuestions,
          category: data.category || 'intro',
          roundName: data.roundName || 'Introduction',
        }));
      }

      conversationHistoryRef.current.push({ role: 'assistant', content: greeting });

      const greetingMessage: InterviewMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: greeting,
        timestamp: new Date(),
      };
      setMessages([greetingMessage]);

      await speakText(greeting);
    } catch (err) {
      console.error('[Interview] Start error:', err);
      if (!isMountedRef.current) return;

      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      if (errorMsg.includes('Permission denied') || errorMsg.includes('NotAllowedError')) {
        setError('Microphone access is required. Please allow microphone access and try again.');
      } else if (errorMsg.includes('Rate limit') || errorMsg.includes('429')) {
        setError('Service is busy. Please wait a moment and try again.');
      } else {
        setError('Failed to start interview. Please check your connection and try again.');
      }
      safeSetPhase('error');
    }
  }, [jobRole, industry, difficulty, interviewType, resumeContext, jobDescription, speakText, sessionLength]);

  // ─── Stop interview ──────────────────────────────────────────────

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    cleanupResources();
    window.speechSynthesis?.cancel();
    setCurrentTranscript('');
    setError(null);
    safeSetPhase('idle');
    interviewIdRef.current = null;
  }, [cleanupResources]);

  // ─── Retry from error state ──────────────────────────────────────

  const retry = useCallback(() => {
    setError(null);
    safeSetPhase('idle');
    isStoppingRef.current = false;
  }, []);

  // ─── Derived state ───────────────────────────────────────────────

  const isActive = phase !== 'idle' && phase !== 'error';
  const isLoading = phase === 'connecting' || phase === 'processing';
  const isSpeaking = phase === 'ai_speaking';
  const isListening = phase === 'user_speaking';
  const isCompleted = phase === 'completed';

  return {
    phase,
    isActive,
    isLoading,
    isSpeaking,
    isListening,
    isCompleted,
    messages,
    currentTranscript,
    error,
    progress,
    start,
    stop,
    retry,
  };
}
