import { describe, it, expect } from 'vitest';
import {
  statusLabel,
  isActiveStatus,
  stageForStatus,
  statusesForStage,
  terminalOutcomeForStatus,
  buildJourney,
  STATUS_EDITOR_GROUPS,
  canRecordStatus,
  normalizeApplicationNotes,
  APPLICATION_NOTES_MAX,
  getApplicationNextAction,
  nextStepForApplicationStatus,
  STAGE_ORDER,
  type ApplicationStage,
} from './workflow';

describe('status vocabulary (consolidated with Home)', () => {
  it('keeps the existing labels Home depends on', () => {
    expect(statusLabel('pending')).toBe('Applied');
    expect(statusLabel('reviewing')).toBe('Under review');
    expect(statusLabel('interview')).toBe('Interview');
    expect(statusLabel('rejected')).toBe('Closed');
    expect(statusLabel('custom')).toBe('Custom');
  });

  it('detects active statuses', () => {
    expect(isActiveStatus('pending')).toBe(true);
    expect(isActiveStatus('offered')).toBe(true);
    expect(isActiveStatus('rejected')).toBe(false);
    expect(isActiveStatus('withdrawn')).toBe(false);
  });

  it('keeps baseline next-step copy behaviour', () => {
    expect(nextStepForApplicationStatus('pending', 'Software Engineer').title.toLowerCase()).toContain('review');
    expect(nextStepForApplicationStatus('interview', 'Data Analyst').href).toContain('interview-simulator');
    expect(nextStepForApplicationStatus('offered', 'PM').href).toContain('applications');
  });
});

describe('stage mapping', () => {
  it('maps every known status into the small journey', () => {
    expect(stageForStatus('pending')).toBe('applied');
    expect(stageForStatus('reviewing')).toBe('review');
    expect(stageForStatus('shortlisted')).toBe('review');
    expect(stageForStatus('interview')).toBe('interview');
    expect(stageForStatus('offered')).toBe('offer');
    expect(stageForStatus('hired')).toBe('outcome');
    expect(stageForStatus('rejected')).toBe('outcome');
    expect(stageForStatus('withdrawn')).toBe('outcome');
  });

  it('returns null for unknown stored statuses instead of guessing', () => {
    expect(stageForStatus('ghosted')).toBeNull();
    expect(stageForStatus('')).toBeNull();
  });

  it('stage filters cover all stored statuses exactly once per stage', () => {
    const byStage = STAGE_ORDER.flatMap((s) => statusesForStage(s).map((status) => [status, s] as const));
    for (const [status, stage] of byStage) {
      expect(stageForStatus(status)).toBe(stage as ApplicationStage);
    }
    expect(statusesForStage('review')).toEqual(['reviewing', 'shortlisted']);
  });
});

describe('buildJourney', () => {
  it('marks progress up to the current stage for active statuses', () => {
    const journey = buildJourney('interview');
    expect(journey.unknownStatus).toBe(false);
    expect(journey.terminal).toBeNull();
    expect(journey.steps.map((s) => s.state)).toEqual(['done', 'done', 'current', 'upcoming', 'upcoming']);
  });

  it('keeps the first step current for a fresh (pending) application', () => {
    const journey = buildJourney('pending');
    expect(journey.steps[0]?.state).toBe('current');
  });

  it('does not fabricate a stage history for terminal outcomes', () => {
    const hired = buildJourney('hired');
    expect(hired.terminal).toBe('hired');
    // Only "applied" is factually recorded; middle stages are unrecorded.
    expect(hired.steps.map((s) => s.state)).toEqual(['done', 'unrecorded', 'unrecorded', 'unrecorded', 'current']);
    expect(hired.steps.at(-1)?.label).toBe('Hired');

    const rejected = buildJourney('rejected');
    expect(rejected.steps.at(-1)?.label).toBe('Not selected');

    const withdrawn = buildJourney('withdrawn');
    expect(withdrawn.steps.at(-1)?.label).toBe('Withdrawn');
  });

  it('flags unknown statuses for partial-data rendering', () => {
    const journey = buildJourney('legacy-status');
    expect(journey.unknownStatus).toBe(true);
    expect(journey.steps.every((s) => s.state === 'upcoming')).toBe(true);
  });
});

