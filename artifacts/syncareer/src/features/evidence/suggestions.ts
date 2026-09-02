import type { CVData } from '@/features/cv-builder/types';
import type { EvidenceCategory } from './types';

/**
 * Deterministic, local candidate suggestions.
 *
 * Suggestions are generated from material the student already owns (CV
 * entries and completed interview answers). They are read-only candidates:
 * nothing here writes to the database, backfills history, or confirms
 * anything. A suggestion becomes evidence only after the student reviews it
 * and explicitly saves it through the evidence API.
 */

export interface EvidenceSuggestion {
  /** Stable identifier derived from the source entry, e.g. `cv:<entryId>`. */
  id: string;
  category: EvidenceCategory;
  title: string;
  summary: string;
  /** Where the suggestion came from, shown as its source label. */
  originLabel: string;
}

const SUMMARY_MAX = 1200;
const TITLE_MAX = 120;

function truncate(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function bulletSummary(bullets: string[]): string {
  return truncate(
    bullets.map((bullet) => bullet.trim()).filter(Boolean).join('. '),
    SUMMARY_MAX,
  );
}

function entryTitle(role: string, organisation: string, fallback: string): string {
  const compactRole = role.trim();
  const compactOrg = organisation.trim();
  if (compactRole && compactOrg) return truncate(`${compactRole} — ${compactOrg}`, TITLE_MAX);
  return truncate(compactRole || compactOrg || fallback, TITLE_MAX);
}

/** Map the student's structured CV entries onto candidate evidence. */
export function suggestionsFromCv(cv: CVData): EvidenceSuggestion[] {
  const suggestions: EvidenceSuggestion[] = [];

  for (const entry of cv.experience) {
    const summary = bulletSummary(entry.bullets);
    if (!summary) continue;
    suggestions.push({
      id: `cv:experience:${entry.id}`,
      category: 'work',
      title: entryTitle(entry.role, entry.company, 'Work experience'),
      summary,
      originLabel: `CV work experience${entry.company ? ` · ${entry.company.trim()}` : ''}`,
    });
  }

  for (const entry of cv.projects) {
    const summary = bulletSummary(entry.bullets);
    if (!summary) continue;
    suggestions.push({
      id: `cv:projects:${entry.id}`,
      category: 'project',
      title: entryTitle(entry.projectName, entry.organization, 'Project'),
      summary,
      originLabel: `CV project${entry.organization ? ` · ${entry.organization.trim()}` : ''}`,
    });
  }

  for (const entry of cv.achievements) {
    const title = entry.title.trim();
    if (!title) continue;
    const parts = [entry.organization.trim(), entry.date.trim()].filter(Boolean);
    suggestions.push({
      id: `cv:achievements:${entry.id}`,
      category: 'achievement',
      title: truncate(title, TITLE_MAX),
      summary: truncate(parts.length ? `${title}. ${parts.join(' · ')}` : title, SUMMARY_MAX),
      originLabel: 'CV achievement',
    });
  }

  for (const entry of cv.activities) {
    const summary = bulletSummary(entry.bullets);
    const activity = entry.activity.trim();
    if (!summary && !activity) continue;
    suggestions.push({
      id: `cv:activities:${entry.id}`,
      // Co-curricular activity rows do not state their own category; keep
      // them in the neutral bucket rather than guessing leadership or
      // volunteering on the student's behalf.
      category: 'other',
      title: entryTitle(activity, entry.organization, 'Co-curricular activity'),
      summary: summary || truncate(activity, SUMMARY_MAX),
      originLabel: `CV activity${entry.organization ? ` · ${entry.organization.trim()}` : ''}`,
    });
  }

  return suggestions;
}

interface InterviewAnswerPair {
  question?: unknown;
  answer?: unknown;
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Map completed interview answers onto candidate evidence. The stored
 * answers column is JSON with a shape that has varied across sessions, so
 * this tolerantly skips anything that is not a question/answer pair with
 * substantive content.
 */
export function suggestionsFromInterviewAnswers(answers: unknown, role: string): EvidenceSuggestion[] {
  if (!Array.isArray(answers)) return [];
  const suggestions: EvidenceSuggestion[] = [];
  const roleLabel = role.trim() || 'Interview practice';

  answers.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') return;
    const pair = entry as InterviewAnswerPair;
    const question = asText(pair.question);
    const answer = asText(pair.answer);
    if (!question || !answer) return;
    suggestions.push({
      id: `interview:${index}:${question.slice(0, 40)}`,
      category: 'other',
      title: truncate(question, TITLE_MAX),
      summary: truncate(answer, SUMMARY_MAX),
      originLabel: `Interview answer · ${roleLabel}`,
    });
  });

  return suggestions;
}
