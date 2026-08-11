/**
 * Typed analytics catalogue — single source of truth.
 *
 * Design constraints (from Prompt 0):
 * - No free-text payloads, no CV content, messages, transcripts, job descriptions, names, emails.
 * - Coarse enums/counts only.
 * - All properties validated at runtime via ANALYTICS_PROPERTY_KEYS.
 * - Owner and product question documented in docs/ANALYTICS.md; this file holds the type contract.
 *
 * Event ownership summary (detailed in docs/ANALYTICS.md):
 * - Growth: public_cta_selected, sign_up_started, account_created
 * - Product: onboarding_completed, opportunities_*, application_*, cv_*, interview_*, assessment_*, contextual_*
 * - Eng: device checks, save failures, session failures
 * - AI: contextual_ai_*
 * - Learning: contextual_learning_actioned
 *
 * Retention assumption (needs owner confirmation): 30d raw, 90d aggregated, then deletion.
 * PostHog project must have autocapture=false, pageview=false, session recording disabled (enforced in analytics.ts).
 */

export const ANALYTICS_EVENTS = {
  PAGE_VIEWED: 'page_viewed',
  PUBLIC_CTA_SELECTED: 'public_cta_selected',
  SIGN_UP_STARTED: 'sign_up_started',
  ACCOUNT_CREATED: 'account_created',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  OPPORTUNITIES_VIEWED: 'opportunities_viewed',
  OPPORTUNITY_SAVED: 'opportunity_saved',
  OPPORTUNITY_MARKED_APPLIED: 'opportunity_marked_applied',
  APPLICATION_CREATED: 'application_created',
  APPLICATION_NEXT_ACTION_SET: 'application_next_action_set',
  APPLICATION_STAGE_RECORDED: 'application_stage_recorded',
  APPLICATION_OUTCOME_RECORDED: 'application_outcome_recorded',
  CV_STARTED: 'cv_started',
  CV_MEANINGFUL_SECTION_COMPLETED: 'cv_meaningful_section_completed',
  CV_SAVE_FINISHED: 'cv_save_finished',
  CV_PREVIEWED: 'cv_previewed',
  CV_EXPORTED: 'cv_exported',
  INTERVIEW_SETUP_OPENED: 'interview_setup_opened',
  INTERVIEW_DEVICE_CHECKED: 'interview_device_checked',
  INTERVIEW_SESSION_STARTED: 'interview_session_started',
  INTERVIEW_SESSION_FINISHED: 'interview_session_finished',
  INTERVIEW_RETRIED: 'interview_retried',
  ASSESSMENT_STARTED: 'assessment_started',
  ASSESSMENT_PROGRESS: 'assessment_progress',
  ASSESSMENT_ABANDONED: 'assessment_abandoned',
  ASSESSMENT_RESUMED: 'assessment_resumed',
  ASSESSMENT_COMPLETED: 'assessment_completed',
  CONTEXTUAL_AI_REQUESTED: 'contextual_ai_requested',
  CONTEXTUAL_AI_FINISHED: 'contextual_ai_finished',
  CONTEXTUAL_AI_DECIDED: 'contextual_ai_decided',
  CONTEXTUAL_LEARNING_ACTIONED: 'contextual_learning_actioned',
} as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS];
type AuthMethod = 'email' | 'google';
type UserRole = 'student' | 'career_counsellor' | 'unknown';
export type Surface = 'opportunity' | 'application' | 'cv';
export type AssistantTask = 'opportunity.explain_requirement' | 'opportunity.compare_evidence' | 'opportunity.research_questions' | 'cv.rewrite_bullet' | 'application.draft_follow_up' | 'application.clarify_next_action' | 'application.organise_notes' | 'interview.explain_feedback' | 'interview.practice_question';

