import { z } from 'zod';
import type { OpportunityJob } from '@/features/opportunities/opportunity';
import { getOrganisation, getWorkModeLabel } from '@/features/opportunities/opportunity';
import type { CVData } from './types';

export const requirementKinds = [
  'responsibility',
  'required_qualification',
  'preferred_qualification',
  'required_skill',
  'preferred_skill',
  'domain_knowledge',
  'education',
  'experience',
  'location',
  'work_authorization',
  'deadline',
] as const;

export const candidateEvidenceCategories = [
  'experience',
  'project',
  'education',
  'coursework',
  'activity',
  'achievement',
  'skill',
  'certification',
] as const;

export const requirementMatchStatuses = [
  'supported',
  'partially_supported',
  'unsupported',
  'unclear',
] as const;

export const opportunityContextSchema = z.object({
  opportunityId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1),
  organisation: z.string().trim().min(1).optional(),
  description: z.string().optional(),
  responsibilities: z.array(z.string()),
  requiredQualifications: z.array(z.string()),
  preferredQualifications: z.array(z.string()),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  experienceLevel: z.string().trim().min(1).optional(),
  location: z.string().trim().min(1).optional(),
  workMode: z.string().trim().min(1).optional(),
  sourceLabel: z.string().trim().min(1).optional(),
  sourceUrl: z.string().trim().min(1).optional(),
});

export interface JobRequirement {
  requirementId: string;
  kind: typeof requirementKinds[number];
  text: string;
  sourceText: string;
  sourceField: 'description' | 'requirements' | 'skills' | 'experience_level' | 'location' | 'application_deadline';
}

export interface OpportunityContext extends z.infer<typeof opportunityContextSchema> {
  requirements: JobRequirement[];
}

export const candidateEvidenceSchema = z.object({
  evidenceId: z.string().trim().min(1).max(64),
  category: z.enum(candidateEvidenceCategories),
  title: z.string().trim().min(1),
  organisation: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1),
  startDate: z.string().trim().min(1).optional(),
  endDate: z.string().trim().min(1).optional(),
  skills: z.array(z.string()),
  metrics: z.array(z.string()),
  source: z.enum(['profile', 'cv', 'project', 'user_input']),
});

export type CandidateEvidence = z.infer<typeof candidateEvidenceSchema>;

export const requirementEvidenceMatchSchema = z.object({
  requirementId: z.string().trim().min(1),
  status: z.enum(requirementMatchStatuses),
  evidenceIds: z.array(z.string()),
  explanation: z.string().trim().min(1),
  missingEvidence: z.array(z.string()),
});

export type RequirementEvidenceMatch = z.infer<typeof requirementEvidenceMatchSchema>;

export const cvSuggestionSchema = z.object({
  suggestionId: z.string().trim().min(1),
  targetSection: z.enum(['summary', 'experience', 'project', 'education', 'activity', 'skills']),
  fieldPath: z.string().trim().min(1),
  originalText: z.string(),
  proposedText: z.string().trim().min(1).max(2_000),
  evidenceIds: z.array(z.string()).min(1),
  requirementIds: z.array(z.string()).min(1),
  rationale: z.string().trim().min(1),
  unsupportedClaims: z.array(z.string()),
  warnings: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
});

export type CvSuggestion = z.infer<typeof cvSuggestionSchema>;

