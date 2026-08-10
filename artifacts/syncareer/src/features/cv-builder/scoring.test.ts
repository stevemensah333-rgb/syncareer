import { describe, it, expect } from 'vitest';
import type { CVData } from './types';
import { initialCVData } from './types';
import {
  computeFullScore,
  isMeaningfulText,
  isExperienceMeaningful,
  isProjectMeaningful,
  isActivityMeaningful,
  isAchievementMeaningful,
  scoreCompleteness,
} from './scoring';

/**
 * Regression coverage for the CV Strength Score.
 *
 * The defining invariant: an untouched CV with no meaningful user-entered
 * content scores exactly 0. Points are earned only by meaningful content,
 * never by the existence of an empty section, entry object, default text,
 * placeholder, or structural metadata.
 */

/** An empty CV built from raw literals (no defaults at all). */
const EMPTY_CV: CVData = {
  personal: { firstName: '', lastName: '', phone: '', nationality: '', email: '', schoolEmail: '', linkedIn: '' },
  education: { university: '', location: '', degree: '', graduationDate: '', gpa: '' },
  achievements: [],
  experience: [],
  projects: [],
  activities: [],
  skills: [],
  references: '',
};

/** A CV whose string fields are whitespace-only and whose arrays are empty. */
const WHITESPACE_CV: CVData = {
  personal: { firstName: '   ', lastName: '\t', phone: ' \n ', nationality: '  ', email: ' ', schoolEmail: '  ', linkedIn: ' ' },
  education: { university: '   ', location: ' ', degree: '\t', graduationDate: ' ', gpa: ' ' },
  achievements: [],
  experience: [],
  projects: [],
  activities: [],
  skills: [],
  references: '   ',
};

/** A CV containing empty entry objects (e.g. from an "Add" button the user left blank). */
const EMPTY_ENTRIES_CV: CVData = {
  ...EMPTY_CV,
  experience: [{ id: 'e1', company: '', location: '', date: '', role: '', bullets: [''] }],
  education: { university: '', location: '', degree: '', graduationDate: '', gpa: '' },
  projects: [{ id: 'p1', organization: '', date: '', projectName: '', role: '', bullets: [] }],
  activities: [{ id: 'a1', organization: '', activity: '', date: '', role: '', bullets: ['   '] }],
  achievements: [{ id: 'ach1', title: '', organization: '', date: '' }],
};

/** A representative fully-completed CV. */
const FULL_CV: CVData = {
  personal: {
    firstName: 'Ama', lastName: 'Mensah', phone: '+233201234567', nationality: 'Ghanaian',
    email: 'ama@example.com', schoolEmail: '', linkedIn: 'linkedin.com/in/ama',
  },
  education: {
    university: 'University of Ghana', location: 'Accra', degree: 'BSc Computer Science',
    graduationDate: '2025-05', gpa: '3.8',
  },
  skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'Python', 'AWS', 'Docker', 'CI/CD'],
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
      bullets: ['Directed a team of 4 to ship a finance analytics dashboard in 48 hours.'],
    },
  ],
  achievements: [
    { id: 'a1', title: 'AWS Certified Cloud Practitioner', organization: 'Amazon', date: '2024' },
  ],
  activities: [],
  references: 'Available upon request',
};

describe('CV strength scoring — empty / untouched CV', () => {
  it('a completely empty CV scores exactly 0', () => {
    expect(computeFullScore(EMPTY_CV).totalScore).toBe(0);
  });

  it('the exported default CV object (empty section structures + default references) scores 0', () => {
    // initialCVData ships with `references: 'Available upon request'`; that
    // default text must not inflate the score, and references is not scored.
    expect(computeFullScore(initialCVData).totalScore).toBe(0);
  });

  it('whitespace-only values score 0', () => {
    expect(computeFullScore(WHITESPACE_CV).totalScore).toBe(0);
  });

  it('empty education and experience entry objects earn no points', () => {
    const result = computeFullScore(EMPTY_ENTRIES_CV);
    expect(result.totalScore).toBe(0);
    expect(result.breakdown.completeness.details.experience?.score).toBe(0);
    expect(result.breakdown.completeness.details.education?.score).toBe(0);
    expect(result.breakdown.completeness.details.projectsCerts?.score).toBe(0);
  });

  it('does not award points for merely "selecting" presentation (no template/content input affects score)', () => {
    // CVData carries no template field and scoring reads only CVData, so a CV
    // with no content cannot gain points from presentation choices.
    const noContent: CVData = { ...EMPTY_CV };
    expect(computeFullScore(noContent).totalScore).toBe(0);
  });
});

