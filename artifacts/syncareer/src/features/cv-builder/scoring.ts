import type { CVData } from './types';
import { ACTION_VERBS, PLACEHOLDER_PATTERNS } from './constants';

// ── Meaningful-content helpers ───────────────────────────────────
//
// These helpers are the single definition of user content for both completion
// and quality. Structural defaults, generated ids, empty entries, section
// labels, template metadata, and placeholder instructions never earn credit.

/** True when `value` is non-empty, non-whitespace, non-placeholder text. */
export function isMeaningfulText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return !hasPlaceholder(trimmed);
}

function meaningfulBullets(bullets: string[]): string[] {
  return bullets.filter(isMeaningfulText);
}

function hasMeaningfulBullets(bullets: string[]): boolean {
  return meaningfulBullets(bullets).length > 0;
}

type Experience = CVData['experience'][number];
type Project = CVData['projects'][number];
type Activity = CVData['activities'][number];
type Achievement = CVData['achievements'][number];

export function isExperienceMeaningful(entry: Experience): boolean {
  return isMeaningfulText(entry.company) || isMeaningfulText(entry.role)
    || isMeaningfulText(entry.location) || isMeaningfulText(entry.date)
    || hasMeaningfulBullets(entry.bullets);
}

export function isProjectMeaningful(entry: Project): boolean {
  return isMeaningfulText(entry.projectName) || isMeaningfulText(entry.organization)
    || isMeaningfulText(entry.role) || isMeaningfulText(entry.date)
    || hasMeaningfulBullets(entry.bullets);
}

export function isActivityMeaningful(entry: Activity): boolean {
  return isMeaningfulText(entry.activity) || isMeaningfulText(entry.organization)
    || isMeaningfulText(entry.role) || isMeaningfulText(entry.date)
    || hasMeaningfulBullets(entry.bullets);
}

export function isAchievementMeaningful(entry: Achievement): boolean {
  return isMeaningfulText(entry.title) || isMeaningfulText(entry.organization)
    || isMeaningfulText(entry.date);
}

export function getMeaningfulSkills(cv: CVData): string[] {
  return cv.skills.filter(isMeaningfulText);
}

export function getAllBullets(cv: CVData): string[] {
  return [
    ...cv.experience.flatMap((entry) => entry.bullets),
    ...cv.projects.flatMap((entry) => entry.bullets),
    ...cv.activities.flatMap((entry) => entry.bullets),
  ].filter(isMeaningfulText);
}

export function hasPlaceholder(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text));
}

export function countActionVerbs(bullets: string[]): number {
  return bullets.filter((bullet) => {
    const firstWord = bullet.trim().split(/\s+/)[0]?.toLowerCase() || '';
    return (ACTION_VERBS as readonly string[]).includes(firstWord);
  }).length;
}

export function countQuantifiable(bullets: string[]): number {
  return bullets.filter((bullet) => /\d+/.test(bullet)).length;
}

function hasSubstantiveContent(cv: CVData): boolean {
  return getAllBullets(cv).length > 0
    || getMeaningfulSkills(cv).length > 0
    || isMeaningfulText(cv.education.university)
    || isMeaningfulText(cv.education.degree)
    || isMeaningfulText(cv.education.graduationDate)
    || cv.experience.some(isExperienceMeaningful)
    || cv.projects.some(isProjectMeaningful)
    || cv.activities.some(isActivityMeaningful)
    || cv.achievements.some(isAchievementMeaningful);
}

// ── Completion ───────────────────────────────────────────────────
//
// Completion answers only “how much meaningful CV information is present?”.
// It does not assess writing quality or predict an ATS outcome. Five sections
// contribute 20 points each. Partial fields receive their documented points.

export type CompletionSectionId =
  | 'personal'
  | 'education'
  | 'experience'
  | 'skills'
  | 'additional';

export interface CompletionSection {
  id: CompletionSectionId;
  label: string;
  score: number;
  max: 20;
  complete: boolean;
  requirement: string;
}

export interface CVCompletionResult {
  percentage: number;
  earned: number;
  max: 100;
  sections: CompletionSection[];
}

function bestScore<T>(items: T[], score: (item: T) => number): number {
  return items.reduce((best, item) => Math.max(best, score(item)), 0);
}

