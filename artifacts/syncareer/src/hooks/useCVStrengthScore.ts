import { useMemo } from 'react';
import type { CVData } from '@/pages/CVBuilder';

const ACTION_VERBS = [
  'led', 'managed', 'developed', 'created', 'designed', 'implemented', 'built',
  'organized', 'analyzed', 'improved', 'increased', 'reduced', 'achieved',
  'launched', 'coordinated', 'negotiated', 'delivered', 'spearheaded',
  'mentored', 'optimized', 'initiated', 'established', 'facilitated',
  'generated', 'streamlined', 'collaborated', 'executed', 'transformed',
  'pioneered', 'resolved', 'supervised', 'trained', 'presented',
];

const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i, /placeholder/i, /xxx/i, /tbd/i,
  /enter your/i, /your .* here/i,
];

interface ScoreBreakdown {
  completeness: { score: number; max: 25; details: Record<string, { score: number; max: number }> };
  contentQuality: { score: number; max: 25; details: Record<string, { score: number; max: number }> };
  skillsRelevance: { score: number; max: 20; details: Record<string, { score: number; max: number }> };
  presentation: { score: number; max: 15; details: Record<string, { score: number; max: number }> };
  competitiveness: { score: number; max: 15; details: Record<string, { score: number; max: number }> };
}

export interface CVStrengthResult {
  totalScore: number;
  label: 'Weak' | 'Developing' | 'Strong' | 'Excellent';
  breakdown: ScoreBreakdown;
  strengths: string[];
  suggestions: string[];
}

function getAllBullets(cv: CVData): string[] {
  const bullets: string[] = [];
  cv.experience.forEach(e => bullets.push(...e.bullets));
  cv.projects.forEach(p => bullets.push(...p.bullets));
  cv.activities.forEach(a => bullets.push(...a.bullets));
  return bullets.filter(b => b.trim().length > 0);
}

function hasPlaceholder(text: string): boolean {
  return PLACEHOLDER_PATTERNS.some(p => p.test(text));
}

function countActionVerbs(bullets: string[]): number {
  return bullets.filter(b => {
    const firstWord = b.trim().split(/\s+/)[0]?.toLowerCase() || '';
    return ACTION_VERBS.includes(firstWord);
  }).length;
}

function countQuantifiable(bullets: string[]): number {
  return bullets.filter(b => /\d+/.test(b)).length;
}

function scoreCompleteness(cv: CVData) {
  const details: Record<string, { score: number; max: number }> = {};

  const personalFilled = [cv.personal.firstName, cv.personal.lastName, cv.personal.email, cv.personal.phone].filter(Boolean).length;
  details.personalDetails = { score: personalFilled >= 3 ? 5 : Math.round((personalFilled / 3) * 5), max: 5 };

  const eduFilled = [cv.education.university, cv.education.degree, cv.education.graduationDate].filter(Boolean).length;
  details.education = { score: eduFilled >= 2 ? 5 : Math.round((eduFilled / 2) * 5), max: 5 };

  details.experience = { score: cv.experience.length >= 1 ? 5 : 0, max: 5 };
  details.skills = { score: cv.skills.length >= 1 ? 5 : 0, max: 5 };
  details.projectsCerts = { score: (cv.projects.length >= 1 || cv.achievements.length >= 1) ? 5 : 0, max: 5 };

  const score = Object.values(details).reduce((s, d) => s + d.score, 0);
  return { score, max: 25 as const, details };
}

