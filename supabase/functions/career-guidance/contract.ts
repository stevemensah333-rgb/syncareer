// Version-2 contextual assistant contract (server side).
//
// This mirrors `artifacts/syncareer/src/features/contextual-assistant/contract.ts`.
// Both sides must agree; the server is the authority and fails closed.

export const ASSISTANT_TASKS = [
  "opportunity.explain_requirement",
  "opportunity.compare_evidence",
  "opportunity.research_questions",
  "cv.rewrite_bullet",
  "application.draft_follow_up",
  "application.clarify_next_action",
  "application.organise_notes",
  "interview.explain_feedback",
  "interview.practice_question",
] as const;
export type AssistantTask = typeof ASSISTANT_TASKS[number];

export const PROVENANCES = [
  "opportunity",
  "job_description",
  "primary_cv",
  "selected_cv_text",
  "application_notes",
  "interview_report",
] as const;
export type Provenance = typeof PROVENANCES[number];

export const PROPOSAL_KINDS = [
  "explanation",
  "rewrite",
  "draft",
  "outline",
  "practice_question",
] as const;
export type ProposalKind = typeof PROPOSAL_KINDS[number];

/** Quota feature key recovered from the live system. The quota is a uniform
 * per-user AI cost-control ceiling (5 / month for every user); it is not a
 * subscription or premium entitlement. */
export const QUOTA_FEATURE_KEY = "ai_coach_session";

export const LIMITS = {
  instructionMax: 2_000,
  contextItemMax: 12,
  contextItemContentMax: 8_000,
  contextTotalMax: 24_000,
  contextIdMax: 64,
  contextLabelMax: 200,
  proposalTextMax: 12_000,
} as const;

export interface ContextItem {
  id: string;
  label: string;
  provenance: Provenance;
  content: string;
}

export interface AssistantRequestV2 {
  version: 2;
  requestId: string;
  task: AssistantTask;
  instruction: string;
  context: ContextItem[];
}

export type ValidationFailure =
  | "not_v2"
  | "malformed_json"
  | "shape"
  | "request_id"
  | "task"
  | "provenance"
  | "instruction_empty"
  | "instruction_too_long"
  | "context_empty"
  | "context_too_many"
  | "context_duplicate_id"
  | "cv_context"
  | "context_item_too_long"
  | "context_total_too_long";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isString = (value: unknown): value is string => typeof value === "string";