export interface AnalyticsEventProperties {
  page_viewed: { route: 'landing' | 'auth' | 'onboarding' | 'dashboard' | 'opportunities' | 'applications' | 'cv_builder' | 'interview' | 'assessment' | 'pricing' | 'settings' | 'other' };
  public_cta_selected: { destination: 'opportunities' | 'assessment'; placement: 'header' | 'hero' | 'final' };
  sign_up_started: { method: AuthMethod; user_role: UserRole };
  account_created: { method: AuthMethod; user_role: UserRole; confirmation_required: boolean };
  onboarding_completed: { user_role: UserRole };
  opportunities_viewed: { view: 'all' | 'saved' };
  opportunity_saved: { source_kind: 'external' | 'native' };
  opportunity_marked_applied: { source_kind: 'external' | 'native' };
  application_created: { origin: 'opportunity' | 'manual' };
  application_next_action_set: { has_due_date: boolean };
  application_stage_recorded: { stage: 'considering' | 'applied' | 'interview' | 'offer' | 'other' };
  application_outcome_recorded: { outcome: 'offered' | 'rejected' | 'withdrawn' };
  cv_started: { entry: 'navigation' | 'application' | 'opportunity' };
  cv_meaningful_section_completed: { section: 'personal' | 'education' | 'experience' | 'projects' | 'activities' | 'skills' };
  cv_save_finished: { result: 'success' | 'failure'; failure_code?: 'validation' | 'authentication' | 'conflict' | 'network' | 'server' | 'unknown' };
  cv_previewed: Record<string, never>;
  cv_exported: { result: 'success' | 'failure'; format: 'pdf' };
  interview_setup_opened: { entry: 'navigation' | 'application' | 'opportunity' };
  interview_device_checked: { result: 'ready' | 'missing' | 'denied' | 'failed' };
  interview_session_started: { mode: 'voice' };
  interview_session_finished: { result: 'completed' | 'failed'; failure_code?: 'network' | 'device' | 'quota' | 'server' | 'unknown' };
  interview_retried: { from: 'device' | 'session' };
  assessment_started: Record<string, never>;
  assessment_progress: { progress_bucket: 25 | 50 | 75 };
  assessment_abandoned: { progress_bucket: 0 | 25 | 50 | 75 };
  assessment_resumed: { progress_bucket: 0 | 25 | 50 | 75 };
  assessment_completed: Record<string, never>;
  contextual_ai_requested: { task: AssistantTask; context_count_bucket: '1' | '2' | '3_plus'; includes_optional_personal_context: boolean };
  contextual_ai_finished: { task: AssistantTask; result: 'success' | 'failure'; failure_code?: 'unauthorized' | 'quota' | 'rate_limit' | 'network' | 'malformed' | 'server' | 'no_proposal' | 'unknown' };
  contextual_ai_decided: { task: AssistantTask; decision: 'accepted' | 'rejected' | 'undone' };
  contextual_learning_actioned: { surface: Surface; action: 'already_know' | 'learning' | 'practice_selected' | 'resource_requested' | 'not_relevant' | 'evidence_opened' };
}

export const ANALYTICS_PROPERTY_KEYS: { [K in AnalyticsEventName]: readonly (keyof AnalyticsEventProperties[K])[] } = {
  page_viewed: ['route'], public_cta_selected: ['destination', 'placement'], sign_up_started: ['method', 'user_role'], account_created: ['method', 'user_role', 'confirmation_required'], onboarding_completed: ['user_role'],
  opportunities_viewed: ['view'], opportunity_saved: ['source_kind'], opportunity_marked_applied: ['source_kind'], application_created: ['origin'], application_next_action_set: ['has_due_date'], application_stage_recorded: ['stage'], application_outcome_recorded: ['outcome'],
  cv_started: ['entry'], cv_meaningful_section_completed: ['section'], cv_save_finished: ['result', 'failure_code'], cv_previewed: [], cv_exported: ['result', 'format'],
  interview_setup_opened: ['entry'], interview_device_checked: ['result'], interview_session_started: ['mode'], interview_session_finished: ['result', 'failure_code'], interview_retried: ['from'],
  assessment_started: [], assessment_progress: ['progress_bucket'], assessment_abandoned: ['progress_bucket'], assessment_resumed: ['progress_bucket'], assessment_completed: [],
  contextual_ai_requested: ['task', 'context_count_bucket', 'includes_optional_personal_context'], contextual_ai_finished: ['task', 'result', 'failure_code'], contextual_ai_decided: ['task', 'decision'], contextual_learning_actioned: ['surface', 'action'],
};
