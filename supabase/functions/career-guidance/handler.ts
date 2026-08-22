// Version-2 request handler. Pure with respect to I/O: authentication, quota,
// idempotency and gateway access are injected so the whole flow is testable
// without network access or production credentials.

import {
  LIMITS,
  parseAssistantRequest,
  parseModelProposal,
  QUOTA_FEATURE_KEY,
  type AssistantTask,
  type Proposal,
  type ValidationFailure,
} from "./contract.ts";
import { buildPrompt } from "./prompts.ts";

export interface QuotaState {
  allowed: boolean;
  used: number;
  limit: number | null;
  isPremium: boolean;
}

export interface ReservationResult {
  state: "reserved" | "in_flight" | "completed" | "unavailable";
  proposal?: Proposal;
}

export interface GatewayResult {
  status: number;
  text?: string;
}

/** Structured log entry. Never carries user content — see Deps.log. */
export interface LogEntry {
  requestId: string;
  userId?: string;
  task?: AssistantTask;
  status: number;
  durationMs: number;
  quota: "checked" | "consumed" | "not_consumed" | "denied" | "duplicate";
  gateway?: "ok" | "rate_limited" | "credits" | "error" | "interrupted";
  failure?: string;
}

export interface Deps {
  verifyUser(token: string): Promise<{ userId: string } | null>;
  /** Non-incrementing entitlement + quota check. */
  checkQuota(token: string, userId: string): Promise<QuotaState>;
  /** Commits exactly one unit; called only after a validated proposal. */
  consumeQuota(token: string, userId: string): Promise<QuotaState>;
  /** Atomic per-(user, requestId) reservation. Must be durable. */
  reserve(userId: string, requestId: string, task: AssistantTask): Promise<ReservationResult>;
  complete(userId: string, requestId: string, proposal: Proposal): Promise<void>;
  /** Releases a reservation so a genuine retry is possible and nothing is billed. */
  release(userId: string, requestId: string): Promise<void>;
  generate(prompt: { system: string; user: string }): Promise<GatewayResult>;
  log(entry: LogEntry): void;
  now?(): number;
}

