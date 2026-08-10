-- Syncareer feature usage counts — READ-ONLY inspection for the feature-portfolio
-- decision stage (docs/FEATURE_PORTFOLIO_DECISIONS.md).
--
-- How to run (owner only):
--   Lovable Cloud -> SQL editor -> run each statement separately.
--   Save only the numeric results, e.g. into the decision document's evidence
--   section or a private note. Do not export rows.
--
-- Safety:
--   Every statement returns COUNTs or grouped COUNTs only. No table rows,
--   no auth.users data, no queue messages, no secrets are selected.
--   All statements are read-only and safe on the Live database.
--
-- A missing table (relation does not exist) is itself a required evidence point:
-- record it in the decision doc's "Unknowns" section instead of skipping it.

-- ── 0. Platform adoption baseline ────────────────────────────────────────────
select count(*) as profiles_total from public.profiles;
select user_type, count(*) from public.profiles group by user_type;
select count(*) as profiles_onboarded from public.profiles where onboarding_completed is true;
select role, count(*) from public.user_roles group by role;

-- ── 1. Career assessment ─────────────────────────────────────────────────────
select count(*) as assessments_total,
       count(*) filter (where completed_at is not null) as assessments_completed
from public.assessments;
select count(*) as assessment_responses_total from public.assessment_responses;

-- ── 2. CV builder ────────────────────────────────────────────────────────────
select count(*) as resumes_total,
       count(*) filter (where is_primary) as resumes_primary,
       count(distinct user_id) as users_with_resume
from public.resumes;

-- ── 3. Interview simulator ───────────────────────────────────────────────────
select count(*) as mock_interviews_total,
       count(*) filter (where completed_at is not null) as mock_interviews_completed,
       count(*) filter (where overall_score is not null) as mock_interviews_scored
from public.mock_interviews;

-- ── 4. Job discovery / application tracking ──────────────────────────────────
select count(*) as job_postings_total,
       count(*) filter (where is_external) as job_postings_external,
       count(*) filter (where status = 'active') as job_postings_active
from public.job_postings;
select source, count(*) from public.job_postings group by source order by count desc;
select count(*) as saved_jobs_total, count(distinct user_id) as savers from public.saved_jobs;
select status, count(*) from public.job_applications group by status;
select count(distinct applicant_id) as applicants from public.job_applications;
select count(*) as recommendation_outcomes_total from public.recommendation_outcomes;

-- ── 5. Counsellor marketplace ────────────────────────────────────────────────
select count(*) as counsellor_profiles from public.counsellor_details;
select count(*) as counsellors_with_availability from (select distinct counsellor_id from public.counsellor_availability) s;
select status, count(*) from public.counsellor_bookings group by status;
select status, count(*) from public.counsellor_sessions group by status;
select count(*) as counsellor_reviews_total from public.counsellor_reviews;
select verification_status, count(*) from public.counsellor_credentials group by verification_status;
-- counsellor_messages live existence is UNKNOWN (absent from both generated type
-- copies). If this errors with "relation does not exist", record that fact.
select count(*) as counsellor_messages_total from public.counsellor_messages;

-- ── 6. SynAI career chat ─────────────────────────────────────────────────────
-- The tracked app never writes career_guidance_sessions; a zero count confirms
-- chat is stateless client-session only. If the relation is missing, record it.
select count(*) as career_guidance_sessions_total from public.career_guidance_sessions;
-- AI coach usage is also visible in usage_logs (feature_key = 'ai_coach_session').

-- ── 7. Market intelligence / alumni outcomes ─────────────────────────────────
select count(*) as market_intelligence_cache_entries,
       max(updated_at) as last_refresh
from public.market_intelligence_cache;
select count(*) as alumni_outcomes_cache_entries,
       max(updated_at) as last_refresh
from public.alumni_outcomes_cache;
select count(*) as university_insights_rows from public.university_insights;

-- ── 8. Subscriptions / payments ──────────────────────────────────────────────
select status, plan, count(*) from public.subscriptions group by status, plan;
select status, count(*) from public.payments group by status;
-- Feature usage actually consumed (the real activation signal per AI feature):
select feature_key, month, sum(usage_count) as total_uses, count(distinct user_id) as distinct_users
from public.usage_logs group by feature_key, month order by month desc, total_uses desc;

-- ── 9. Referrals ─────────────────────────────────────────────────────────────
select count(*) as referrals_total,
       count(distinct referrer_id) as distinct_referrers
from public.referrals;

-- ── 10. Notifications ────────────────────────────────────────────────────────
select count(*) as notifications_total from public.notifications;
select count(*) as users_with_notification_prefs from public.notification_preferences;

-- ── 11. Feedback (admin burden proxy) ────────────────────────────────────────
select status, count(*) from public.user_feedback group by status;

-- ── 12. Email infrastructure volume (cost proxy) ─────────────────────────────
select count(*) as email_send_log_total from public.email_send_log;
select count(*) as suppressed_emails_total from public.suppressed_emails;

-- ── 13. Skills / intelligence plumbing ───────────────────────────────────────
select count(*) as user_intelligence_profiles_total from public.user_intelligence_profiles;
select count(*) as user_skills_total, count(distinct user_id) as users_with_skills from public.user_skills;
select count(*) as careers_rows from public.careers;

-- ── 14. Legacy/dead verification ─────────────────────────────────────────────
-- Portfolio and learning tables were dropped 2026-07-07/2026-07-12. Each of
-- these SHOULD error with "relation does not exist". If any returns a count
-- instead, STOP and record it in the decision doc before any cleanup.
select count(*) from public.portfolio_projects;   -- expect error
select count(*) from public.learning_paths;       -- expect error
select count(*) from public.user_stats;           -- expect error
