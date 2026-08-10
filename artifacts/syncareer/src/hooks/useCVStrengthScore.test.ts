import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { CVData } from '@/pages/CVBuilder';
import { useCVStrengthScore } from './useCVStrengthScore';

/**
 * Matrix 1.2 — Deterministic CV strength calculation.
 * Pure scoring over CV fixtures. No LLM prose is asserted.
 */

function makeCV(overrides: Partial<CVData> = {}): CVData {
  return {
    personal: {
      firstName: '', lastName: '', phone: '', nationality: '',
      email: '', schoolEmail: '', linkedIn: '',
    },
    education: {
      university: '', location: '', degree: '', graduationDate: '', gpa: '',
    },
    achievements: [],
    experience: [],
    projects: [],
    activities: [],
    skills: [],
    references: '',
    ...overrides,
  };
}

const EMPTY_CV = makeCV();

const STRONG_CV = makeCV({
  personal: {
    firstName: 'Ama', lastName: 'Mensah', phone: '+233201234567',
    nationality: 'Ghanaian', email: 'ama@example.com', schoolEmail: '',
    linkedIn: 'linkedin.com/in/ama',
  },
  education: {
    university: 'University of Ghana', location: 'Accra', degree: 'BSc Computer Science',
    graduationDate: '2025-05', gpa: '3.8',
  },
  skills: [
    'TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python', 'AWS', 'Docker', 'CI/CD',
  ],
  experience: [
    {
      id: 'e1', company: 'TechCorp', location: 'Accra', date: '2024-2025',
      role: 'Software Engineering Intern',
      bullets: [
        'Led the migration of 3 services to TypeScript, improving build reliability.',
        'Reduced API response time by 40% through query optimization.',
        'Mentored 2 junior developers on code review best practices.',
      ],
    },
  ],
  projects: [
    {
      id: 'p1', organization: 'Personal', date: '2024', projectName: 'Syncareer Clone',
      role: 'Solo Developer',
      bullets: [
        'Built a full-stack career platform serving 1,000+ users.',
        'Implemented OAuth sign-in and role-based dashboards.',
      ],
    },
    {
      id: 'p2', organization: 'Hackathon', date: '2023', projectName: 'Fintech Dashboard',
      role: 'Team Lead',
      bullets: [
        'Directed a team of 4 to ship a finance analytics dashboard in 48 hours.',
      ],
    },
  ],
  achievements: [
    { id: 'a1', title: 'AWS Certified Cloud Practitioner', organization: 'Amazon', date: '2024' },
  ],
});

describe('useCVStrengthScore', () => {
  it('returns a Weak score for an empty CV', () => {
    const { result } = renderHook(() => useCVStrengthScore(EMPTY_CV));
    expect(result.current.label).toBe('Weak');
    expect(result.current.totalScore).toBeLessThanOrEqual(40);
    expect(result.current.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('scores a strong CV as Strong or Excellent', () => {
    const { result } = renderHook(() => useCVStrengthScore(STRONG_CV));
    expect(['Strong', 'Excellent']).toContain(result.current.label);
    expect(result.current.totalScore).toBeGreaterThan(65);
  });

  it('is strictly better than the empty CV (deterministic + monotonic)', () => {
    const { result: strong } = renderHook(() => useCVStrengthScore(STRONG_CV));
    const { result: empty } = renderHook(() => useCVStrengthScore(EMPTY_CV));
    expect(strong.current.totalScore).toBeGreaterThan(empty.current.totalScore);
  });

  it('is deterministic: identical input yields identical score and label', () => {
    const { result: a } = renderHook(() => useCVStrengthScore(STRONG_CV));
    const { result: b } = renderHook(() => useCVStrengthScore(STRONG_CV));
    expect(a.current.totalScore).toBe(b.current.totalScore);
    expect(a.current.label).toBe(b.current.label);
    expect(a.current.breakdown).toEqual(b.current.breakdown);
  });

  it('penalises placeholder text and missing experience', () => {
    const withPlaceholder = makeCV({
      personal: { ...EMPTY_CV.personal, firstName: 'John', lastName: 'Doe' },
      skills: ['lorem ipsum', 'tbd'],
    });
    const { result } = renderHook(() => useCVStrengthScore(withPlaceholder));
    expect(result.current.breakdown.contentQuality.details.noPlaceholder?.score).toBe(0);
    expect(result.current.breakdown.completeness.details.experience?.score).toBe(0);
    expect(result.current.totalScore).toBeLessThanOrEqual(40);
  });
});
