import type { InterviewPhase, SpeechRecognitionInstance } from '@/types/interview';

export const START_INTERVIEW_RETRY_CONFIG = {
  maxRetries: 0,
  baseDelayMs: 2_000,
  maxDelayMs: 8_000,
} as const;

export const INTERVIEW_PHASE_LABELS: Record<InterviewPhase, string> = {
  idle: 'Ready',
  connecting: 'Connecting',
  ai_speaking: 'AI speaking',
  user_speaking: 'Listening',
  processing: 'Processing',
  paused: 'Paused',
  reconnecting: 'Reconnecting',
  completed: 'Completed',
  ended: 'Ended',
  error: 'Error',
};

interface InterviewResources {
  recognition: SpeechRecognitionInstance | null;
  audio: HTMLAudioElement | null;
  mediaStream: MediaStream | null;
  revokeObjectUrl?: (url: string) => void;
}

export function releaseInterviewResources({
  recognition,
  audio,
  mediaStream,
  revokeObjectUrl = URL.revokeObjectURL,
}: InterviewResources): void {
  if (recognition) {
    recognition.onstart = null;
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;
    recognition.abort();
  }
  if (audio) {
    audio.pause();
    if (audio.src) revokeObjectUrl(audio.src);
  }
  mediaStream?.getTracks().forEach((track) => track.stop());
}

export function isSessionActive(phase: InterviewPhase): boolean {
  return !['idle', 'error', 'completed', 'ended'].includes(phase);
}

export function responseRecovery(errorMessage: string): { phase: 'reconnecting'; delayMs: number; rateLimited: boolean } {
  const rateLimited = /rate limit|429/i.test(errorMessage);
  return { phase: 'reconnecting', delayMs: rateLimited ? 5_000 : 1_000, rateLimited };
}
