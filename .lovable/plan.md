

# Implementation Plan: Engagement & Retention Features

## Overview
Five features to increase daily usage and retention: guided post-assessment journey, job match email digests, referral system, career readiness dashboard score, and university-specific context.

---

## 1. Guided Journey After Assessment

**Problem:** After seeing results, users don't know what to do next.

**Solution:** Replace the current static "Next Steps" cards in `CareerRecommendations.tsx` with a sequential guided journey component.

- Create `src/components/assessment/GuidedJourney.tsx` — a stepped card that tracks which steps the user has completed (assessment done, CV built, interview practiced, job applied)
- Query `resumes`, `mock_interviews`, `job_applications` to check completion status
- Show the *next uncompleted step* prominently with a primary CTA, dim completed steps with checkmarks
- Each step links directly to the relevant tool with pre-filled context (e.g., top career title passed to interview simulator)
- Add a progress bar: "2 of 4 steps complete"
- Replace the existing Next Steps section in `CareerRecommendations.tsx` with this component

---

## 2. Job Match Email Digests

**Problem:** No retention hook to bring users back.

**Solution:** A scheduled edge function that sends weekly email digests of new job matches.

### Database
- Add `last_digest_sent_at` column to `notification_preferences` table (timestamp, nullable)

### Edge Function: `job-digest`
- Runs weekly via `pg_cron` (Sundays at 9am UTC)
- For each user with `email_enabled = true` and `weekly_digest = true`:
  - Fetch their assessment interests from `assessments`
  - Query `job_postings` created since `last_digest_sent_at`
  - Match by industry/skills overlap
  - Send email via Resend with job count + top 5 listings
  - Update `last_digest_sent_at`
- Uses service role key (server-to-server, no auth header)

### UI
- The `weekly_digest` preference toggle already exists in `notification_preferences` — just ensure the Settings notification panel surfaces it clearly

---

## 3. Referral Loop

**Problem:** No viral growth mechanism.

### Database
- Create `referrals` table: `id`, `referrer_id` (uuid), `referee_id` (uuid, nullable), `referral_code` (text, unique), `status` (text: pending/completed), `reward_granted` (boolean), `created_at`
- RLS: users can read/create their own referrals

### Implementation
- On signup, generate a unique referral code and insert into `referrals` (trigger or edge function)
- Add `referral_code` field to `profiles` table for quick access
- Create `src/components/referral/ReferralCard.tsx` — shows on the student dashboard/settings:
  - "Share your code, both get 7 days of premium"
  - Copy link button, WhatsApp share button
  - Count of successful referrals
- When a new user signs up with a referral code (via URL param `?ref=CODE`):
  - Store the code during signup flow
  - After email verification, mark referral as completed
  - Grant both users 7-day premium extension (update `subscriptions.current_period_end`)
- Edge function `process-referral` handles the reward logic securely

---

## 4. Career Readiness Score on Dashboard

**Problem:** No single metric creating a game loop.

**Solution:** The `useCareerReadiness` hook already computes an overall score (0-100%). Surface it prominently.

### Changes
- Create `src/pages/Dashboard.tsx` as the new student home page
- Move the student default route from `/portfolio` to `/dashboard` in `RoleRoute.tsx`
- Dashboard includes:
  - `ReadinessOverview` component (already exists) showing the score + level
  - Quick stats: applications this month, interview score, CV strength
  - "Continue your journey" section (the guided journey component from #1)
  - Recent job matches
  - Referral card from #3
- The score updates automatically as users complete assessment, build CV, do interviews, add portfolio projects (already computed by `useCareerReadiness`)

### Sidebar
- Add "Dashboard" as the first nav item in `StudentLayout.tsx` and `Sidebar.tsx`

---

## 5. University-Specific Context

**Problem:** Content feels generic. Students want to see data relevant to their school.

### Database
- Create `university_insights` table: `id`, `university_name` (text), `major` (text), `top_careers` (jsonb), `graduate_outcomes` (jsonb), `last_updated` (timestamp)
- Pre-populate with data for top Ghanaian universities (UG, KNUST, Ashesi, UCC, etc.)
- RLS: anyone authenticated can read

### Edge Function: `compute-university-insights`
- Uses AI (Lovable AI Gateway) to generate insights based on university + major
- Caches results in `university_insights` table
- Called on-demand when a student first views their dashboard and no cached data exists

### UI
- Add `UniversityInsightsCard` to the Dashboard:
  - "Top careers for [Major] students at [University]"
  - "What [University] graduates are doing"
  - Shows top 5 career paths with match percentages
- Data sourced from `student_details.school` and `student_details.major`

---

## Technical Summary

### New Files
- `src/pages/Dashboard.tsx`
- `src/components/assessment/GuidedJourney.tsx`
- `src/components/referral/ReferralCard.tsx`
- `src/components/dashboard/UniversityInsightsCard.tsx`
- `supabase/functions/job-digest/index.ts`
- `supabase/functions/process-referral/index.ts`
- `supabase/functions/compute-university-insights/index.ts`

### Modified Files
- `src/App.tsx` — add Dashboard route
- `src/components/auth/RoleRoute.tsx` — change student home to `/dashboard`
- `src/components/layout/StudentLayout.tsx` — add Dashboard nav item
- `src/components/layout/Sidebar.tsx` — add Dashboard nav item
- `src/components/assessment/CareerRecommendations.tsx` — replace Next Steps with GuidedJourney
- `src/pages/Settings.tsx` or notification settings — surface weekly digest toggle

### Database Migrations
1. Add `last_digest_sent_at` to `notification_preferences`
2. Add `referral_code` to `profiles`
3. Create `referrals` table with RLS
4. Create `university_insights` table with RLS

### Scheduled Jobs
- `job-digest`: weekly (Sunday 9am UTC)
- Referral processing: triggered on signup completion

