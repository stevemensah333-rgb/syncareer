import { describe, expect, it, vi } from 'vitest';
import { INTERVIEW_PHASE_LABELS, START_INTERVIEW_RETRY_CONFIG, isSessionActive, releaseInterviewResources, responseRecovery } from './lifecycle';

describe('interview lifecycle', () => {
  it('exposes distinct text for every active state', () => {
    expect(INTERVIEW_PHASE_LABELS.ai_speaking).toBe('AI speaking');
    expect(INTERVIEW_PHASE_LABELS.user_speaking).toBe('Listening');
    expect(INTERVIEW_PHASE_LABELS.processing).toBe('Processing');
    expect(INTERVIEW_PHASE_LABELS.paused).toBe('Paused');
    expect(INTERVIEW_PHASE_LABELS.reconnecting).toBe('Reconnecting');
    expect(INTERVIEW_PHASE_LABELS.ended).toBe('Ended');
    expect(isSessionActive('paused')).toBe(true);
    expect(isSessionActive('completed')).toBe(false);
  });

  it('does not retry an ambiguous billable start', () => {
    expect(START_INTERVIEW_RETRY_CONFIG.maxRetries).toBe(0);
  });

  it('moves response failures through a visible reconnect state', () => {
    expect(responseRecovery('network failed')).toEqual({ phase: 'reconnecting', delayMs: 1_000, rateLimited: false });
    expect(responseRecovery('429 rate limit')).toEqual({ phase: 'reconnecting', delayMs: 5_000, rateLimited: true });
  });

  it('removes recognition listeners and stops audio and media tracks', () => {
    const recognition = { onstart: vi.fn(), onresult: vi.fn(), onerror: vi.fn(), onend: vi.fn(), abort: vi.fn() };
    const audio = { pause: vi.fn(), src: 'blob:interview' };
    const track = { stop: vi.fn() };
    const revokeObjectUrl = vi.fn();
    releaseInterviewResources({
      recognition: recognition as never,
      audio: audio as never,
      mediaStream: { getTracks: () => [track] } as never,
      revokeObjectUrl,
    });
    expect(recognition.abort).toHaveBeenCalledOnce();
    expect(recognition.onresult).toBeNull();
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:interview');
  });
});
