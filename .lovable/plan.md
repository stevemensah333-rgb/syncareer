

# Implementation Plan: Outcome-Driven Syncareer Overhaul

This plan implements everything discussed (excluding pricing/monetization changes) across four areas: Landing Page, Assessment Results, CV Builder, and Interview Simulator.

---

## 1. Landing Page — Simplify and Make Specific

**Current state:** 8 sections (Hero, Problem, Solution, HowItWorks, VideoDemo, SocialProof, Pricing, FinalCTA). Abstract copy ("Turn Uncertainty Into Career Clarity"). Hero text is white on dark overlay — but content sections use light theme, creating a visual clash.

**Changes:**

### a) Simplify to 5 sections (remove Problem, HowItWorks)
- **Landing.tsx**: Remove `ProblemSection` and `HowItWorksSection` imports/renders. Keep: Header, Hero, Solution (3 features only), VideoDemo, SocialProof, FinalCTA, Footer. No Pricing section on landing (user said pricing comes later).
- Merge the "How It Works" 3-step flow INTO the hero subtitle or remove entirely.

### b) Rewrite Hero copy to be specific and outcome-driven
- Headline: "Discover Your Career Path, Build Your CV, Ace the Interview"
- Subtitle: "Take a free 5-minute career assessment and get matched to real career paths — no sign-up needed."
- CTA: "Take Free Assessment" (links to `/assessment` as a guest-accessible route)
- Remove "AI-Powered Career Intelligence" tagline (too abstract)

### c) Simplify SolutionSection to 3 key features
- Keep only: Career Assessment, CV Builder, Interview Simulator
- Remove: Skills Gap, Portfolio Analysis, Career Analytics (these are secondary features)
- Rewrite descriptions to be outcome-focused (e.g., "Build a CV that passes ATS screening and gets callbacks")

### d) Make SocialProof more specific
- Add university context to testimonials (e.g., "Level 300, KNUST" or "UG Graduate, 2025")
- Add a counter line: "Used by students from 12+ Ghanaian universities" (aspirational)

### e) Rewrite FinalCTA
- "Take Your Free Career Assessment" instead of "Create Your Account"
- Supporting text: "5 minutes. No sign-up required. Discover which careers fit you best."

### f) Add WhatsApp share button to header
- Small WhatsApp icon in header that opens `https://wa.me/?text=...` with a pre-filled message

---

## 2. Assessment Results — Connect to Jobs

**Current state:** Results show RIASEC chart, personality radar, skills bar chart, career recommendations with match %, and generic "Next Steps" cards (Interview Prep, Skill Building, Learning Paths).

**Changes:**

### a) Add "Jobs You Qualify For" section after Career Recommendations
- Query `job_postings` table for active jobs matching the user's top career industries
- Show up to 5 matched jobs with title, company, match %, and "Prepare & Apply" button
- If no jobs match, show "No open positions yet — we'll notify you when matching jobs are posted"

### b) Upgrade "Next Steps" to be actionable with links
- "Interview Prep" card: Link to `/interview` with pre-filled role from top career recommendation
- "Build Your CV" card: Link to `/cv-builder`
- "View Opportunities" card: Link to `/markets`

### c) Add WhatsApp share for results
- "Share Your Career Match" button that opens WhatsApp with: "I just discovered my top career match is [Career Title] on Syncareer! Try it: [link]"

---

## 3. CV Builder — Show Job Matches After Save

**Current state:** Save writes to `resumes` table and triggers intelligence recompute. No post-save feedback beyond "CV saved successfully!"

**Changes:**

### a) After saving CV, show matched jobs
- After successful save, query `job_postings` with skills match against the user's CV skills
- Show a toast or inline card: "Your CV matches X open positions" with link to `/markets`

### b) Add WhatsApp share for CV completion
- After PDF download, offer "Share on WhatsApp" — "I just built my professional CV with Syncareer!"

---

## 4. Interview Simulator — Contextualize with Real Roles

**Current state:** Setup form has free-text "Target Job Role" and "Industry" fields, pre-filled from user's major via MAJOR_ROLE_MAP.

**Changes:**

### a) Add "Practice for a real job" option
- Below the manual setup form, add a section: "Or practice for an open position"
- Query active `job_postings` and show top 3-5 that match the user's profile
- Clicking one pre-fills the interview setup (role, industry, difficulty) and optionally pastes the job description into the `jobDescription` field

### b) Post-interview WhatsApp share
- After completing an interview session, offer "Share your score on WhatsApp"

---

## 5. Markets/Opportunities — Use Real Skills from DB

**Current state:** `getUserSkills()` is hardcoded based on major string matching. Does not use `user_skills` table.

**Changes:**

### a) Fetch real skills from `user_skills` table
- Replace the hardcoded `getUserSkills` function with a query to `user_skills` table for the current user
- Fall back to major-based skills only if no `user_skills` records exist

---

## Technical Details

### Files to create:
- `src/components/shared/WhatsAppShareButton.tsx` — Reusable WhatsApp share component

### Files to modify:
- `src/pages/Landing.tsx` — Remove Problem, HowItWorks, Pricing sections
- `src/components/landing/HeroSection.tsx` — New copy, "Take Free Assessment" CTA
- `src/components/landing/SolutionSection.tsx` — Trim to 3 features, outcome-focused copy
- `src/components/landing/SocialProofSection.tsx` — Add university context
- `src/components/landing/FinalCTASection.tsx` — Assessment-focused CTA
- `src/components/landing/LandingHeader.tsx` — Add WhatsApp share icon
- `src/components/assessment/CareerRecommendations.tsx` — Add job matches section, WhatsApp share, actionable next steps with links
- `src/pages/CVBuilder.tsx` — Post-save job match feedback, WhatsApp share on download
- `src/pages/InterviewSimulator.tsx` — "Practice for a real job" section with live job listings
- `src/pages/Markets.tsx` — Fetch real skills from `user_skills` table

### No database changes needed
All required tables (`job_postings`, `user_skills`, `job_applications`) already exist.