export function computeCVCompletion(cv: CVData): CVCompletionResult {
  const personal = [
    cv.personal.firstName,
    cv.personal.lastName,
    cv.personal.email,
    cv.personal.phone,
  ].reduce((score, value) => score + (isMeaningfulText(value) ? 5 : 0), 0);

  const education =
    (isMeaningfulText(cv.education.university) ? 7 : 0)
    + (isMeaningfulText(cv.education.degree) ? 7 : 0)
    + (isMeaningfulText(cv.education.graduationDate) ? 6 : 0);

  const experience = bestScore(cv.experience, (entry) =>
    (isMeaningfulText(entry.company) ? 5 : 0)
    + (isMeaningfulText(entry.role) ? 5 : 0)
    + (isMeaningfulText(entry.date) ? 4 : 0)
    + (hasMeaningfulBullets(entry.bullets) ? 6 : 0));

  const skills = Math.min(4, getMeaningfulSkills(cv).length) * 5;

  const projectScore = bestScore(cv.projects, (entry) =>
    (isMeaningfulText(entry.projectName) ? 7 : 0)
    + (isMeaningfulText(entry.organization) || isMeaningfulText(entry.role) ? 5 : 0)
    + (isMeaningfulText(entry.date) ? 3 : 0)
    + (hasMeaningfulBullets(entry.bullets) ? 5 : 0));
  const achievementScore = bestScore(cv.achievements, (entry) =>
    (isMeaningfulText(entry.title) ? 8 : 0)
    + (isMeaningfulText(entry.organization) ? 6 : 0)
    + (isMeaningfulText(entry.date) ? 6 : 0));
  const activityScore = bestScore(cv.activities, (entry) =>
    (isMeaningfulText(entry.activity) ? 7 : 0)
    + (isMeaningfulText(entry.organization) || isMeaningfulText(entry.role) ? 5 : 0)
    + (isMeaningfulText(entry.date) ? 3 : 0)
    + (hasMeaningfulBullets(entry.bullets) ? 5 : 0));
  const additional = Math.max(projectScore, achievementScore, activityScore);

  const sections: CompletionSection[] = [
    {
      id: 'personal',
      label: 'Personal details',
      score: personal,
      max: 20,
      complete: personal === 20,
      requirement: 'First name, last name, email and phone',
    },
    {
      id: 'education',
      label: 'Education',
      score: education,
      max: 20,
      complete: education === 20,
      requirement: 'Institution, degree and graduation date',
    },
    {
      id: 'experience',
      label: 'Experience',
      score: experience,
      max: 20,
      complete: experience === 20,
      requirement: 'Employer, role, dates and one contribution',
    },
    {
      id: 'skills',
      label: 'Skills',
      score: skills,
      max: 20,
      complete: skills === 20,
      requirement: 'Four meaningful skills',
    },
    {
      id: 'additional',
      label: 'Projects or achievements',
      score: additional,
      max: 20,
      complete: additional === 20,
      requirement: 'One well-described project, achievement or activity',
    },
  ];

  const earned = sections.reduce((sum, section) => sum + section.score, 0);
  return {
    percentage: Math.min(100, Math.max(0, earned)),
    earned,
    max: 100,
    sections,
  };
}

// ── Quality ──────────────────────────────────────────────────────
//
// Quality is deliberately separate from completion. It assesses deterministic
// writing/evidence patterns in content that exists; it never claims that a CV
// will pass an applicant tracking system.

export interface ScoreDetail {
  score: number;
  max: number;
}

export interface ScoreCategory {
  score: number;
  max: number;
  details: Record<string, ScoreDetail>;
}

export interface ScoreBreakdown {
  contentQuality: ScoreCategory;
  skillsCoverage: ScoreCategory;
  presentation: ScoreCategory;
  evidence: ScoreCategory;
}

export const MAX_SCORES = {
  contentQuality: 30,
  skillsCoverage: 20,
  presentation: 20,
  evidence: 30,
} as const;

