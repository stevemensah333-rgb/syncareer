import type { OpportunityJob } from './opportunity';

/**
 * Repository-controlled, intentionally bounded career vocabulary.
 *
 * The map turns a stored academic major into role-family language used only for
 * search/ranking. It is not an AI taxonomy and it never manufactures profile
 * data. Unknown majors safely fall back to their literal value.
 */
export const MAJOR_ROLE_FAMILIES: Record<string, string[]> = {
  'computer science': [
    'software engineer', 'backend developer', 'frontend developer', 'full stack developer',
    'data analyst', 'data engineer', 'machine learning engineer', 'qa engineer',
    'cybersecurity analyst', 'cloud engineer', 'devops engineer', 'technical support',
  ],
  'data science': [
    'data analyst', 'data scientist', 'data engineer', 'business intelligence analyst',
    'machine learning engineer', 'analytics engineer', 'research analyst',
  ],
  'information technology': [
    'it support', 'systems administrator', 'network engineer', 'cybersecurity analyst',
    'cloud support', 'technical support', 'qa engineer',
  ],
  'business administration': [
    'business analyst', 'operations analyst', 'project coordinator', 'graduate trainee',
    'management trainee', 'sales associate', 'customer success',
  ],
  finance: [
    'financial analyst', 'audit associate', 'credit analyst', 'treasury analyst',
    'investment analyst', 'finance intern', 'graduate trainee',
  ],
  accounting: [
    'audit associate', 'accounting assistant', 'accounts officer', 'tax associate',
    'finance analyst', 'graduate trainee',
  ],
  marketing: [
    'digital marketing', 'marketing assistant', 'content marketer', 'social media coordinator',
    'brand assistant', 'marketing analyst',
  ],
  nursing: [
    'registered nurse', 'graduate nurse', 'clinical nurse', 'nursing officer',
    'community health nurse', 'patient care',
  ],
  medicine: [
    'medical officer', 'clinical research', 'public health', 'healthcare assistant',
    'medical intern', 'healthcare technology',
  ],
  pharmacy: [
    'pharmacist', 'pharmacy intern', 'clinical pharmacy', 'regulatory affairs',
    'pharmacovigilance', 'pharmacy technician',
  ],
  'electrical engineering': [
    'electrical engineer', 'power systems engineer', 'controls engineer', 'automation engineer',
    'renewable energy engineer', 'engineering intern',
  ],
  'mechanical engineering': [
    'mechanical engineer', 'manufacturing engineer', 'maintenance engineer', 'quality engineer',
    'design engineer', 'engineering intern',
  ],
  'civil engineering': [
    'civil engineer', 'site engineer', 'structural engineer', 'project engineer',
    'quantity surveyor', 'construction engineer',
  ],
  'chemical engineering': [
    'process engineer', 'production engineer', 'quality engineer', 'safety engineer',
    'operations engineer', 'engineering intern',
  ],
  economics: [
    'economic analyst', 'research analyst', 'policy analyst', 'data analyst',
    'monitoring and evaluation', 'graduate trainee',
  ],
  law: [
    'legal associate', 'legal intern', 'compliance officer', 'legal researcher',
    'contract administrator', 'paralegal',
  ],
  psychology: [
    'research assistant', 'hr assistant', 'people operations', 'counselling assistant',
    'behavioural researcher', 'mental health',
  ],
  'human resources': [
    'hr assistant', 'recruitment coordinator', 'people operations', 'talent acquisition',
    'learning and development', 'hr intern',
  ],
  'graphic design': [
    'graphic designer', 'visual designer', 'ui ux designer', 'brand designer',
    'motion designer', 'design intern',
  ],
  architecture: [
    'architectural assistant', 'architect', 'bim specialist', 'urban planner',
    'design coordinator', 'architecture intern',
  ],
  communications: [
    'communications officer', 'public relations', 'content writer', 'media officer',
    'communications intern', 'community manager',
  ],
  education: [
    'teaching assistant', 'teacher', 'education officer', 'curriculum assistant',
    'education coordinator', 'edtech',
  ],
  'environmental science': [
    'environmental officer', 'sustainability analyst', 'environmental consultant', 'gis analyst',
    'climate researcher', 'environmental intern',
  ],
  agriculture: [
    'agronomist', 'agricultural officer', 'farm manager', 'agribusiness analyst',
    'food systems', 'agriculture intern',
  ],
};

export interface OpportunityProfileSignals {
  major?: string | null;
  skills?: string[];
  interests?: string[];
  /** Apply strong seniority penalties only for current students/early-career users. */
  earlyCareer?: boolean;
}

export interface RankedOpportunity {
  job: OpportunityJob;
  score: number;
  majorAligned: boolean;
  matchedSkillCount: number;
  /** Actual recorded skill names that appeared in the posting. */
  matchedSkills: string[];
  /** Actual recorded interest names that appeared in the posting. */
  matchedInterests: string[];
  /** True when the posting is early-career friendly (or early-career is the only signal). */
  earlyCareerFriendly: boolean;
}

const EARLY_CAREER_TERMS = ['intern', 'internship', 'graduate', 'entry level', 'junior', 'trainee', 'assistant', 'associate'];
const SENIOR_TERMS = ['senior', 'staff', 'principal', 'lead', 'director', 'head of', 'manager'];

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().toLocaleLowerCase();
}

/** Returns maintained role-family language for a major, plus the literal major when present. */
export function getMajorTerms(major?: string | null): string[] {
  const normalized = normalizeText(major);
  if (!normalized) return [];
  return Array.from(new Set([normalized, ...(MAJOR_ROLE_FAMILIES[normalized] ?? [])]));
}