/** Strict runtime validation. Returns either the request or a failure category. */
export function parseAssistantRequest(
  body: unknown,
): { ok: true; request: AssistantRequestV2 } | { ok: false; failure: ValidationFailure } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, failure: "shape" };
  }
  const raw = body as Record<string, unknown>;
  if (raw.version !== 2) return { ok: false, failure: "not_v2" };

  if (!isString(raw.requestId) || !UUID_RE.test(raw.requestId)) {
    return { ok: false, failure: "request_id" };
  }
  if (!isString(raw.task) || !(ASSISTANT_TASKS as readonly string[]).includes(raw.task)) {
    return { ok: false, failure: "task" };
  }
  if (!isString(raw.instruction)) return { ok: false, failure: "shape" };
  const instruction = raw.instruction.trim();
  if (!instruction) return { ok: false, failure: "instruction_empty" };
  if (instruction.length > LIMITS.instructionMax) {
    return { ok: false, failure: "instruction_too_long" };
  }

  if (!Array.isArray(raw.context)) return { ok: false, failure: "shape" };
  if (raw.context.length === 0) return { ok: false, failure: "context_empty" };
  if (raw.context.length > LIMITS.contextItemMax) {
    return { ok: false, failure: "context_too_many" };
  }

  const seen = new Set<string>();
  const context: ContextItem[] = [];
  let total = 0;
  for (const entry of raw.context) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, failure: "shape" };
    }
    const item = entry as Record<string, unknown>;
    if (!isString(item.id) || !item.id.trim() || item.id.length > LIMITS.contextIdMax) {
      return { ok: false, failure: "shape" };
    }
    if (!isString(item.label) || item.label.length > LIMITS.contextLabelMax) {
      return { ok: false, failure: "shape" };
    }
    if (!isString(item.provenance) || !(PROVENANCES as readonly string[]).includes(item.provenance)) {
      return { ok: false, failure: "provenance" };
    }
    if (!isString(item.content) || !item.content.trim()) {
      return { ok: false, failure: "shape" };
    }
    if (item.content.length > LIMITS.contextItemContentMax) {
      return { ok: false, failure: "context_item_too_long" };
    }
    if (seen.has(item.id)) return { ok: false, failure: "context_duplicate_id" };
    seen.add(item.id);
    total += item.content.length;
    if (total > LIMITS.contextTotalMax) {
      return { ok: false, failure: "context_total_too_long" };
    }
    context.push({
      id: item.id,
      label: item.label,
      provenance: item.provenance as Provenance,
      content: item.content,
    });
  }

  if (raw.task === "cv.rewrite_bullet") {
    const hasRequirement = context.some((item) => item.id.startsWith("requirement-") && item.provenance === "job_description");
    const hasEvidence = context.some((item) => item.id.startsWith("evidence-") && item.provenance === "selected_cv_text");
    const hasOpportunity = context.some((item) => item.provenance === "opportunity");
    if (!hasRequirement || !hasEvidence || !hasOpportunity) {
      return { ok: false, failure: "cv_context" };
    }
  }

  return {
    ok: true,
    request: {
      version: 2,
      requestId: raw.requestId,
      task: raw.task as AssistantTask,
      instruction,
      context,
    },
  };
}

/** Proposal kinds each task family is allowed to return. */
export const ALLOWED_KINDS: Record<AssistantTask, readonly ProposalKind[]> = {
  "opportunity.explain_requirement": ["explanation"],
  "opportunity.compare_evidence": ["explanation", "outline"],
  "opportunity.research_questions": ["outline"],
  "cv.rewrite_bullet": ["rewrite"],
  "application.draft_follow_up": ["draft"],
  "application.clarify_next_action": ["explanation", "outline"],
  "application.organise_notes": ["outline"],
  "interview.explain_feedback": ["explanation"],
  "interview.practice_question": ["practice_question"],
};

export interface Proposal {
  kind: ProposalKind;
  text: string;
  sourceContextIds: string[];
}

/**
 * Validates raw model output. An upstream HTTP 200 is never trusted: empty,
 * malformed, wrong-kind or context-inventing output is a failed request.
 */
export function parseModelProposal(
  rawText: string,
  task: AssistantTask,
  allowedIds: string[],
): { ok: true; proposal: Proposal } | { ok: false; failure: string } {
  let parsed: unknown;
  const trimmed = rawText.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, failure: "model_not_json" };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, failure: "model_shape" };
  }
  const candidate = parsed as Record<string, unknown>;
  const kind = candidate.kind;
  if (!isString(kind) || !(ALLOWED_KINDS[task] as readonly string[]).includes(kind)) {
    return { ok: false, failure: "model_kind" };
  }
  if (!isString(candidate.text)) return { ok: false, failure: "model_shape" };
  const text = candidate.text.trim();
  if (!text) return { ok: false, failure: "model_empty_text" };
  if (text.length > LIMITS.proposalTextMax) return { ok: false, failure: "model_text_too_long" };

  if (!Array.isArray(candidate.sourceContextIds)) return { ok: false, failure: "model_shape" };
  const ids = candidate.sourceContextIds;
  if (ids.length === 0) return { ok: false, failure: "model_no_source_ids" };
  const allowed = new Set(allowedIds);
  const unique: string[] = [];
  for (const id of ids) {
    if (!isString(id) || !allowed.has(id)) return { ok: false, failure: "model_unknown_source_id" };
    if (!unique.includes(id)) unique.push(id);
  }

  return { ok: true, proposal: { kind: kind as ProposalKind, text, sourceContextIds: unique } };
}