export function scoreContentQuality(cv: CVData): ScoreCategory {
  const details: Record<string, ScoreDetail> = {};
  const bullets = getAllBullets(cv);

  const longBullets = bullets.filter((bullet) => bullet.length > 200).length;
  details.bulletFormat = {
    score: bullets.length > 0 && longBullets === 0 ? 6 : bullets.length > 0 ? 3 : 0,
    max: 6,
  };

  const actionRatio = bullets.length > 0 ? countActionVerbs(bullets) / bullets.length : 0;
  details.actionVerbs = {
    score: actionRatio >= 0.5 ? 7 : actionRatio >= 0.25 ? 4 : bullets.length > 0 ? 1 : 0,
    max: 7,
  };

  const quantifiable = countQuantifiable(bullets);
  const quantifiableRatio = bullets.length > 0 ? quantifiable / bullets.length : 0;
  details.quantifiable = {
    score: quantifiableRatio >= 0.3 ? 7 : quantifiableRatio >= 0.15 ? 4 : quantifiable >= 1 ? 2 : 0,
    max: 7,
  };

  const visibleText = [
    ...Object.values(cv.personal),
    ...Object.values(cv.education),
    ...cv.experience.flatMap((entry) => [entry.company, entry.location, entry.date, entry.role, ...entry.bullets]),
    ...cv.projects.flatMap((entry) => [entry.organization, entry.date, entry.projectName, entry.role, ...entry.bullets]),
    ...cv.activities.flatMap((entry) => [entry.organization, entry.activity, entry.date, entry.role, ...entry.bullets]),
    ...cv.achievements.flatMap((entry) => [entry.title, entry.organization, entry.date]),
    ...cv.skills,
  ].join(' ');
  details.noPlaceholder = {
    score: hasSubstantiveContent(cv) && !hasPlaceholder(visibleText) ? 5 : 0,
    max: 5,
  };

  const hasNarrativeSection = cv.experience.some(isExperienceMeaningful)
    || cv.projects.some(isProjectMeaningful)
    || cv.activities.some(isActivityMeaningful);
  details.sectionContent = {
    score: hasNarrativeSection && getMeaningfulSkills(cv).length > 0 ? 5 : hasNarrativeSection ? 3 : 0,
    max: 5,
  };

  return {
    score: Object.values(details).reduce((sum, detail) => sum + detail.score, 0),
    max: MAX_SCORES.contentQuality,
    details,
  };
}

export function scoreSkillsCoverage(cv: CVData): ScoreCategory {
  const details: Record<string, ScoreDetail> = {};
  const count = getMeaningfulSkills(cv).length;
  details.skillCount = {
    score: count >= 8 ? 10 : count >= 5 ? 7 : count >= 3 ? 4 : count >= 1 ? 2 : 0,
    max: 10,
  };
  details.skillBreadth = {
    score: count >= 6 ? 10 : count >= 4 ? 7 : count >= 2 ? 4 : count >= 1 ? 2 : 0,
    max: 10,
  };
  return {
    score: details.skillCount.score + details.skillBreadth.score,
    max: MAX_SCORES.skillsCoverage,
    details,
  };
}

export function scorePresentation(cv: CVData): ScoreCategory {
  const details: Record<string, ScoreDetail> = {};
  const bullets = getAllBullets(cv);
  const suspectBullets = bullets.filter(
    (bullet) => /(.)\1{4,}/.test(bullet) || (bullet.trim().length > 0 && bullet.trim().length < 5),
  );
  details.textHygiene = {
    score: bullets.length === 0 ? 0 : suspectBullets.length === 0 ? 6 : 3,
    max: 6,
  };

  const hasHeader = isMeaningfulText(cv.personal.firstName)
    && isMeaningfulText(cv.education.university);
  details.sectionStructure = {
    score: hasHeader ? 7 : hasSubstantiveContent(cv) ? 3 : 0,
    max: 7,
  };

  const experiences = cv.experience.filter(isExperienceMeaningful);
  const consistent = experiences.every((entry) => meaningfulBullets(entry.bullets).length <= 6);
  details.layout = {
    score: experiences.length === 0 ? 0 : consistent ? 7 : 4,
    max: 7,
  };

  return {
    score: Object.values(details).reduce((sum, detail) => sum + detail.score, 0),
    max: MAX_SCORES.presentation,
    details,
  };
}