function jobText(job: OpportunityJob): { title: string; body: string } {
  const title = normalizeText(job.title);
  return {
    title,
    body: normalizeText([
      job.title,
      job.company_name,
      job.department,
      job.location,
      job.description,
      job.requirements,
      ...(job.skills ?? []),
    ].filter(Boolean).join(' ')),
  };
}

function includesTerm(text: string, term: string): boolean {
  return term.length >= 3 && text.includes(term);
}

function ingestionRecencyScore(createdAt: string | null): number {
  if (!createdAt) return 0;
  const time = Date.parse(createdAt);
  if (Number.isNaN(time)) return 0;
  const ageDays = Math.max(0, (Date.now() - time) / 86_400_000);
  if (ageDays <= 7) return 6;
  if (ageDays <= 30) return 3;
  if (ageDays <= 90) return 1;
  return 0;
}

/**
 * Scores only persisted listing fields and available profile signals. The score
 * is deliberately explainable: major role-family title matches carry the most
 * weight, skills/interests reinforce them, and early-career users are protected
 * from senior-heavy feeds.
 */
export function scoreOpportunity(job: OpportunityJob, profile: OpportunityProfileSignals): RankedOpportunity {
  const { title, body } = jobText(job);
  const majorTerms = getMajorTerms(profile.major);
  const skills = (profile.skills ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length >= 3);
  const interests = (profile.interests ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length >= 3);

  let score = ingestionRecencyScore(job.created_at);
  let majorAligned = false;
  let matchedSkillCount = 0;
  const matchedSkills: string[] = [];
  const matchedInterests: string[] = [];

  for (const term of majorTerms) {
    if (includesTerm(title, term)) {
      score += 28;
      majorAligned = true;
    } else if (includesTerm(body, term)) {
      score += 10;
      majorAligned = true;
    }
  }

  for (const skill of skills) {
    const term = skill.toLocaleLowerCase();
    if (includesTerm(title, term)) {
      score += 10;
      matchedSkillCount += 1;
      matchedSkills.push(skill);
    } else if (includesTerm(body, term)) {
      score += 5;
      matchedSkillCount += 1;
      matchedSkills.push(skill);
    }
  }

  for (const interest of interests) {
    const term = interest.toLocaleLowerCase();
    if (includesTerm(title, term)) {
      score += 8;
      matchedInterests.push(interest);
    } else if (includesTerm(body, term)) {
      score += 3;
      matchedInterests.push(interest);
    }
  }

  let earlyCareerFriendly = false;
  if (profile.earlyCareer) {
    if (EARLY_CAREER_TERMS.some((term) => includesTerm(`${title} ${body}`, term))) {
      score += 12;
      earlyCareerFriendly = true;
    }
    if (SENIOR_TERMS.some((term) => includesTerm(title, term))) score -= 80;
    if (job.experience_level?.toLowerCase() === 'senior') score -= 80;
    if (job.experience_level?.toLowerCase() === 'entry') {
      score += 12;
      earlyCareerFriendly = true;
    }
  }

  return {
    job,
    score,
    majorAligned,
    matchedSkillCount,
    matchedSkills,
    matchedInterests,
    earlyCareerFriendly,
  };
}

function canonicalUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    for (const key of Array.from(url.searchParams.keys())) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'source') url.searchParams.delete(key);
    }
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return normalizeText(value).replace(/\/$/, '') || null;
  }
}

function fallbackIdentity(job: OpportunityJob): string {
  return [job.title, job.company_name ?? job.department, job.location]
    .map(normalizeText)
    .join('|');
}

/**
 * Deduplicates display rows by canonical source URL, then by normalized
 * title/organisation/location when a source URL is absent or reused. The
 * highest-scoring candidate is retained, while rank ties stay deterministic.
 */
export function rankAndDeduplicateOpportunities(
  jobs: OpportunityJob[],
  profile: OpportunityProfileSignals,
): RankedOpportunity[] {
  const bestByIdentity = new Map<string, RankedOpportunity>();

  for (const job of jobs) {
    const ranked = scoreOpportunity(job, profile);
    const identity = canonicalUrl(job.source_url) ?? fallbackIdentity(job);
    const existing = bestByIdentity.get(identity);
    if (!existing || ranked.score > existing.score || (ranked.score === existing.score && ranked.job.created_at > existing.job.created_at)) {
      bestByIdentity.set(identity, ranked);
    }
  }

  return Array.from(bestByIdentity.values()).sort((left, right) => (
    right.score - left.score
    || Number(right.majorAligned) - Number(left.majorAligned)
    || right.matchedSkillCount - left.matchedSkillCount
    || right.job.created_at.localeCompare(left.job.created_at)
    || left.job.id.localeCompare(right.job.id)
  ));
}

/** Short, non-claiming UI copy explaining which available signals affect ordering. */
export function opportunityRankingSummary(profile: OpportunityProfileSignals): string | null {
  const parts: string[] = [];
  if (profile.major?.trim()) parts.push(profile.major.trim());
  if ((profile.skills ?? []).length > 0) parts.push(`${Math.min(profile.skills!.length, 3)} skill${profile.skills!.length === 1 ? '' : 's'}`);
  if ((profile.interests ?? []).length > 0) parts.push('career interests');
  if (parts.length === 0) return null;
  return `Ordered using ${parts.join(' and ')}${profile.earlyCareer ? ', with early-career roles prioritised' : ''}.`;
}
