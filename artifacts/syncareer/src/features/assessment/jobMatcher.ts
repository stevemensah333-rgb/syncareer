import type { CareerRecommendation } from '@/hooks/useCareerRecommendations';

// ── Tokenization ──────────────────────────────────────────────────

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over',
  'a', 'an', 'of', 'to', 'in', 'on', 'at', 'by', 'or', 'is', 'as',
  'engineer', 'engineering', 'science', 'sciences', 'studies', 'management',
]);

export const tokenize = (s: string): string[] =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

// ── Job match types ───────────────────────────────────────────────

export interface JobCandidate {
  id: string;
  title: string;
  location: string;
  employment_type: string;
  skills: string[] | null;
  description?: string;
  department?: string | null;
}

export interface ScoredJob {
  id: string;
  title: string;
  location: string;
  employment_type: string;
  skills: string[] | null;
  matchReason?: string;
}

// ── Scoring ───────────────────────────────────────────────────────

/**
 * Score a pool of job candidates against the user's top career recommendations
 * and major.  Returns the top N matches.
 */
export function matchJobsAgainstProfile(
  candidates: JobCandidate[],
  recommendations: CareerRecommendation[],
  userMajor: string | null,
  maxResults = 5,
): ScoredJob[] {
  if (recommendations.length === 0) return candidates.slice(0, maxResults);

  const top = recommendations.slice(0, 3);

  // Build match vocabulary from top 3 careers + user major
  const majorTokens = userMajor ? tokenize(userMajor) : [];
  const skillTokens = new Set(
    top.flatMap((r) =>
      (r.career.required_skills || []).flatMap((s) => tokenize(s)),
    ),
  );
  const titleTokens = new Set(top.flatMap((r) => tokenize(r.career.title)));
  const industries = new Set(
    top.map((r) => r.career.industry?.toLowerCase()).filter(Boolean),
  );
  const majorMatches = new Set(
    top.flatMap((r) =>
      (r.career.suggested_majors || []).map((m) => m.toLowerCase()),
    ),
  );

  const scored = candidates.map((job) => {
    const jobTitleTokens = new Set(tokenize(job.title));
    const jobSkillTokens = new Set(
      (job.skills || []).flatMap((s) => tokenize(s)),
    );
    const deptTokens = job.department
      ? new Set(tokenize(job.department))
      : new Set<string>();
    const descTokens = job.description
      ? new Set(tokenize(job.description).slice(0, 60))
      : new Set<string>();

    let score = 0;
    const reasons: string[] = [];

    // Major alignment (strongest signal)
    if (majorTokens.length) {
      const hits = majorTokens.filter(
        (t) =>
          jobTitleTokens.has(t) ||
          jobSkillTokens.has(t) ||
          deptTokens.has(t) ||
          descTokens.has(t),
      );
      if (hits.length) {
        score += hits.length * 6;
        reasons.push(`matches your ${userMajor} background`);
      }
    }

    // Suggested-major overlap
    for (const m of majorMatches) {
      if (
        job.title.toLowerCase().includes(m) ||
        (job.department?.toLowerCase().includes(m) ?? false)
      ) {
        score += 4;
        reasons.push('typical role for this field');
        break;
      }
    }

    // Title token overlap with recommended careers
    let titleHits = 0;
    jobTitleTokens.forEach((t) => {
      if (titleTokens.has(t)) titleHits++;
    });
    if (titleHits) {
      score += titleHits * 3;
      reasons.push(
        `aligned with ${top[0]?.career.title ?? 'your top match'}`,
      );
    }

    // Skill overlap
    let skillHits = 0;
    jobSkillTokens.forEach((t) => {
      if (skillTokens.has(t)) skillHits++;
    });
    if (skillHits) score += skillHits * 2;

    // Industry loose match
    if (
      industries.size &&
      Array.from(industries).some(
        (i) =>
          i &&
          (job.title.toLowerCase().includes(i) ||
            (job.description?.toLowerCase().includes(i) ?? false)),
      )
    ) {
      score += 1;
    }

    return { job, score, reason: reasons[0] };
  });

  const topN = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((s) => ({ ...s.job, matchReason: s.reason }));

  // Fallback: if nothing scored, surface the most recent
  return topN.length > 0 ? topN : candidates.slice(0, maxResults);
}