const json = (body: unknown, status: number, cors: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const failure = (
  requestId: string,
  status: number,
  code: string,
  quota: QuotaState | null,
  cors: Record<string, string>,
) =>
  json(
    {
      version: 2,
      requestId,
      proposal: null,
      error: code,
      usage: {
        consumed: false,
        used: quota?.used ?? 0,
        limit: quota?.limit ?? null,
      },
    },
    status,
    cors,
  );

const VALIDATION_STATUS: Record<ValidationFailure, number> = {
  not_v2: 400,
  malformed_json: 400,
  shape: 422,
  request_id: 422,
  task: 422,
  provenance: 422,
  instruction_empty: 422,
  instruction_too_long: 422,
  context_empty: 422,
  context_too_many: 422,
  context_duplicate_id: 422,
  cv_context: 422,
  context_item_too_long: 422,
  context_total_too_long: 422,
};

/**
 * Handles one already-parsed version-2 body.
 *
 * Ordering is deliberate: validate → authenticate → reserve idempotently →
 * entitlement → gateway → validate output → commit exactly one unit. Any
 * failure after reservation releases it, so a failed request never bills.
 */
export async function handleV2(
  body: unknown,
  token: string,
  deps: Deps,
  cors: Record<string, string>,
): Promise<Response> {
  const clock = deps.now ?? (() => Date.now());
  const started = clock();
  const requestId =
    body && typeof body === "object" && typeof (body as { requestId?: unknown }).requestId === "string"
      ? (body as { requestId: string }).requestId
      : "unknown";

  const parsed = parseAssistantRequest(body);
  if (!parsed.ok) {
    const status = VALIDATION_STATUS[parsed.failure];
    deps.log({ requestId, status, durationMs: clock() - started, quota: "not_consumed", failure: parsed.failure });
    return failure(requestId, status, parsed.failure, null, cors);
  }
  const request = parsed.request;

  const user = await deps.verifyUser(token);
  if (!user) {
    deps.log({ requestId, task: request.task, status: 401, durationMs: clock() - started, quota: "not_consumed", failure: "unauthorized" });
    return failure(requestId, 401, "unauthorized", null, cors);
  }

  const reservation = await deps.reserve(user.userId, request.requestId, request.task);
  if (reservation.state === "unavailable") {
    deps.log({ requestId, userId: user.userId, task: request.task, status: 503, durationMs: clock() - started, quota: "not_consumed", failure: "idempotency_unavailable" });
    return failure(requestId, 503, "idempotency_unavailable", null, cors);
  }
  if (reservation.state === "in_flight") {
    // A concurrent duplicate must never reach billable execution.
    deps.log({ requestId, userId: user.userId, task: request.task, status: 409, durationMs: clock() - started, quota: "duplicate" });
    return failure(requestId, 409, "duplicate_in_flight", null, cors);
  }
  if (reservation.state === "completed") {
    const quota = await deps.checkQuota(token, user.userId);
    deps.log({ requestId, userId: user.userId, task: request.task, status: 200, durationMs: clock() - started, quota: "duplicate" });
    return json(
      {
        version: 2,
        requestId: request.requestId,
        proposal: reservation.proposal ?? null,
        usage: { consumed: false, used: quota.used, limit: quota.limit },
      },
      reservation.proposal ? 200 : 409,
      cors,
    );
  }

  const quota = await deps.checkQuota(token, user.userId);
  if (!quota.allowed) {
    await deps.release(user.userId, request.requestId);
    deps.log({ requestId, userId: user.userId, task: request.task, status: 402, durationMs: clock() - started, quota: "denied" });
    return failure(requestId, 402, "quota_exhausted", quota, cors);
  }

  let result: GatewayResult;
  try {
    result = await deps.generate(buildPrompt(request));
  } catch {
    await deps.release(user.userId, request.requestId);
    deps.log({ requestId, userId: user.userId, task: request.task, status: 502, durationMs: clock() - started, quota: "not_consumed", gateway: "interrupted", failure: "gateway_interrupted" });
    return failure(requestId, 502, "gateway_unavailable", quota, cors);
  }

  if (result.status === 429 || result.status === 402 || result.status < 200 || result.status >= 300 || !result.text) {
    await deps.release(user.userId, request.requestId);
    const status = result.status === 429 ? 429 : result.status === 402 ? 402 : 502;
    const gateway = result.status === 429 ? "rate_limited" : result.status === 402 ? "credits" : "error";
    deps.log({ requestId, userId: user.userId, task: request.task, status, durationMs: clock() - started, quota: "not_consumed", gateway });
    return failure(requestId, status, gateway === "rate_limited" ? "rate_limited" : gateway === "credits" ? "ai_credits_exhausted" : "gateway_error", quota, cors);
  }

  const validated = parseModelProposal(result.text, request.task, request.context.map((item) => item.id));
  if (!validated.ok) {
    await deps.release(user.userId, request.requestId);
    deps.log({ requestId, userId: user.userId, task: request.task, status: 422, durationMs: clock() - started, quota: "not_consumed", gateway: "ok", failure: validated.failure });
    return failure(requestId, 422, "no_safe_proposal", quota, cors);
  }

  if (request.task === "cv.rewrite_bullet") {
    const citesEvidence = validated.proposal.sourceContextIds.some((id) => id.startsWith("evidence-"));
    const citesRequirement = validated.proposal.sourceContextIds.some((id) => id.startsWith("requirement-"));
    if (!citesEvidence || !citesRequirement) {
      await deps.release(user.userId, request.requestId);
      deps.log({ requestId, userId: user.userId, task: request.task, status: 422, durationMs: clock() - started, quota: "not_consumed", gateway: "ok", failure: "model_missing_grounding" });
      return failure(requestId, 422, "no_safe_proposal", quota, cors);
    }
  }

  const committed = await deps.consumeQuota(token, user.userId);
  await deps.complete(user.userId, request.requestId, validated.proposal);
  deps.log({ requestId, userId: user.userId, task: request.task, status: 200, durationMs: clock() - started, quota: "consumed", gateway: "ok" });

  return json(
    {
      version: 2,
      requestId: request.requestId,
      proposal: validated.proposal,
      usage: { consumed: true, used: committed.used, limit: committed.limit },
    },
    200,
    cors,
  );
}

export { LIMITS, QUOTA_FEATURE_KEY };
