import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import type { AssistantTask as AnalyticsAssistantTask } from '@/services/analyticsEvents';

function toCountBucket(count: number): '1' | '2' | '3_plus' {
  if (count <= 1) return '1';
  if (count === 2) return '2';
  return '3_plus';
}

export const assistantTasks = [
  'opportunity.explain_requirement', 'opportunity.compare_evidence', 'opportunity.research_questions',
  'cv.rewrite_bullet', 'application.draft_follow_up', 'application.clarify_next_action',
  'application.organise_notes', 'interview.explain_feedback', 'interview.practice_question',
] as const;

export type AssistantTask = typeof assistantTasks[number];
export type ContextProvenance = 'opportunity' | 'job_description' | 'primary_cv' | 'selected_cv_text' | 'application_notes' | 'interview_report';

export interface AssistantContextItem {
  id: string;
  label: string;
  provenance: ContextProvenance;
  content: string;
  optional?: boolean;
  personal?: boolean;
}

const responseSchema = z.object({
  version: z.literal(2),
  requestId: z.string().min(1),
  proposal: z.object({
    kind: z.enum(['explanation', 'rewrite', 'draft', 'outline', 'practice_question']),
    text: z.string().trim().min(1).max(12_000),
    sourceContextIds: z.array(z.string()).max(12),
  }).nullable(),
  // `limit` is the quota ceiling reported by the entitlement function. It uses
  // -1 (and null) to mean "unlimited", so any integer is valid here.
  usage: z.object({ consumed: z.boolean(), used: z.number().int().nonnegative(), limit: z.number().int().nullable() }),
});

export type AssistantProposal = NonNullable<z.infer<typeof responseSchema>['proposal']>;
export type AssistantRequestErrorCode = 'unauthorized' | 'quota' | 'rate-limit' | 'network' | 'malformed' | 'server' | 'no-proposal' | 'cancelled';

export class AssistantRequestError extends Error {
  constructor(public readonly code: AssistantRequestErrorCode, message: string) { super(message); }
}

/**
 * Requests a contextual proposal. Accepts an optional AbortSignal so callers
 * can cancel an in-flight request when the assistant UI unmounts — the
 * endpoint is a billable AI call, so abandoned requests should stop instead
 * of running to completion with no UI left to show the result.
 */
export async function requestContextualAssistance(task: AssistantTask, instruction: string, context: AssistantContextItem[], signal?: AbortSignal): Promise<AssistantProposal> {
  if (signal?.aborted) throw new AssistantRequestError('cancelled', 'The assistant request was cancelled.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    try {
      captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, {
        task: task as AnalyticsAssistantTask,
        result: 'failure',
        failure_code: 'unauthorized',
      });
    } catch { /* analytics must never break product */ }
    throw new AssistantRequestError('unauthorized', 'Your session has expired. Sign in and try again.');
  }

  try {
    captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_REQUESTED, {
      task: task as AnalyticsAssistantTask,
      context_count_bucket: toCountBucket(context.length),
      includes_optional_personal_context: context.some((item) => Boolean(item.personal)),
    });
  } catch { /* never break */ }

  const requestId = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/career-guidance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      signal,
      body: JSON.stringify({
        version: 2, requestId, task, instruction: instruction.trim(),
        context: context.map(({ id, label, provenance, content }) => ({ id, label, provenance, content })),
      }),
    });
  } catch (cause) {
    // A caller-initiated cancellation is not a product failure: no analytics,
    // and the caller decides whether to surface anything.
    if (signal?.aborted || (cause instanceof DOMException && cause.name === 'AbortError')) {
      throw new AssistantRequestError('cancelled', 'The assistant request was cancelled.');
    }
    try {
      captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, {
        task: task as AnalyticsAssistantTask,
        result: 'failure',
        failure_code: 'network',
      });
    } catch { /* never break */ }
    throw new AssistantRequestError('network', 'The assistant could not be reached. Check your connection and retry.');
  }

  // The caller went away while the response was in flight — drop the result
  // instead of letting a stale proposal land on a closed assistant.
  if (signal?.aborted) throw new AssistantRequestError('cancelled', 'The assistant request was cancelled.');

  if (response.status === 401) {
    try { captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, { task: task as AnalyticsAssistantTask, result: 'failure', failure_code: 'unauthorized' }); } catch {}
    throw new AssistantRequestError('unauthorized', 'Your session has expired. Sign in and try again.');
  }
  if (response.status === 402) {
    try { captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, { task: task as AnalyticsAssistantTask, result: 'failure', failure_code: 'quota' }); } catch {}
    throw new AssistantRequestError('quota', 'Your assistant allowance has been reached.');
  }
  if (response.status === 429) {
    try { captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, { task: task as AnalyticsAssistantTask, result: 'failure', failure_code: 'rate_limit' }); } catch {}
    throw new AssistantRequestError('rate-limit', 'Too many requests. Wait a moment and retry.');
  }
  if (!response.ok) {
    try { captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, { task: task as AnalyticsAssistantTask, result: 'failure', failure_code: 'server' }); } catch {}
    throw new AssistantRequestError('server', 'The assistant could not complete this request. Nothing was changed.');
  }

  const payload = await response.json().catch(() => null);
  const parsed = responseSchema.safeParse(payload);
  if (!parsed.success || parsed.data.requestId !== requestId) {
    try { captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, { task: task as AnalyticsAssistantTask, result: 'failure', failure_code: 'malformed' }); } catch {}
    throw new AssistantRequestError('malformed', 'The assistant returned an unsupported response. Nothing was changed.');
  }
  if (!parsed.data.proposal) {
    try { captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, { task: task as AnalyticsAssistantTask, result: 'failure', failure_code: 'no_proposal' }); } catch {}
    throw new AssistantRequestError('no-proposal', 'No usable proposal was returned. Nothing was changed.');
  }
  const allowedIds = new Set(context.map((item) => item.id));
  if (parsed.data.proposal.sourceContextIds.some((id) => !allowedIds.has(id))) {
    try { captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, { task: task as AnalyticsAssistantTask, result: 'failure', failure_code: 'malformed' }); } catch {}
    throw new AssistantRequestError('malformed', 'The assistant referenced context that was not supplied. Nothing was changed.');
  }

  try {
    captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_FINISHED, {
      task: task as AnalyticsAssistantTask,
      result: 'success',
    });
  } catch { /* never break */ }

  return parsed.data.proposal;
}
