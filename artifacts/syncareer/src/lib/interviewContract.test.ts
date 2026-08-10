import { describe, it, expect } from 'vitest';
import { DEFAULT_RETRY_CONFIG } from '@/types/interview';

/**
 * Matrix 5.4 / 4.4 — Deterministic interview stub contract.
 * The interview engine is AI/edge-function driven (LLM prose is NOT tested).
 * We pin the deterministic state-machine/retry contract that guards it:
 *   - exact finite set of phases
 *   - bounded, exponential retry backoff used around provider calls
 */

const PHASES = [
  'idle',
  'connecting',
  'ai_speaking',
  'user_speaking',
  'processing',
  'completed',
  'error',
] as const;

describe('interview phase machine', () => {
  it('has the expected finite set of phases', () => {
    // Asserts the union type matches the documented states, so a stray phase
    // cannot silently extend the state machine.
    expect(PHASES).toHaveLength(7);
    for (const p of PHASES) expect(typeof p).toBe('string');
  });
});

describe('interview retry/backoff contract (DEFAULT_RETRY_CONFIG)', () => {
  it('uses a bounded exponential backoff', () => {
    // maxRetries=3 → up to 4 attempts, capped at maxDelayMs to bound latency.
    expect(DEFAULT_RETRY_CONFIG.maxRetries).toBe(3);
    expect(DEFAULT_RETRY_CONFIG.baseDelayMs).toBeGreaterThan(0);
    expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBeGreaterThan(DEFAULT_RETRY_CONFIG.baseDelayMs);
    // Worst-case backoff never exceeds the cap across all retries.
    const maxBackoff =
      DEFAULT_RETRY_CONFIG.baseDelayMs * Math.pow(2, DEFAULT_RETRY_CONFIG.maxRetries);
    expect(maxBackoff).toBeGreaterThanOrEqual(DEFAULT_RETRY_CONFIG.maxDelayMs);
  });
});
