import { describe, expect, it } from 'vitest';
import type { CVData } from './types';
import { initialCVData } from './types';
import {
  computeCVCompletion,
  computeFullScore,
  getMeaningfulSkills,
  isAchievementMeaningful,
  isActivityMeaningful,
  isExperienceMeaningful,
  isMeaningfulText,
  isProjectMeaningful,
} from './scoring';

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
  experience: [{
    id: 'e1', company: 'TechCorp', location: 'Accra', date: '2024-2025',
    role: 'Software Engineering Intern',
    bullets: [
      'Led the migration of 3 services to TypeScript, improving build reliability.',
      'Reduced API response time by 40% through query optimization.',
      'Mentored 2 junior developers on code review best practices.',
    ],
  }],
  projects: [
    {
      id: 'p1', organization: 'Personal', date: '2024', projectName: 'Career Platform',
      role: 'Developer', bullets: ['Built a career platform serving 1,000 users.'],
    },
    {
      id: 'p2', organization: 'Hackathon', date: '2023', projectName: 'Finance Dashboard',
      role: 'Team Lead', bullets: ['Implemented analytics for a team of 4 in 48 hours.'],
    },
  ],
  achievements: [{ id: 'a1', title: 'Cloud Practitioner Certification', organization: 'Amazon', date: '2024' }],
  activities: [],
  references: 'Available upon request',
};

describe('CV completion', () => {
  it('returns exactly 0% for a completely empty CV and the exported initial template', () => {
    expect(computeCVCompletion(EMPTY_CV).percentage).toBe(0);
    expect(computeCVCompletion(initialCVData).percentage).toBe(0);
    expect(computeFullScore(EMPTY_CV).completion.percentage).toBe(0);
  });

  it('does not count whitespace, placeholders, empty rows, ids, or default metadata', () => {
    const templateOnly: CVData = {
      ...EMPTY_CV,
      personal: {
        ...EMPTY_CV.personal,
        firstName: '   ',
        lastName: 'Enter your name',
        email: 'your email here',
      },
      education: { ...EMPTY_CV.education, university: 'TBD' },
      experience: [{ id: 'generated-id', company: '', location: '', date: '', role: '', bullets: ['placeholder'] }],
      projects: [{ id: 'project-id', organization: '', date: '', projectName: 'Lorem ipsum', role: '', bullets: [] }],
      activities: [{ id: 'activity-id', organization: '', activity: '', date: '', role: '', bullets: ['  '] }],
      achievements: [{ id: 'achievement-id', title: '', organization: '', date: '' }],
      skills: [' ', 'TBD', 'placeholder'],
      references: 'Available upon request',
    };
    expect(computeCVCompletion(templateOnly).percentage).toBe(0);
    expect(computeFullScore(templateOnly).totalScore).toBe(0);
  });

  it('increases by the documented contribution when meaningful fields are added', () => {
    const firstName = {
      ...EMPTY_CV,
      personal: { ...EMPTY_CV.personal, firstName: 'Ama' },
    };
    expect(computeCVCompletion(firstName).percentage).toBe(5);

    const identity = {
      ...firstName,
      personal: {
        ...firstName.personal,
        lastName: 'Mensah', email: 'ama@example.com', phone: '+233201234567',
      },
    };
    const result = computeCVCompletion(identity);
    expect(result.percentage).toBe(20);
    expect(result.sections.find((section) => section.id === 'personal')).toMatchObject({
      score: 20,
      max: 20,
      complete: true,
    });
  });

  it('shows exactly which five meaningful sections contribute', () => {
    const result = computeCVCompletion(FULL_CV);
    expect(result.percentage).toBe(100);
    expect(result.sections.map((section) => section.id)).toEqual([
      'personal', 'education', 'experience', 'skills', 'additional',
    ]);
    expect(result.sections.every((section) => section.score === 20)).toBe(true);
  });

  it('is deterministic', () => {
    expect(computeCVCompletion(FULL_CV)).toEqual(computeCVCompletion(FULL_CV));
  });
});

describe('CV quality is separate from completion', () => {
  it('does not turn a bare identity field into writing quality credit', () => {
    const nameOnly: CVData = {
      ...EMPTY_CV,
      personal: { ...EMPTY_CV.personal, firstName: 'Ama' },
    };
    const result = computeFullScore(nameOnly);
    expect(result.completion.percentage).toBe(5);
    expect(result.totalScore).toBe(0);
  });

  it('returns 0 quality for empty content and 100 for the representative strong fixture', () => {
    expect(computeFullScore(EMPTY_CV).totalScore).toBe(0);
    const strong = computeFullScore(FULL_CV);
    expect(strong.totalScore).toBe(100);
    expect(strong.label).toBe('Excellent');
    expect(strong.breakdown).toMatchObject({
      contentQuality: { score: 30, max: 30 },
      skillsCoverage: { score: 20, max: 20 },
      presentation: { score: 20, max: 20 },
      evidence: { score: 30, max: 30 },
    });
  });

  it('is finite, bounded, and deterministic', () => {
    const first = computeFullScore(FULL_CV);
    const second = computeFullScore(FULL_CV);
    expect(first).toEqual(second);
    expect(Number.isFinite(first.totalScore)).toBe(true);
    expect(first.totalScore).toBeGreaterThanOrEqual(0);
    expect(first.totalScore).toBeLessThanOrEqual(100);
  });
});

describe('meaningful-content helpers', () => {
  it('treats empty, whitespace, and explicit placeholder instructions as absent', () => {
    expect(isMeaningfulText(undefined)).toBe(false);
    expect(isMeaningfulText(null)).toBe(false);
    expect(isMeaningfulText('')).toBe(false);
    expect(isMeaningfulText('   ')).toBe(false);
    expect(isMeaningfulText('lorem ipsum')).toBe(false);
    expect(isMeaningfulText('enter your name')).toBe(false);
    expect(isMeaningfulText('tbd')).toBe(false);
    expect(isMeaningfulText('Real content')).toBe(true);
  });

  it('does not count generated ids or empty entry structures', () => {
    expect(isExperienceMeaningful({ id: '1', company: '', location: ' ', date: '', role: '', bullets: [''] })).toBe(false);
    expect(isProjectMeaningful({ id: '1', organization: '', date: '', projectName: '', role: '', bullets: [] })).toBe(false);
    expect(isActivityMeaningful({ id: '1', organization: '', activity: '', date: '', role: '', bullets: ['   '] })).toBe(false);
    expect(isAchievementMeaningful({ id: '1', title: '', organization: '', date: '' })).toBe(false);
  });

  it('filters placeholder and whitespace skills', () => {
    expect(getMeaningfulSkills({ ...EMPTY_CV, skills: ['   ', 'lorem ipsum', 'Python'] })).toEqual(['Python']);
  });
});
