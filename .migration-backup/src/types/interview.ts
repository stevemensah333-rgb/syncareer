// ─── Core Data Models ───────────────────────────────────────────────

export interface InterviewMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface InterviewSetupConfig {
  jobRole: string;
  industry: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  interviewType: 'behavioral' | 'technical' | 'mixed';
  resumeText: string;
  jobDescription: string;
}

export interface InterviewFeedback {
  verdict: 'Strong' | 'Average' | 'Weak';
  score: number;
  feedback: string;
  improvedAnswer: string;
  tip: string;
}

export interface OverallFeedback {
  overallScore: number;
  overallVerdict: string;
  assessment: string;
  strengths: string[];
  weaknesses: string[];
  priorities: string[];
  readiness: string;
}


// ─── Voice State Machine ────────────────────────────────────────────

export type InterviewPhase =
  | 'idle'          // Not started
  | 'connecting'    // Starting session
  | 'ai_speaking'   // AI is speaking via TTS
  | 'user_speaking' // User mic is active
  | 'processing'    // Waiting for AI response
  | 'completed'     // Interview finished
  | 'error';        // Recoverable error state

export interface VoiceInterviewState {
  phase: InterviewPhase;
  messages: InterviewMessage[];
  currentTranscript: string;
  interviewId: string | null;
  questionCount: number;
  error: string | null;
}

// ─── Speech Recognition Types ───────────────────────────────────────

export interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

export interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
  onresult: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognitionInstance, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognitionInstance, ev: Event) => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ─── Utility Types ──────────────────────────────────────────────────

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 8000,
};
