import type { CVData } from './types';
import { ACTION_VERBS, PLACEHOLDER_PATTERNS } from './constants';

// ── Meaningful-content helpers ───────────────────────────────────
//
// Scoring must reward real, user-entered content — never the mere existence
// of a section, an empty entry object, structural defaults, or placeholder
// text. These helpers define the single notion of "meaningful content" used
// by every criterion below, so an entirely untouched CV scores exactly 0.

/** True when `value` is a non-empty, non-whitespace, non-placeholder string. */
export function isMeaningfulText(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  return !hasPlaceholder(trimmed);
}

/** True when at least one bullet in the list is meaningful. */
function hasMeaningfulBullets(bullets: string[]): boolean {
  return bullets.some(isMeaningfulText);
}

type Experience = CVData['experience'][number];
type Project = CVData['projects'][number];
type Activity = CVData['activities'][number];
type Achievement = CVData['achievements'][number];

/**
 * An entry counts only when the user has actually filled something in.
 * An entry object created by an "Add" button (all fields empty) is absent.
 */
export function isExperienceMeaningful(e: Experience): boolean {
  return isMeaningfulText(e.company) || isMeaningfulText(e.role) ||
    isMeaningfulText(e.location) || isMeaningfulText(e.date) || hasMeaningfulBullets(e.bullets);
}

export function isProjectMeaningful(p: Project): boolean {
  return isMeaningfulText(p.projectName) || isMeaningfulText(p.organization) ||
    isMeaningfulText(p.role) || isMeaningfulText(p.date) || hasMeaningfulBullets(p.bullets);
}

export function isActivityMeaningful(a: Activity): boolean {
  return isMeaningfulText(a.activity) || isMeaningfulText(a.organization) ||
    isMeaningfulText(a.role) || isMeaningfulText(a.date) || hasMeaningfulBullets(a.bullets);
}

export function isAchievementMeaningful(a: Achievement): boolean {
  return isMeaningfulText(a.title) || isMeaningfulText(a.organization) || isMeaningfulText(a.date);
}

/** Skills with no real content (whitespace / placeholder) do not count. */
function meaningfulSkills(cv: CVData): string[] {
  return cv.skills.filter(isMeaningfulText);
}

/**
 * True when the CV has real body content beyond bare identity fields — i.e.
 * descriptions, skills, education, or any filled section entry. "Absence of
 * flaw" quality criteria (no-placeholder, section ordering) only earn credit
 * once such substance exists, so a single name field cannot inflate the score.
 */
function hasSubstantiveContent(cv: CVData): boolean {
  return getAllBullets(cv).length > 0
    || meaningfulSkills(cv).length > 0
    || isMeaningfulText(cv.education.university)
    || isMeaningfulText(cv.education.degree)
    || isMeaningfulText(cv.education.graduationDate)
    || cv.experience.some(isExperienceMeaningful)
    || cv.projects.some(isProjectMeaningful)
    || cv.activities.some(isActivityMeaningful)
    || cv.achievements.some(isAchievementMeaningful);
}

// ── Bullet helpers ───────────────────────────────────────────────

export function getAllBullets(cv: CVData): string[] {
  const bullets: string[] = [];
  cv.experience.forEach(e => bullets.push(...e.bullets));
  cv.projects.forEach(p => bullets.push(...p.bullets));
  cv.activities.forEach(a => bullets.push(...a.bullets));
  return bullets.filter(b => b.trim().length > 0);
}

export function hasPlaceholder(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some(p => p.test(text));
}

export function countActionVerbs(bullets: string[]): number {
  return bullets.filter(b => {
    const firstWord = b.trim().split(/\s+/)[0]?.toLowerCase() || '';
    return (ACTION_VERBS as readonly string[]).includes(firstWord);
  }).length;
}

export function countQuantifiable(bullets: string[]): number {
  return bullets.filter(b => /\d+/.test(b)).length;
}

