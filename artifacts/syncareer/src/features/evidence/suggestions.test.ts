import { describe, expect, it } from 'vitest';
import { initialCVData, type CVData } from '@/features/cv-builder/types';
import { suggestionsFromCv, suggestionsFromInterviewAnswers } from './suggestions';

const experienceId = '11111111-1111-4111-8111-111111111111';

const cvWithEntries: CVData = {
  ...initialCVData,
  experience: [
    {
      id: experienceId,
      company: 'Accra Analytics',
      location: 'Accra',
      date: 'Jun 2025 - Aug 2025',
      role: 'Data Intern',
      bullets: ['Cleaned 12k rows of market data', '  ', 'Built the weekly dashboard'],
    },
  ],
  projects: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      organization: 'KNUST',
      date: '2025',
      projectName: 'Dues Ledger',
      role: 'Lead',
      bullets: ['Reconciled three terms of dues'],
    },
  ],
  achievements: [
    { id: '33333333-3333-4333-8333-333333333333', title: 'Dean’s List', organization: 'KNUST', date: '2025' },
  ],
  activities: [
    {
      id: '44444444-4444-4444-8444-444444444444',
      organization: 'Debate Society',
      activity: 'Training coordinator',
      date: '2024 - 2025',
      role: 'Coordinator',
      bullets: ['Ran weekly workshops'],
    },
  ],
};

describe('suggestionsFromCv', () => {
  it('is empty for an untouched CV', () => {
    expect(suggestionsFromCv(initialCVData)).toEqual([]);
  });

  it('maps CV sections onto deterministic candidate suggestions', () => {
    const suggestions = suggestionsFromCv(cvWithEntries);
    expect(suggestions.map((s) => s.id)).toEqual([
      `cv:experience:${experienceId}`,
      'cv:projects:22222222-2222-4222-8222-222222222222',
      'cv:achievements:33333333-3333-4333-8333-333333333333',
      'cv:activities:44444444-4444-4444-8444-444444444444',
    ]);
    const work = suggestions[0]!;
    expect(work.category).toBe('work');
    expect(work.title).toBe('Data Intern — Accra Analytics');
    expect(work.summary).toBe('Cleaned 12k rows of market data. Built the weekly dashboard');
    expect(work.originLabel).toContain('Accra Analytics');
  });

  it('is deterministic across calls', () => {
    expect(suggestionsFromCv(cvWithEntries)).toEqual(suggestionsFromCv(cvWithEntries));
  });

  it('skips entries without substantive bullets', () => {
    const sparse: CVData = {
      ...initialCVData,
      experience: [{ id: '55555555-5555-4555-8555-555555555555', company: 'X', location: '', date: '', role: '', bullets: ['', '   '] }],
    };
    expect(suggestionsFromCv(sparse)).toEqual([]);
  });

  it('keeps activities in the neutral category instead of guessing', () => {
    const suggestions = suggestionsFromCv(cvWithEntries);
    expect(suggestions.find((s) => s.id.startsWith('cv:activities'))?.category).toBe('other');
  });

  it('truncates oversized summaries', () => {
    const long: CVData = {
      ...initialCVData,
      experience: [
        {
          id: '66666666-6666-4666-8666-666666666666',
          company: 'C',
          location: '',
          date: '',
          role: 'R',
          bullets: ['x'.repeat(2000)],
        },
      ],
    };
    const suggestions = suggestionsFromCv(long);
    expect(suggestions[0]!.summary.length).toBeLessThanOrEqual(1200);
    expect(suggestions[0]!.summary.endsWith('…')).toBe(true);
  });
});

describe('suggestionsFromInterviewAnswers', () => {
  it('skips non-array and malformed payloads', () => {
    expect(suggestionsFromInterviewAnswers(null, 'Analyst')).toEqual([]);
    expect(suggestionsFromInterviewAnswers({ question: 'q' }, 'Analyst')).toEqual([]);
    expect(suggestionsFromInterviewAnswers([{ question: 'Tell me about a time…' }], 'Analyst')).toEqual([]);
  });

  it('maps completed question/answer pairs onto candidates', () => {
    const answers = [
      { question: 'Describe a data cleanup you led', answer: 'I cleaned the market dataset over two weeks.' },
      { question: 'Why this role?', answer: null },
    ];
    const suggestions = suggestionsFromInterviewAnswers(answers, 'Data Analyst');
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]!.category).toBe('other');
    expect(suggestions[0]!.title).toBe('Describe a data cleanup you led');
    expect(suggestions[0]!.originLabel).toContain('Data Analyst');
  });
});