const BOILERPLATE = /(?:equal opportunity|diversity and inclusion|we are an equal|benefits include|about (?:us|the company)|cookie|privacy policy|terms of use|company values|our mission)/i;
const PROMPT_INJECTION = /(?:ignore (?:all |any )?(?:previous|prior|above) instructions|system prompt|developer message|you are chatgpt|assistant:|return only the password|reveal (?:your|the) instructions)/i;
const RESPONSIBILITY_HEADING = /(?:responsibilit|what you(?:'|’)ll do|duties|role overview|day.to.day)/i;
const PREFERRED_HEADING = /(?:preferred|nice to have|advantageous|desirable|bonus)/i;
const QUALIFICATION_HEADING = /(?:qualification|requirements?|what you(?:'|’)ll bring|who you are|eligibility)/i;
const EDUCATION = /\b(?:degree|diploma|bachelor|master|phd|university|college|graduate)\b/i;
const EXPERIENCE = /\b(?:(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\+?\s*(?:years?|yrs?)|experience)\b/i;
const WORK_AUTH = /\b(?:work authori[sz]ation|authori[sz]ed to work|sponsorship|work permit|visa)\b/i;

function stableId(prefix: string, value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}

function cleanLine(value: string): string {
  return value.replace(/^\s*(?:(?:[-–—•*·▪◦]+)|(?:\d+[.)]\s+))/, '').replace(/\s+/g, ' ').trim();
}

function linesFrom(value: string | null | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/\r?\n|(?<=[.;])\s+(?=[A-Z])/)
    .map(cleanLine)
    .filter((line) => line.length >= 3 && line.length <= 600);
}

function isHeading(line: string): boolean {
  return line.length < 80 && /:$/u.test(line) || /^(?:responsibilities|requirements|qualifications|preferred qualifications|nice to have|what you(?:'|’)ll do|what you(?:'|’)ll bring)$/i.test(line);
}

function addRequirement(
  target: JobRequirement[],
  kind: JobRequirement['kind'],
  text: string,
  sourceField: JobRequirement['sourceField'],
): void {
  const normalized = cleanLine(text);
  if (!normalized || BOILERPLATE.test(normalized) || PROMPT_INJECTION.test(normalized)) return;
  const duplicate = target.some((item) => item.text.toLocaleLowerCase() === normalized.toLocaleLowerCase());
  if (duplicate) return;
  target.push({
    requirementId: stableId('requirement', `${kind}:${normalized.toLocaleLowerCase()}`),
    kind,
    text: normalized,
    sourceText: normalized,
    sourceField,
  });
}

/**
 * Conservative extraction from verified job_postings columns. Source text is
 * retained verbatim after whitespace/bullet cleanup. Job text is data: prompt
 * instructions and common listing boilerplate are deliberately excluded.
 */
export function buildOpportunityContext(job: OpportunityJob): OpportunityContext {
  const extracted: JobRequirement[] = [];
  let section: 'responsibility' | 'required' | 'preferred' | null = null;

  for (const line of linesFrom(job.description)) {
    if (isHeading(line)) {
      section = PREFERRED_HEADING.test(line)
        ? 'preferred'
        : RESPONSIBILITY_HEADING.test(line)
          ? 'responsibility'
          : QUALIFICATION_HEADING.test(line)
            ? 'required'
            : section;
      continue;
    }
    const kind = section === 'responsibility'
      ? 'responsibility'
      : section === 'preferred'
        ? EDUCATION.test(line) ? 'preferred_qualification' : 'preferred_skill'
        : EDUCATION.test(line)
          ? 'education'
          : EXPERIENCE.test(line)
            ? 'experience'
            : WORK_AUTH.test(line)
              ? 'work_authorization'
              : 'required_qualification';
    addRequirement(extracted, kind, line, 'description');
  }

  for (const line of linesFrom(job.requirements)) {
    const kind = PREFERRED_HEADING.test(line)
      ? 'preferred_qualification'
      : EDUCATION.test(line)
        ? 'education'
        : EXPERIENCE.test(line)
          ? 'experience'
          : WORK_AUTH.test(line)
            ? 'work_authorization'
            : 'required_qualification';
    addRequirement(extracted, kind, line, 'requirements');
  }

  for (const skill of job.skills ?? []) addRequirement(extracted, 'required_skill', skill, 'skills');
  if (job.experience_level?.trim()) addRequirement(extracted, 'experience', job.experience_level, 'experience_level');
  if (job.location?.trim()) addRequirement(extracted, 'location', job.location, 'location');
  if (job.application_deadline?.trim()) addRequirement(extracted, 'deadline', job.application_deadline, 'application_deadline');

  const parsed = opportunityContextSchema.parse({
    opportunityId: job.id,
    title: job.title,
    organisation: getOrganisation(job) ?? undefined,
    description: job.description || undefined,
    responsibilities: extracted.filter((item) => item.kind === 'responsibility').map((item) => item.text),
    requiredQualifications: extracted.filter((item) => ['required_qualification', 'education', 'experience'].includes(item.kind)).map((item) => item.text),
    preferredQualifications: extracted.filter((item) => item.kind === 'preferred_qualification').map((item) => item.text),
    requiredSkills: extracted.filter((item) => item.kind === 'required_skill').map((item) => item.text),
    preferredSkills: extracted.filter((item) => item.kind === 'preferred_skill').map((item) => item.text),
    experienceLevel: job.experience_level ?? undefined,
    location: job.location || undefined,
    workMode: getWorkModeLabel(job) ?? undefined,
    sourceLabel: job.source || undefined,
    sourceUrl: job.source_url ?? undefined,
  });

  return { ...parsed, requirements: extracted };
}

function extractMetrics(value: string): string[] {
  return Array.from(new Set(value.match(/(?:[$€£₵]\s*)?\b\d[\d,.]*(?:\s*%|\s*(?:users?|people|students?|customers?|hours?|days?|weeks?|months?|years?))?/gi) ?? []));
}

function parseDateRange(value: string): { startDate?: string; endDate?: string } {
  const parts = value.split(/\s*(?:–|—|\bto\b)\s*/i).map((part) => part.trim()).filter(Boolean);
  return { startDate: parts[0], endDate: parts[1] };
}

function evidenceSkills(description: string, skills: string[]): string[] {
  const lower = description.toLocaleLowerCase();
  return skills.filter((skill) => lower.includes(skill.toLocaleLowerCase()));
}

function evidenceItem(input: CandidateEvidence): CandidateEvidence {
  return candidateEvidenceSchema.parse(input);
}

/** Request-scoped evidence IDs are derived from stable CV row IDs/paths. */
export function buildCandidateEvidence(cv: CVData): CandidateEvidence[] {
  const evidence: CandidateEvidence[] = [];
  const cvSkills = cv.skills.map((skill) => skill.trim()).filter(Boolean);

  for (const item of cv.experience) {
    const description = item.bullets.map((bullet) => bullet.trim()).filter(Boolean).join(' ');
    if (!description) continue;
    evidence.push(evidenceItem({
      evidenceId: stableId('evidence-experience', item.id), category: 'experience',
      title: item.role.trim() || 'Experience', organisation: item.company.trim() || undefined,
      description, ...parseDateRange(item.date), skills: evidenceSkills(description, cvSkills),
      metrics: extractMetrics(description), source: 'cv',
    }));
  }
  for (const item of cv.projects) {
    const description = item.bullets.map((bullet) => bullet.trim()).filter(Boolean).join(' ');
    if (!description) continue;
    evidence.push(evidenceItem({
      evidenceId: stableId('evidence-project', item.id), category: 'project',
      title: item.projectName.trim() || 'Project', organisation: item.organization.trim() || undefined,
      description, ...parseDateRange(item.date), skills: evidenceSkills(description, cvSkills),
      metrics: extractMetrics(description), source: 'project',
    }));
  }
  for (const item of cv.activities) {
    const description = item.bullets.map((bullet) => bullet.trim()).filter(Boolean).join(' ');
    if (!description) continue;
    evidence.push(evidenceItem({
      evidenceId: stableId('evidence-activity', item.id), category: 'activity',
      title: item.activity.trim() || item.role.trim() || 'Activity', organisation: item.organization.trim() || undefined,
      description, ...parseDateRange(item.date), skills: evidenceSkills(description, cvSkills),
      metrics: extractMetrics(description), source: 'cv',
    }));
  }
  if (Object.values(cv.education).some((value) => value.trim())) {
    const description = [cv.education.degree, cv.education.university, cv.education.location, cv.education.graduationDate, cv.education.gpa].filter(Boolean).join(' · ');
    evidence.push(evidenceItem({
      evidenceId: stableId('evidence-education', description), category: 'education',
      title: cv.education.degree.trim() || 'Education', organisation: cv.education.university.trim() || undefined,
      description, skills: evidenceSkills(description, cvSkills), metrics: extractMetrics(description), source: 'cv',
    }));
  }
  for (const item of cv.achievements) {
    const description = [item.title, item.organization, item.date].filter(Boolean).join(' · ');
    if (!description) continue;
    evidence.push(evidenceItem({
      evidenceId: stableId('evidence-achievement', item.id), category: 'achievement', title: item.title.trim() || 'Achievement',
      organisation: item.organization.trim() || undefined, description, skills: evidenceSkills(description, cvSkills),
      metrics: extractMetrics(description), source: 'cv',
    }));
  }
  for (const skill of cvSkills) {
    evidence.push(evidenceItem({
      evidenceId: stableId('evidence-skill', skill.toLocaleLowerCase()), category: 'skill', title: skill,
      description: `Skill listed on CV: ${skill}`, skills: [skill], metrics: [], source: 'cv',
    }));
  }
  return evidence;
}

const STOP_WORDS = new Set(['and', 'the', 'with', 'for', 'from', 'that', 'this', 'your', 'you', 'our', 'will', 'have', 'has', 'are', 'but', 'not', 'into', 'using', 'role', 'work', 'skills', 'skill', 'ability', 'required', 'preferred', 'experience']);

function tokens(value: string): string[] {
  return Array.from(new Set(value.toLocaleLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) ?? []))
    .filter((token) => !STOP_WORDS.has(token));
}

function evidenceText(item: CandidateEvidence): string {
  return [item.title, item.organisation, item.description, ...item.skills, ...item.metrics].filter(Boolean).join(' ').toLocaleLowerCase();
}

/** Conservative matching: keyword overlap alone can never produce supported. */
export function matchRequirementToEvidence(requirement: JobRequirement, evidence: CandidateEvidence[]): RequirementEvidenceMatch {
  const requirementTokens = tokens(requirement.text);
  const ranked = evidence.map((item) => {
    const haystack = evidenceText(item);
    const overlap = requirementTokens.filter((token) => haystack.includes(token));
    const exactSkill = item.skills.some((skill) => requirement.text.toLocaleLowerCase().includes(skill.toLocaleLowerCase()));
    return { item, overlap, exactSkill };
  }).filter((entry) => entry.overlap.length > 0 || entry.exactSkill);

  if (requirement.kind === 'deadline' || requirement.kind === 'location' || requirement.kind === 'work_authorization') {
    return requirementEvidenceMatchSchema.parse({
      requirementId: requirement.requirementId, status: 'unclear', evidenceIds: [],
      explanation: 'This constraint needs the candidate to confirm it directly; CV content is not reliable proof.',
      missingEvidence: [`Confirm: ${requirement.text}`],
    });
  }

  if (requirement.kind === 'experience' && /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\+?\s*(?:years?|yrs?)\b/i.test(requirement.text)) {
    return requirementEvidenceMatchSchema.parse({
      requirementId: requirement.requirementId, status: ranked.length ? 'partially_supported' : 'unsupported',
      evidenceIds: ranked.map(({ item }) => item.evidenceId),
      explanation: ranked.length
        ? 'Related evidence exists, but Syncareer does not infer qualifying years from unrelated or ambiguous dates.'
        : 'No supplied evidence establishes the stated years-of-experience requirement.',
      missingEvidence: ['Direct evidence of qualifying experience duration'],
    });
  }

  if (ranked.length === 0) {
    return requirementEvidenceMatchSchema.parse({
      requirementId: requirement.requirementId, status: 'unsupported', evidenceIds: [],
      explanation: 'No supplied candidate evidence substantively supports this requirement.',
      missingEvidence: [requirement.text],
    });
  }

  const contextual = ranked.filter(({ item, overlap }) => item.category !== 'skill' && overlap.length >= Math.min(2, Math.max(1, requirementTokens.length)));
  const status: RequirementEvidenceMatch['status'] = contextual.length > 0 ? 'supported' : 'partially_supported';
  const used = contextual.length > 0 ? contextual : ranked;
  return requirementEvidenceMatchSchema.parse({
    requirementId: requirement.requirementId,
    status,
    evidenceIds: used.slice(0, 5).map(({ item }) => item.evidenceId),
    explanation: status === 'supported'
      ? 'Specific CV or project context supports the requirement; the user should still review the connection.'
      : 'There is related or skill-list evidence, but it does not fully demonstrate the requirement.',
    missingEvidence: status === 'supported' ? [] : ['A concrete example showing how the skill or qualification was used'],
  });
}

function includesPhrase(haystack: string, needle: string): boolean {
  return Boolean(needle.trim()) && haystack.toLocaleLowerCase().includes(needle.trim().toLocaleLowerCase());
}

/**
 * Deterministic post-generation guard. It focuses on high-risk factual claims
 * we can check reliably; anything ambiguous becomes a warning, never a claim
 * that Syncareer verified the text.
 */
export function findUnsupportedClaims(
  proposedText: string,
  originalText: string,
  selectedEvidence: CandidateEvidence[],
  selectedRequirements: JobRequirement[],
  opportunity?: Pick<OpportunityContext, 'organisation'>,
): { unsupportedClaims: string[]; warnings: string[] } {
  const allowed = [originalText, ...selectedEvidence.flatMap((item) => [item.title, item.organisation ?? '', item.description, ...item.skills, ...item.metrics])].join(' ');
  const unsupportedClaims: string[] = [];
  const warnings: string[] = [];

  for (const metric of extractMetrics(proposedText)) {
    if (!includesPhrase(allowed, metric)) unsupportedClaims.push(`New metric or number is not in the selected evidence: “${metric}”.`);
  }

  for (const requirement of selectedRequirements.filter((item) => item.kind === 'required_skill' || item.kind === 'preferred_skill')) {
    if (includesPhrase(proposedText, requirement.text) && !includesPhrase(allowed, requirement.text)) {
      unsupportedClaims.push(`Role skill is used without candidate evidence: “${requirement.text}”.`);
    }
  }

  if (opportunity?.organisation && includesPhrase(proposedText, opportunity.organisation) && !includesPhrase(allowed, opportunity.organisation)) {
    unsupportedClaims.push(`The role organisation is presented as candidate experience without evidence: “${opportunity.organisation}”.`);
  }

  for (const match of proposedText.matchAll(/\b(?:[Ww]orked|[Ee]mployed|[Ii]nterned)\s+(?:at|for|by)\s+([A-Z][\w&.-]*(?:\s+(?:[A-Z][\w&.-]*|&)){0,3})/g)) {
    const employer = match[1]?.trim();
    if (employer && !includesPhrase(allowed, employer)) {
      unsupportedClaims.push(`Employer is not in the selected evidence: “${employer}”.`);
    }
  }

  const evidenceCategories = new Set(selectedEvidence.map((item) => item.category));
  if (evidenceCategories.size > 0 && Array.from(evidenceCategories).every((category) => category === 'education' || category === 'coursework')) {
    if (/\b(?:employed|worked (?:at|for)|professional experience|job at)\b/i.test(proposedText)) {
      unsupportedClaims.push('Coursework or education is described as professional employment.');
    }
  }
  if (evidenceCategories.has('activity') && /\b(?:led|managed|directed|president|chair(?:ed)?)\b/i.test(proposedText) && !/\b(?:led|managed|directed|president|chair(?:ed)?)\b/i.test(allowed)) {
    unsupportedClaims.push('Participation or membership is upgraded to leadership without evidence.');
  }
  if (/\b(?:won|winner|awarded first|placed first)\b/i.test(proposedText) && !/\b(?:won|winner|awarded first|placed first)\b/i.test(allowed)) {
    unsupportedClaims.push('Participation is upgraded to winning without evidence.');
  }
  if (/\b(?:results-driven|dynamic|go-getter|proven track record|passionate professional)\b/i.test(proposedText)) {
    warnings.push('The proposal contains generic language that is not specific evidence.');
  }
  if (proposedText.length > 260) warnings.push('The proposed bullet is long; edit it for concise CV presentation.');

  return {
    unsupportedClaims: Array.from(new Set(unsupportedClaims)),
    warnings: Array.from(new Set(warnings)),
  };
}

export function suggestionTargetSection(fieldPath: string): CvSuggestion['targetSection'] {
  if (fieldPath.startsWith('projects.')) return 'project';
  if (fieldPath.startsWith('activities.')) return 'activity';
  if (fieldPath.startsWith('education.')) return 'education';
  if (fieldPath.startsWith('personal.')) return 'summary';
  if (fieldPath.startsWith('skills.')) return 'skills';
  return 'experience';
}