// ── Score breakdowns ─────────────────────────────────────────────
//
// Weights (sum to 100):
//   completeness      25  (5 each: personal details, education, experience, skills, projects/certs)
//   contentQuality    25  (5 each: bullet format, action verbs, quantifiable, no placeholder, formatting)
//   skillsRelevance   20  (skill count 10, career alignment 10)
//   presentation      15  (5 each: spelling, section order, layout)
//   competitiveness   15  (5 each: leadership, practical experience, certifications)
//
// Every criterion earns points only when meaningful content relevant to it
// exists, so absence-of-flaws on an empty CV never yields credit.

export interface ScoreDetail {
  score: number;
  max: number;
}

export interface ScoreBreakdown {
  completeness: { score: number; max: number; details: Record<string, ScoreDetail> };
  contentQuality: { score: number; max: number; details: Record<string, ScoreDetail> };
  skillsRelevance: { score: number; max: number; details: Record<string, ScoreDetail> };
  presentation: { score: number; max: number; details: Record<string, ScoreDetail> };
  competitiveness: { score: number; max: number; details: Record<string, ScoreDetail> };
}

export const MAX_SCORES = {
  completeness: 25,
  contentQuality: 25,
  skillsRelevance: 20,
  presentation: 15,
  competitiveness: 15,
} as const;

export function scoreCompleteness(cv: CVData): ScoreBreakdown['completeness'] {
  const details: Record<string, ScoreDetail> = {};

  const personalFilled = [cv.personal.firstName, cv.personal.lastName, cv.personal.email, cv.personal.phone]
    .filter(isMeaningfulText).length;
  details.personalDetails = { score: personalFilled >= 3 ? 5 : Math.round((personalFilled / 3) * 5), max: 5 };

  const eduFilled = [cv.education.university, cv.education.degree, cv.education.graduationDate]
    .filter(isMeaningfulText).length;
  details.education = { score: eduFilled >= 2 ? 5 : Math.round((eduFilled / 2) * 5), max: 5 };

  const meaningfulExperience = cv.experience.filter(isExperienceMeaningful);
  details.experience = { score: meaningfulExperience.length >= 1 ? 5 : 0, max: 5 };

  const skills = meaningfulSkills(cv);
  details.skills = { score: skills.length >= 1 ? 5 : 0, max: 5 };

  const hasProjects = cv.projects.some(isProjectMeaningful);
  const hasAchievements = cv.achievements.some(isAchievementMeaningful);
  details.projectsCerts = { score: (hasProjects || hasAchievements) ? 5 : 0, max: 5 };

  const score = Object.values(details).reduce((s, d) => s + d.score, 0);
  return { score, max: MAX_SCORES.completeness, details };
}

export function scoreContentQuality(cv: CVData): ScoreBreakdown['contentQuality'] {
  const details: Record<string, ScoreDetail> = {};
  const bullets = getAllBullets(cv);

  const longBullets = bullets.filter(b => b.length > 200).length;
  details.bulletFormat = { score: bullets.length > 0 && longBullets === 0 ? 5 : bullets.length > 0 ? 3 : 0, max: 5 };

  const actionCount = countActionVerbs(bullets);
  const actionRatio = bullets.length > 0 ? actionCount / bullets.length : 0;
  details.actionVerbs = { score: actionRatio >= 0.5 ? 5 : actionRatio >= 0.25 ? 3 : bullets.length > 0 ? 1 : 0, max: 5 };

  const quantCount = countQuantifiable(bullets);
  const quantRatio = bullets.length > 0 ? quantCount / bullets.length : 0;
  details.quantifiable = { score: quantRatio >= 0.3 ? 5 : quantRatio >= 0.15 ? 3 : quantCount >= 1 ? 1 : 0, max: 5 };

  // "No placeholder" is a content-quality check that only applies once the CV
  // has substantive content (descriptions, skills, education, or entries).
  // An empty CV vacuously contains no placeholder and must not earn credit.
  const textValues = [cv.personal.firstName, cv.personal.lastName, ...bullets, ...cv.skills];
  const anyPlaceholder = hasPlaceholder(textValues.join(' '));
  details.noPlaceholder = { score: hasSubstantiveContent(cv) && !anyPlaceholder ? 5 : 0, max: 5 };

  const hasSections = cv.experience.some(isExperienceMeaningful)
    || cv.projects.some(isProjectMeaningful)
    || cv.activities.some(isActivityMeaningful);
  details.formatting = { score: hasSections && meaningfulSkills(cv).length > 0 ? 5 : hasSections ? 3 : 0, max: 5 };

  const score = Object.values(details).reduce((s, d) => s + d.score, 0);
  return { score, max: MAX_SCORES.contentQuality, details };
}