describe('CV strength scoring — meaningful content contributes', () => {
  it('a single meaningful personal field contributes only its documented amount', () => {
    // One meaningful personal field (firstName) out of the 3-field personalDetails
    // bucket (max 5): Math.round((1 / 3) * 5) = 2. Nothing else is meaningful.
    const oneField: CVData = {
      ...EMPTY_CV,
      personal: { ...EMPTY_CV.personal, firstName: 'Ama' },
    };
    const result = computeFullScore(oneField);
    expect(result.breakdown.completeness.details.personalDetails?.score).toBe(2);
    expect(result.totalScore).toBe(2);
  });

  it('a partially completed section earns an appropriate partial score, strictly above the single-field case', () => {
    const partial: CVData = {
      ...EMPTY_CV,
      personal: {
        ...EMPTY_CV.personal,
        firstName: 'Ama', lastName: 'Mensah', email: 'ama@example.com',
      },
    };
    const result = computeFullScore(partial);
    // Three meaningful personal fields saturate the personalDetails bucket (5/5).
    expect(result.breakdown.completeness.details.personalDetails?.score).toBe(5);
    expect(result.totalScore).toBe(5);
    expect(result.totalScore).toBeGreaterThan(computeFullScore({ ...EMPTY_CV, personal: { ...EMPTY_CV.personal, firstName: 'Ama' } }).totalScore);
  });

  it('a fully completed representative CV reaches the expected score', () => {
    const result = computeFullScore(FULL_CV);
    // Documented expectation: every bucket is saturated → 100.
    expect(result.totalScore).toBe(100);
    expect(result.label).toBe('Excellent');
    expect(result.breakdown.completeness.score).toBe(25);
    expect(result.breakdown.contentQuality.score).toBe(25);
    expect(result.breakdown.skillsRelevance.score).toBe(20);
    expect(result.breakdown.presentation.score).toBe(15);
    expect(result.breakdown.competitiveness.score).toBe(15);
  });

  it('removing a field returns the score toward 0 (monotonic under removal)', () => {
    const full = computeFullScore(FULL_CV).totalScore;
    const emptied: CVData = {
      ...FULL_CV,
      personal: { firstName: '', lastName: '', phone: '', nationality: '', email: '', schoolEmail: '', linkedIn: '' },
      experience: [],
      projects: [],
      skills: [],
    };
    const reduced = computeFullScore(emptied).totalScore;
    expect(reduced).toBeLessThan(full);
    // And a fully emptied CV returns to 0.
    expect(computeFullScore({ ...FULL_CV, experience: [], projects: [], activities: [], achievements: [], skills: [], personal: EMPTY_CV.personal, education: EMPTY_CV.education }).totalScore).toBe(0);
  });
});

describe('CV strength scoring — robustness', () => {
  it('the score is always finite and within 0–100, never NaN', () => {
    const cases: CVData[] = [EMPTY_CV, WHITESPACE_CV, EMPTY_ENTRIES_CV, FULL_CV];
    for (const cv of cases) {
      const { totalScore } = computeFullScore(cv);
      expect(Number.isFinite(totalScore)).toBe(true);
      expect(totalScore).toBeGreaterThanOrEqual(0);
      expect(totalScore).toBeLessThanOrEqual(100);
    }
  });

  it('is deterministic: identical input yields identical output', () => {
    const a = computeFullScore(FULL_CV);
    const b = computeFullScore(FULL_CV);
    expect(a.totalScore).toBe(b.totalScore);
    expect(a.breakdown).toEqual(b.breakdown);
  });
});

describe('meaningful-content helpers', () => {
  it('treats empty, whitespace, and placeholder strings as absent', () => {
    expect(isMeaningfulText(undefined)).toBe(false);
    expect(isMeaningfulText(null)).toBe(false);
    expect(isMeaningfulText('')).toBe(false);
    expect(isMeaningfulText('   ')).toBe(false);
    expect(isMeaningfulText('lorem ipsum')).toBe(false);
    expect(isMeaningfulText('enter your name')).toBe(false);
    expect(isMeaningfulText('tbd')).toBe(false);
    expect(isMeaningfulText('Real content')).toBe(true);
  });

  it('treats entry objects with no meaningful fields as absent', () => {
    expect(isExperienceMeaningful({ id: '1', company: '', location: ' ', date: '', role: '', bullets: [''] })).toBe(false);
    expect(isProjectMeaningful({ id: '1', organization: '', date: '', projectName: '', role: '', bullets: [] })).toBe(false);
    expect(isActivityMeaningful({ id: '1', organization: '', activity: '', date: '', role: '', bullets: ['   '] })).toBe(false);
    expect(isAchievementMeaningful({ id: '1', title: '', organization: '', date: '' })).toBe(false);

    expect(isExperienceMeaningful({ id: '1', company: 'TechCorp', location: '', date: '', role: '', bullets: [] })).toBe(true);
    expect(isAchievementMeaningful({ id: '1', title: 'AWS Cert', organization: '', date: '' })).toBe(true);
  });

  it('counts only meaningful skills toward the skills bucket', () => {
    const cv: CVData = { ...EMPTY_CV, skills: ['   ', 'lorem ipsum', 'Python'] };
    expect(scoreCompleteness(cv).details.skills?.score).toBe(5);
  });
});
