import { z } from 'zod';
import {
  AssistantRequestError,
  requestContextualAssistance,
  type AssistantContextItem,
} from '@/features/contextual-assistant/contract';
import {
  candidateEvidenceSchema,
  cvSuggestionSchema,
  findUnsupportedClaims,
  opportunityContextSchema,
  requirementEvidenceMatchSchema,
  suggestionTargetSection,
  type CandidateEvidence,
  type CvSuggestion,
  type JobRequirement,
  type OpportunityContext,
  type RequirementEvidenceMatch,
} from './guidance';

const requestSchema = z.object({
  fieldPath: z.string().trim().min(1).max(200),
  originalText: z.string().trim().min(1).max(2_000),
  instruction: z.string().trim().min(1).max(2_000),
  opportunity: opportunityContextSchema,
  requirements: z.array(z.object({
    requirementId: z.string().trim().min(1),
    kind: z.string().trim().min(1),
    text: z.string().trim().min(1),
    sourceText: z.string().trim().min(1),
    sourceField: z.string().trim().min(1),
  })).min(1).max(3),
  evidence: z.array(candidateEvidenceSchema).min(1).max(7),
  matches: z.array(requirementEvidenceMatchSchema).min(1).max(3),
});

export interface ProposeCvBulletInput {
  fieldPath: string;
  originalText: string;
  instruction: string;
  opportunity: OpportunityContext;
  requirements: JobRequirement[];
  evidence: CandidateEvidence[];
  matches: RequirementEvidenceMatch[];
}

function contextId(prefix: 'requirement' | 'evidence', rawId: string): string {
  const safe = rawId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 48);
  return `${prefix}-${safe}`;
}

function buildContext(input: ProposeCvBulletInput): AssistantContextItem[] {
  const context: AssistantContextItem[] = [{
    id: 'target-opportunity',
    label: `Target role: ${input.opportunity.title}`,
    provenance: 'opportunity',
    content: [input.opportunity.title, input.opportunity.organisation, input.opportunity.location, input.opportunity.workMode]
      .filter(Boolean)
      .join(' · '),
  }];

  for (const requirement of input.requirements) {
    context.push({
      id: contextId('requirement', requirement.requirementId),
      label: `Requirement: ${requirement.text}`,
      provenance: 'job_description',
      content: `Requirement ID: ${requirement.requirementId}\nCategory: ${requirement.kind}\nSource excerpt: ${requirement.sourceText}`,
    });
  }
  for (const evidence of input.evidence) {
    context.push({
      id: contextId('evidence', evidence.evidenceId),
      label: `Evidence: ${evidence.title}`,
      provenance: 'selected_cv_text',
      personal: true,
      content: [
        `Evidence ID: ${evidence.evidenceId}`,
        `Category: ${evidence.category}`,
        `Title: ${evidence.title}`,
        evidence.organisation ? `Organisation: ${evidence.organisation}` : '',
        evidence.startDate ? `Start: ${evidence.startDate}` : '',
        evidence.endDate ? `End: ${evidence.endDate}` : '',
        `Evidence text: ${evidence.description}`,
        evidence.skills.length ? `Skills explicitly present: ${evidence.skills.join(', ')}` : '',
        evidence.metrics.length ? `Metrics explicitly present: ${evidence.metrics.join(', ')}` : '',
      ].filter(Boolean).join('\n'),
    });
  }
  return context;
}

function confidenceFor(matches: RequirementEvidenceMatch[]): CvSuggestion['confidence'] {
  if (matches.every((match) => match.status === 'supported')) return 'high';
  if (matches.some((match) => match.status === 'supported' || match.status === 'partially_supported')) return 'medium';
  return 'low';
}

/**
 * Typed CV operation used by product UI. Components cannot submit arbitrary
 * prompts or provider settings; they supply a target, requirements and the
 * evidence the user explicitly selected.
 */
export async function proposeCvBulletImprovement(
  rawInput: ProposeCvBulletInput,
  signal?: AbortSignal,
): Promise<CvSuggestion> {
  const parsed = requestSchema.safeParse(rawInput);
  if (!parsed.success) throw new Error('The selected opportunity, requirement, or evidence is incomplete.');
  const input = rawInput;
  const context = buildContext(input);
  const proposal = await requestContextualAssistance(
    'cv.rewrite_bullet',
    `${input.instruction.trim()}\n\nRewrite only the selected CV bullet. Connect it to the selected requirement using only the selected candidate evidence. Do not add any fact, metric, employer, technology, responsibility, date, or outcome that is absent from that evidence.`,
    context,
    signal,
  );

  const evidenceContextIds = new Map(input.evidence.map((item) => [contextId('evidence', item.evidenceId), item.evidenceId]));
  const requirementContextIds = new Map(input.requirements.map((item) => [contextId('requirement', item.requirementId), item.requirementId]));
  const evidenceIds = proposal.sourceContextIds.flatMap((id) => evidenceContextIds.get(id) ?? []);
  const requirementIds = proposal.sourceContextIds.flatMap((id) => requirementContextIds.get(id) ?? []);
  if (evidenceIds.length === 0 || requirementIds.length === 0) {
    throw new AssistantRequestError('malformed', 'The assistant did not trace its wording to both candidate evidence and a job requirement. Nothing was changed.');
  }
  const checks = findUnsupportedClaims(proposal.text, input.originalText, input.evidence, input.requirements, input.opportunity);
  const matchSummary = input.matches.map((match) => `${match.status.replace('_', ' ')}: ${match.explanation}`).join(' ');

  return cvSuggestionSchema.parse({
    suggestionId: crypto.randomUUID(),
    targetSection: suggestionTargetSection(input.fieldPath),
    fieldPath: input.fieldPath,
    originalText: input.originalText,
    proposedText: proposal.text,
    evidenceIds,
    requirementIds,
    rationale: `Targets ${input.requirements.map((item) => `“${item.text}”`).join(', ')} using the evidence you selected. ${matchSummary}`,
    unsupportedClaims: checks.unsupportedClaims,
    warnings: checks.warnings,
    confidence: confidenceFor(input.matches),
  });
}

export function revalidateCvSuggestion(
  suggestion: CvSuggestion,
  proposedText: string,
  evidence: CandidateEvidence[],
  requirements: JobRequirement[],
  opportunity: OpportunityContext,
): CvSuggestion {
  const checks = findUnsupportedClaims(proposedText, suggestion.originalText, evidence, requirements, opportunity);
  return cvSuggestionSchema.parse({
    ...suggestion,
    proposedText,
    unsupportedClaims: checks.unsupportedClaims,
    warnings: checks.warnings,
  });
}

export function isSuggestionSafeToAccept(suggestion: CvSuggestion): boolean {
  return suggestion.unsupportedClaims.length === 0
    && suggestion.evidenceIds.length > 0
    && suggestion.requirementIds.length > 0;
}