describe('status editor', () => {
  it('offers a small grouped set: progress + outcome recording', () => {
    expect(STATUS_EDITOR_GROUPS.map((g) => g.id)).toEqual(['progress', 'outcome']);
    const all = STATUS_EDITOR_GROUPS.flatMap((g) => g.options.map((o) => o.value));
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain('hired');
    expect(all).toContain('rejected');
    expect(all).toContain('withdrawn');
  });

  it('only allows recording known statuses different from the current one', () => {
    expect(canRecordStatus('pending', 'interview')).toBe(true);
    expect(canRecordStatus('pending', 'pending')).toBe(false);
    expect(canRecordStatus('pending', 'made-up')).toBe(false);
  });
});

describe('normalizeApplicationNotes', () => {
  it('trims and stores blank notes as null', () => {
    expect(normalizeApplicationNotes('  hello  ')).toBe('hello');
    expect(normalizeApplicationNotes('   ')).toBeNull();
    expect(normalizeApplicationNotes('')).toBeNull();
  });

  it('caps very long notes', () => {
    const long = 'x'.repeat(APPLICATION_NOTES_MAX + 50);
    expect(normalizeApplicationNotes(long)?.length).toBe(APPLICATION_NOTES_MAX);
  });
});

describe('terminalOutcomeForStatus', () => {
  it('detects exactly the terminal outcomes', () => {
    expect(terminalOutcomeForStatus('hired')).toBe('hired');
    expect(terminalOutcomeForStatus('rejected')).toBe('rejected');
    expect(terminalOutcomeForStatus('withdrawn')).toBe('withdrawn');
    expect(terminalOutcomeForStatus('pending')).toBeNull();
    expect(terminalOutcomeForStatus('mystery')).toBeNull();
  });
});

describe('getApplicationNextAction', () => {
  const base = {
    status: 'pending',
    jobTitle: 'Junior Analyst',
    jobMissing: false,
    deadlinePassed: false,
    hasCv: true,
    skills: null,
  };

  it('handles a missing posting without dead-end CTAs', () => {
    const action = getApplicationNextAction({ ...base, jobMissing: true, jobTitle: null });
    expect(action.kind).toBe('info');
    expect(action.title).toContain('unavailable');
    expect(action.href).toBeUndefined();
  });

  it('warns instead of cheerleading when the listed deadline passed', () => {
    const action = getApplicationNextAction({ ...base, deadlinePassed: true });
    expect(action.kind).toBe('info');
    expect(action.title).toContain('deadline');
  });

  it('recommends creating a CV when none is saved', () => {
    const action = getApplicationNextAction({ ...base, hasCv: false });
    expect(action.kind).toBe('link');
    expect(action.href).toContain('/cv-builder');
    expect(action.href).toContain('targetRole=Junior%20Analyst');
  });

  it('points pending applications with a CV at interview practice', () => {
    const action = getApplicationNextAction({ ...base });
    expect(action.kind).toBe('link');
    expect(action.href).toContain('/interview-simulator');
  });

  it('enriches interview links with posting skills when available', () => {
    const action = getApplicationNextAction({ ...base, status: 'interview', skills: ['SQL', 'Excel'] });
    expect(action.href).toContain('interview-simulator');
    expect(action.href).toContain('skills=SQL%2CExcel');
  });

  it('asks for outcome recording on offers, not a navigation away', () => {
    const action = getApplicationNextAction({ ...base, status: 'offered' });
    expect(action.kind).toBe('record-outcome');
  });

  it('closes the loop for terminal outcomes', () => {
    expect(getApplicationNextAction({ ...base, status: 'hired' }).href).toBe('/cv-builder');
    expect(getApplicationNextAction({ ...base, status: 'rejected' }).href).toBe('/opportunities');
    expect(getApplicationNextAction({ ...base, status: 'withdrawn' }).href).toBe('/opportunities');
  });

  it('falls back to role-agnostic safe copy for unknown statuses', () => {
    const action = getApplicationNextAction({ ...base, status: 'weird', jobTitle: null });
    expect(action.kind).toBe('link');
    expect(action.href).toBe('/applications');
  });
});