export function scoreEvidence(cv: CVData): ScoreCategory {
  const details: Record<string, ScoreDetail> = {};
  const allText = getAllBullets(cv).join(' ').toLowerCase();
  const leadershipKeywords = [
    'led', 'managed', 'supervised', 'mentored', 'president', 'captain', 'head',
    'director', 'founder', 'co-founder', 'leader', 'chair',
  ];
  const hasLeadership = leadershipKeywords.some((keyword) => allText.includes(keyword))
    || cv.experience.some((entry) => isExperienceMeaningful(entry) && /lead|manager|director|head|president/i.test(entry.role))
    || cv.activities.some((entry) => isActivityMeaningful(entry) && /lead|president|captain|head|chair/i.test(entry.role));
  details.leadership = { score: hasLeadership ? 10 : 0, max: 10 };

  const experiences = cv.experience.filter(isExperienceMeaningful);
  const hasInternship = experiences.some((entry) => /intern/i.test(entry.role) || /intern/i.test(entry.company));
  details.practicalExperience = {
    score: hasInternship || experiences.length >= 2 ? 10 : experiences.length >= 1 ? 6 : 0,
    max: 10,
  };

  const hasAdditionalEvidence = cv.achievements.some(isAchievementMeaningful)
    || cv.projects.some(isProjectMeaningful)
    || /certif|course|award/i.test(allText);
  details.additionalEvidence = { score: hasAdditionalEvidence ? 10 : 0, max: 10 };

  return {
    score: Object.values(details).reduce((sum, detail) => sum + detail.score, 0),
    max: MAX_SCORES.evidence,
    details,
  };
}

export function getScoreLabel(score: number): 'Weak' | 'Developing' | 'Strong' | 'Excellent' {
  if (score <= 40) return 'Weak';
  if (score <= 65) return 'Developing';
  if (score <= 85) return 'Strong';
  return 'Excellent';
}

export function generateStrengths(breakdown: ScoreBreakdown, cv: CVData): string[] {
  const strengths: string[] = [];
  if (breakdown.contentQuality.details.actionVerbs?.score === 7)
    strengths.push('Effective use of action verbs in bullet points.');
  if (breakdown.contentQuality.details.quantifiable?.score === 7)
    strengths.push('Strong use of measurable achievements.');
  if (breakdown.evidence.details.leadership?.score === 10)
    strengths.push('Clear leadership evidence.');
  if (getMeaningfulSkills(cv).length >= 6)
    strengths.push('A broad set of meaningful skills is included.');
  if (breakdown.evidence.details.practicalExperience?.score === 10)
    strengths.push('Solid practical experience is included.');
  if (cv.projects.filter(isProjectMeaningful).length >= 2)
    strengths.push('Multiple projects demonstrate practical initiative.');
  return strengths.slice(0, 3);
}

export function generateSuggestions(
  breakdown: ScoreBreakdown,
  cv: CVData,
  completion: CVCompletionResult,
): string[] {
  const suggestions: string[] = [];
  const section = (id: CompletionSectionId) => completion.sections.find((item) => item.id === id);

  if ((section('experience')?.score ?? 0) === 0)
    suggestions.push('Add a work, internship, volunteer, or other practical experience.');
  if (getMeaningfulSkills(cv).length < 4)
    suggestions.push(`Add ${4 - getMeaningfulSkills(cv).length} more meaningful skill${4 - getMeaningfulSkills(cv).length === 1 ? '' : 's'}.`);
  if ((breakdown.contentQuality.details.quantifiable?.score ?? 0) < 4)
    suggestions.push('Add measurable outcomes, such as numbers or percentages, where they are accurate.');
  if ((breakdown.contentQuality.details.actionVerbs?.score ?? 0) < 4)
    suggestions.push('Start contribution bullets with clear action verbs such as “Led” or “Built”.');
  if ((breakdown.evidence.details.leadership?.score ?? 0) === 0)
    suggestions.push('Include leadership responsibility if it reflects your experience.');
  if ((section('additional')?.score ?? 0) === 0)
    suggestions.push('Add a project, achievement, certification, or activity as supporting evidence.');
  if ((section('personal')?.score ?? 0) < 20)
    suggestions.push('Complete the contact details listed in the completion checklist.');
  return suggestions.slice(0, 3);
}

/** Pure deterministic quality + completion computation. */
export function computeFullScore(cv: CVData) {
  const completion = computeCVCompletion(cv);
  const contentQuality = scoreContentQuality(cv);
  const skillsCoverage = scoreSkillsCoverage(cv);
  const presentation = scorePresentation(cv);
  const evidence = scoreEvidence(cv);
  const breakdown: ScoreBreakdown = {
    contentQuality,
    skillsCoverage,
    presentation,
    evidence,
  };
  const sum = Object.values(breakdown).reduce((total, category) => total + category.score, 0);
  const totalScore = Number.isFinite(sum) ? Math.min(100, Math.max(0, sum)) : 0;

  return {
    totalScore,
    label: getScoreLabel(totalScore),
    completion,
    breakdown,
    strengths: generateStrengths(breakdown, cv),
    suggestions: generateSuggestions(breakdown, cv, completion),
  };
}
