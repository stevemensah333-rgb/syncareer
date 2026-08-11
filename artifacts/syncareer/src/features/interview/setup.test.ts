import { describe, expect, it } from 'vitest';
import { classifyMicrophoneError, listingInterviewContext, manualInterviewContext } from './setup';

describe('interview setup', () => {
  it('never maps a RIASEC theme or major into role/industry', () => {
    expect(manualInterviewContext()).toEqual({ role: '', organisation: '', description: '' });
  });

  it('prefills only factual listing context', () => {
    expect(listingInterviewContext({ title: 'Data Analyst', organisation: 'Acme', description: 'Analyse data' }))
      .toEqual({ role: 'Data Analyst', organisation: 'Acme', description: 'Analyse data' });
  });

  it('distinguishes permission denial, missing devices and other failures', () => {
    expect(classifyMicrophoneError({ name: 'NotAllowedError' })).toBe('denied');
    expect(classifyMicrophoneError({ name: 'NotFoundError' })).toBe('missing');
    expect(classifyMicrophoneError(new Error('device busy'))).toBe('failed');
  });
});