function scoreContentQuality(cv: CVData) {
  const details: Record<string, { score: number; max: number }> = {};
  const bullets = getAllBullets(cv);

  const longBullets = bullets.filter(b => b.length > 200).length;
  details.bulletFormat = { score: bullets.length > 0 && longBullets === 0 ? 5 : bullets.length > 0 ? 3 : 0, max: 5 };

  const actionCount = countActionVerbs(bullets);
  const actionRatio = bullets.length > 0 ? actionCount / bullets.length : 0;
  details.actionVerbs = { score: actionRatio >= 0.5 ? 5 : actionRatio >= 0.25 ? 3 : bullets.length > 0 ? 1 : 0, max: 5 };

  const quantCount = countQuantifiable(bullets);
  const quantRatio = bullets.length > 0 ? quantCount / bullets.length : 0;
  details.quantifiable = { score: quantRatio >= 0.3 ? 5 : quantRatio >= 0.15 ? 3 : quantCount >= 1 ? 1 : 0, max: 5 };

  const allText = [cv.personal.firstName, cv.personal.lastName, ...bullets, ...cv.skills].join(' ');
  details.noPlaceholder = { score: hasPlaceholder(allText) ? 0 : 5, max: 5 };

  const hasSections = cv.experience.length > 0 || cv.projects.length > 0 || cv.activities.length > 0;
  details.formatting = { score: hasSections && cv.skills.length > 0 ? 5 : hasSections ? 3 : 0, max: 5 };

  const score = Object.values(details).reduce((s, d) => s + d.score, 0);
  return { score, max: 25 as const, details };
}

function scoreSkillsRelevance(cv: CVData) {
  const details: Record<string, { score: number; max: number }> = {};

  // Skill count: full 10 pts at 8+ skills
  const skillCountScore = cv.skills.length >= 8 ? 10
    : cv.skills.length >= 5 ? 7
    : cv.skills.length >= 3 ? 4
    : cv.skills.length >= 1 ? 2 : 0;
  details.skillCount = { score: skillCountScore, max: 10 };

  // Career alignment: score based on variety and depth of skills listed
  const skillCoverageScore = cv.skills.length >= 6 ? 10
    : cv.skills.length >= 4 ? 7
    : cv.skills.length >= 2 ? 4
    : cv.skills.length >= 1 ? 2 : 0;
  details.careerAlignment = { score: skillCoverageScore, max: 10 };

  const score = details.skillCount.score + details.careerAlignment.score;
  return { score, max: 20 as const, details };
}

function scorePresentation(cv: CVData) {
  const details: Record<string, { score: number; max: number }> = {};
  const bullets = getAllBullets(cv);

  const suspectBullets = bullets.filter(b => /(.)\1{4,}/.test(b) || (b.trim().length > 0 && b.trim().length < 5));
  details.spelling = { score: suspectBullets.length === 0 ? 5 : 3, max: 5 };

  const hasBasics = cv.personal.firstName && cv.education.university;
  details.sectionOrder = { score: hasBasics ? 5 : 2, max: 5 };

  const hasConsistentBullets = cv.experience.every(e => e.bullets.length <= 6);
  details.layout = { score: hasConsistentBullets ? 5 : 3, max: 5 };

  const score = Object.values(details).reduce((s, d) => s + d.score, 0);
  return { score, max: 15 as const, details };
}

function scoreCompetitiveness(cv: CVData) {
  const details: Record<string, { score: number; max: number }> = {};
  const allBullets = getAllBullets(cv);
  const allText = allBullets.join(' ').toLowerCase();

  const leadershipKeywords = ['led', 'managed', 'supervised', 'mentored', 'president', 'captain', 'head', 'director', 'founder', 'co-founder', 'leader', 'chair'];
  const hasLeadership = leadershipKeywords.some(k => allText.includes(k)) ||
    cv.experience.some(e => /lead|manager|director|head|president/i.test(e.role)) ||
    cv.activities.some(a => /lead|president|captain|head|chair/i.test(a.role));
  details.leadership = { score: hasLeadership ? 5 : 0, max: 5 };

  const hasInternship = cv.experience.some(e =>
    /intern/i.test(e.role) || /intern/i.test(e.company)
  ) || cv.experience.length >= 2;
  details.practicalExp = { score: hasInternship ? 5 : cv.experience.length >= 1 ? 3 : 0, max: 5 };

  const hasCerts = cv.achievements.length >= 1 || /certif|course|award/i.test(allText);
  details.certifications = { score: hasCerts ? 5 : 0, max: 5 };

  const score = Object.values(details).reduce((s, d) => s + d.score, 0);
  return { score, max: 15 as const, details };
}