export function scoreSkillsRelevance(cv: CVData): ScoreBreakdown['skillsRelevance'] {
  const details: Record<string, ScoreDetail> = {};
  const n = meaningfulSkills(cv).length;

  const skillCountScore = n >= 8 ? 10
    : n >= 5 ? 7
    : n >= 3 ? 4
    : n >= 1 ? 2 : 0;
  details.skillCount = { score: skillCountScore, max: 10 };

  const skillCoverageScore = n >= 6 ? 10
    : n >= 4 ? 7
    : n >= 2 ? 4
    : n >= 1 ? 2 : 0;
  details.careerAlignment = { score: skillCoverageScore, max: 10 };

  const score = details.skillCount.score + details.careerAlignment.score;
  return { score, max: MAX_SCORES.skillsRelevance, details };
}

export function scorePresentation(cv: CVData): ScoreBreakdown['presentation'] {
  const details: Record<string, ScoreDetail> = {};
  const bullets = getAllBullets(cv);

  const suspectBullets = bullets.filter(b => /(.)\1{4,}/.test(b) || (b.trim().length > 0 && b.trim().length < 5));
  // With no bullets there is nothing to spell-check; do not award credit vacuously.
  details.spelling = { score: bullets.length === 0 ? 0 : suspectBullets.length === 0 ? 5 : 3, max: 5 };

  // Section ordering/structure can only be assessed once there is a real CV
  // body. A bare identity field does not establish structure, so it earns 0.
  const hasHeader = isMeaningfulText(cv.personal.firstName) && isMeaningfulText(cv.education.university);
  const sectionOrderScore = hasHeader ? 5 : hasSubstantiveContent(cv) ? 2 : 0;
  details.sectionOrder = { score: sectionOrderScore, max: 5 };

  const meaningfulExperience = cv.experience.filter(isExperienceMeaningful);
  const hasConsistentBullets = meaningfulExperience.every(e => e.bullets.length <= 6);
  // An empty experience list must not earn consistency credit via Array.every.
  details.layout = { score: meaningfulExperience.length === 0 ? 0 : hasConsistentBullets ? 5 : 3, max: 5 };

  const score = Object.values(details).reduce((s, d) => s + d.score, 0);
  return { score, max: MAX_SCORES.presentation, details };
}

export function scoreCompetitiveness(cv: CVData): ScoreBreakdown['competitiveness'] {
  const details: Record<string, ScoreDetail> = {};
  const allBullets = getAllBullets(cv);
  const allText = allBullets.join(' ').toLowerCase();

  const leadershipKeywords = ['led', 'managed', 'supervised', 'mentored', 'president', 'captain', 'head', 'director', 'founder', 'co-founder', 'leader', 'chair'];
  const hasLeadership = leadershipKeywords.some(k => allText.includes(k)) ||
    cv.experience.some(e => isExperienceMeaningful(e) && /lead|manager|director|head|president/i.test(e.role)) ||
    cv.activities.some(a => isActivityMeaningful(a) && /lead|president|captain|head|chair/i.test(a.role));
  details.leadership = { score: hasLeadership ? 5 : 0, max: 5 };

  const meaningfulExperience = cv.experience.filter(isExperienceMeaningful);
  const hasInternship = meaningfulExperience.some(e =>
    /intern/i.test(e.role) || /intern/i.test(e.company)
  ) || meaningfulExperience.length >= 2;
  details.practicalExp = { score: hasInternship ? 5 : meaningfulExperience.length >= 1 ? 3 : 0, max: 5 };

  const hasCerts = cv.achievements.some(isAchievementMeaningful) || /certif|course|award/i.test(allText);
  details.certifications = { score: hasCerts ? 5 : 0, max: 5 };

  const score = Object.values(details).reduce((s, d) => s + d.score, 0);
  return { score, max: MAX_SCORES.competitiveness, details };
}