function getLabel(score: number): CVStrengthResult['label'] {
  if (score <= 40) return 'Weak';
  if (score <= 65) return 'Developing';
  if (score <= 85) return 'Strong';
  return 'Excellent';
}

function generateStrengths(breakdown: ScoreBreakdown, cv: CVData): string[] {
  const strengths: string[] = [];

  if (breakdown.completeness.score >= 20)
    strengths.push('Well-structured with all key sections filled.');
  if (breakdown.contentQuality.details.actionVerbs?.score >= 4)
    strengths.push('Effective use of action verbs in bullet points.');
  if (breakdown.contentQuality.details.quantifiable?.score >= 4)
    strengths.push('Strong use of quantifiable achievements.');
  if (breakdown.competitiveness.details.leadership?.score >= 5)
    strengths.push('Clear demonstration of leadership experience.');
  if (cv.skills.length >= 6)
    strengths.push('Comprehensive skills section with good coverage.');
  if (breakdown.competitiveness.details.practicalExp?.score >= 5)
    strengths.push('Solid practical work experience included.');
  if (cv.projects.length >= 2)
    strengths.push('Portfolio of projects demonstrates initiative.');

  return strengths.slice(0, 3);
}

function generateSuggestions(breakdown: ScoreBreakdown, cv: CVData): string[] {
  const suggestions: string[] = [];

  if (breakdown.completeness.details.experience?.score === 0)
    suggestions.push('Add at least one work or internship experience.');
  if (cv.skills.length < 5)
    suggestions.push(`Add ${5 - cv.skills.length} more skills to strengthen your profile.`);
  if (breakdown.contentQuality.details.quantifiable?.score < 3)
    suggestions.push('Add measurable achievements (numbers, percentages) to your bullet points.');
  if (breakdown.contentQuality.details.actionVerbs?.score < 3)
    suggestions.push('Start bullet points with strong action verbs like "Led", "Developed", or "Implemented".');
  if (breakdown.competitiveness.details.leadership?.score === 0)
    suggestions.push('Include at least one leadership role or responsibility.');
  if (breakdown.competitiveness.details.certifications?.score === 0)
    suggestions.push('Add certifications, awards, or relevant online courses.');
  if (cv.projects.length === 0)
    suggestions.push('Include projects to showcase your practical abilities.');
  if (breakdown.completeness.details.personalDetails?.score < 5)
    suggestions.push('Complete all personal details for a professional impression.');
  if (breakdown.skillsRelevance.details.careerAlignment?.score < 5)
    suggestions.push('Align your skills section with your chosen career path.');

  return suggestions.slice(0, 3);
}

export function useCVStrengthScore(cvData: CVData): CVStrengthResult {
  return useMemo(() => {
    const completeness = scoreCompleteness(cvData);
    const contentQuality = scoreContentQuality(cvData);
    const skillsRelevance = scoreSkillsRelevance(cvData);
    const presentation = scorePresentation(cvData);
    const competitiveness = scoreCompetitiveness(cvData);

    const breakdown: ScoreBreakdown = {
      completeness,
      contentQuality,
      skillsRelevance,
      presentation,
      competitiveness,
    };

    const totalScore = Math.min(100, completeness.score + contentQuality.score + skillsRelevance.score + presentation.score + competitiveness.score);
    const label = getLabel(totalScore);
    const strengths = generateStrengths(breakdown, cvData);
    const suggestions = generateSuggestions(breakdown, cvData);

    return { totalScore, label, breakdown, strengths, suggestions };
  }, [cvData]);
}