// ── Label ────────────────────────────────────────────────────────

export function getScoreLabel(score: number): 'Weak' | 'Developing' | 'Strong' | 'Excellent' {
  if (score <= 40) return 'Weak';
  if (score <= 65) return 'Developing';
  if (score <= 85) return 'Strong';
  return 'Excellent';
}

// ── Strengths / Suggestions ─────────────────────────────────────

export function generateStrengths(breakdown: ScoreBreakdown, cv: CVData): string[] {
  const strengths: string[] = [];

  if (breakdown.completeness.score >= 20)
    strengths.push('Well-structured with all key sections filled.');
  if ((breakdown.contentQuality.details.actionVerbs?.score ?? 0) >= 4)
    strengths.push('Effective use of action verbs in bullet points.');
  if ((breakdown.contentQuality.details.quantifiable?.score ?? 0) >= 4)
    strengths.push('Strong use of quantifiable achievements.');
  if ((breakdown.competitiveness.details.leadership?.score ?? 0) >= 5)
    strengths.push('Clear demonstration of leadership experience.');
  if (cv.skills.length >= 6)
    strengths.push('Comprehensive skills section with good coverage.');
  if ((breakdown.competitiveness.details.practicalExp?.score ?? 0) >= 5)
    strengths.push('Solid practical work experience included.');
  if (cv.projects.length >= 2)
    strengths.push('Multiple projects demonstrate initiative.');

  return strengths.slice(0, 3);
}

export function generateSuggestions(breakdown: ScoreBreakdown, cv: CVData): string[] {
  const suggestions: string[] = [];

  if (breakdown.completeness.details.experience?.score === 0)
    suggestions.push('Add at least one work or internship experience.');
  if (cv.skills.length < 5)
    suggestions.push(`Add ${5 - cv.skills.length} more skills to strengthen your profile.`);
  if ((breakdown.contentQuality.details.quantifiable?.score ?? 0) < 3)
    suggestions.push('Add measurable achievements (numbers, percentages) to your bullet points.');
  if ((breakdown.contentQuality.details.actionVerbs?.score ?? 0) < 3)
    suggestions.push('Start bullet points with strong action verbs like "Led", "Developed", or "Implemented".');
  if (breakdown.competitiveness.details.leadership?.score === 0)
    suggestions.push('Include at least one leadership role or responsibility.');
  if (breakdown.competitiveness.details.certifications?.score === 0)
    suggestions.push('Add certifications, awards, or relevant online courses.');
  if (cv.projects.length === 0)
    suggestions.push('Include projects to showcase your practical abilities.');
  if ((breakdown.completeness.details.personalDetails?.score ?? 0) < 5)
    suggestions.push('Complete all personal details for a professional impression.');
  if ((breakdown.skillsRelevance.details.careerAlignment?.score ?? 0) < 5)
    suggestions.push('Align your skills section with your chosen career path.');

  return suggestions.slice(0, 3);
}

// ── Full score computation (pure, no React) ──────────────────────

export function computeFullScore(cv: CVData) {
  const completeness = scoreCompleteness(cv);
  const contentQuality = scoreContentQuality(cv);
  const skillsRelevance = scoreSkillsRelevance(cv);
  const presentation = scorePresentation(cv);
  const competitiveness = scoreCompetitiveness(cv);

  const breakdown: ScoreBreakdown = {
    completeness,
    contentQuality,
    skillsRelevance,
    presentation,
    competitiveness,
  };

  const sum = completeness.score + contentQuality.score + skillsRelevance.score + presentation.score + competitiveness.score;
  // Deterministic and finite, clamped to the inclusive 0–100 range.
  const totalScore = Number.isFinite(sum) ? Math.min(100, Math.max(0, sum)) : 0;

  return {
    totalScore,
    label: getScoreLabel(totalScore),
    breakdown,
    strengths: generateStrengths(breakdown, cv),
    suggestions: generateSuggestions(breakdown, cv),
  };
}
