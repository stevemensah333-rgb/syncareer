## Plan: Hybrid free-content learning model in the Learn tab

Replace the current Coursera/Udemy/edX-only course suggestions with a **two-tier system**:

1. **Free Path (default, primary)** — YouTube videos + curated free platforms (freeCodeCamp, Khan Academy, MIT OpenCourseWare, CS50, The Odin Project, Codecademy free tier, Google Digital Garage, HubSpot Academy, etc.)
2. **Premium Path (optional, collapsed)** — Coursera/edX/Udemy as upgrade pathway for students who want certificates

This eliminates paywall friction for the Ghana/West Africa audience while keeping the existing skill-validation loop intact.

---

### What the user will see

Each skill gap card in `Learn` will now show two clearly-labeled tabs/sections:

```text
┌─ Communication Skills ──────────────────── 35% mastery ─┐
│                                                          │
│  [ Free Path ]  [ Premium Path ]                         │
│                                                          │
│  ▶ Public Speaking Masterclass                           │
│    YouTube · TEDx · 12 min · Free                        │
│    [ Watch ] [ Save ] [ Mark Complete ]                  │
│                                                          │
│  ▶ Effective Communication for Professionals             │
│    freeCodeCamp · 2h video · Free                        │
│    [ Watch ] [ Save ] [ Mark Complete ]                  │
│                                                          │
│  ─ Want a certificate? ──────────────────                │
│  [ See premium options ▾ ]                               │
└──────────────────────────────────────────────────────────┘
```

When the user clicks "Watch" on a YouTube item, it opens an **embedded player in a dialog** (not a new tab), so they stay inside Syncareer. They can mark complete and trigger the validation quiz right after watching.

Existing behavior preserved:
- Save / Unsave / Mark Complete → triggers `generate-module-quiz` → updates mastery
- Saved Courses section still works
- Streak tracking still works

### Source strategy (no scraping needed)

We use **YouTube Data API v3 search** server-side (free tier: 10,000 units/day = ~100 searches; more than enough). This is cleaner, more reliable, and fully ToS-compliant compared to scraping.

For non-YouTube free platforms, we use a **curated source registry** (hand-maintained JSON in the edge function) mapping skill keywords → known free course URLs from trusted providers. This is faster, higher-quality, and avoids scraping fragility. Examples:
- `JavaScript` → freeCodeCamp JS course, The Odin Project, MDN tutorials
- `Python` → CS50P (Harvard, free), freeCodeCamp Python, Google's Python Class
- `Marketing` → HubSpot Academy, Google Digital Garage, Meta Blueprint free
- `Data Analysis` → Khan Academy Statistics, Google Data Analytics free preview

Firecrawl is **not** needed for this — it would be overkill and slower.

### Trust & quality filters for YouTube

To avoid recommending low-quality videos:
- Filter by minimum view count (≥ 50k)
- Filter by minimum duration (≥ 5 min — excludes shorts/clickbait)
- Whitelist of high-quality channels gets priority boost: `freeCodeCamp.org`, `CS50`, `Fireship`, `Traversy Media`, `The Net Ninja`, `Khan Academy`, `MIT OpenCourseWare`, `TED-Ed`, `HubSpot`, `Google Career Certificates`, `Coursera` (their own free YouTube content), `Crash Course`, `3Blue1Brown`
- Sort by relevance, then by view count

---

### Technical changes

**1. New edge function: `suggest-free-resources`**
Replaces calls to `suggest-courses` for the free path. Takes `{ skillName, careerPath, major }` and returns:
```ts
{
  youtube: [{ title, channel, videoId, duration, viewCount, thumbnailUrl, url }],
  curated: [{ title, provider, url, description, isFree: true }]
}
```
- Calls YouTube Data API v3 (`search.list` + `videos.list` for stats)
- Looks up curated registry for the skill
- Caches per-(skill, career_path) for 7 days in a new `cached_free_resources` table to stay under YouTube quota

**2. Update existing `suggest-courses` edge function**
Becomes the "premium path" — already returns Coursera/Udemy/edX. No change to its logic, just relabeled in UI as optional.

**3. New component: `YouTubePlayerDialog.tsx`**
- Wraps `<iframe src="youtube.com/embed/{videoId}" />` in a shadcn Dialog
- Shows title, channel, duration above the player
- "Mark as Watched" button that triggers existing validation flow

**4. Update `SkillGapCard.tsx`**
- Add tab switcher: `[Free Path] [Premium Path]`
- Free path renders YouTube items + curated items with new layout
- Premium path renders existing Coursera/Udemy/edX cards (collapsed by default with "See premium options" disclosure)
- Wire YouTube items to open `YouTubePlayerDialog` instead of external link

**5. Update `useAICourses` hook in `Learn.tsx`**
- Rename to `useSkillResources`
- Fetch both free + premium in parallel: one call to `suggest-free-resources`, one to existing `suggest-courses`
- Return `{ freeResources, premiumCourses }` shape

**6. New table: `cached_free_resources`**
```sql
CREATE TABLE public.cached_free_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name text NOT NULL,
  career_path text NOT NULL,
  payload jsonb NOT NULL,  -- { youtube: [...], curated: [...] }
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  UNIQUE (skill_name, career_path)
);
ALTER TABLE public.cached_free_resources ENABLE ROW LEVEL SECURITY;
-- Read-only for authenticated users (cache is shared across users by design)
CREATE POLICY "Authenticated users can read cache"
  ON public.cached_free_resources FOR SELECT
  TO authenticated USING (true);
```
Edge function uses the service role key to write to it.

**7. Curated registry**
Store as `supabase/functions/suggest-free-resources/curated.json` — easy to update without redeploys to other functions. Initial seed covers the top 25 majors × 3-5 free resources each.

**8. Save/validate compatibility**
The existing `user_course_progress` table already supports any URL/title. YouTube videos are saved as `course_title = video title`, `course_url = youtube URL`, `provider = 'YouTube · {channel}'`. No schema change needed.

### Required secret

`YOUTUBE_API_KEY` — free Google Cloud key, takes ~3 minutes to create at console.cloud.google.com → enable YouTube Data API v3 → create API key. I'll request it via the secrets tool when we start implementation.

### Out of scope

- No scraping of YouTube (uses official API)
- No video transcription / AI summarization (could be a v2)
- No changes to mastery quiz logic — same `generate-module-quiz` flow
- No removal of premium courses — they stay as opt-in upgrade path
- No changes to CV scanner integration — still feeds skill gaps the same way

### Why this beats pure scraping

- **YouTube API is free at our scale** — 10k units/day ≥ 100 searches; with 7-day cache per skill, we'll use < 5% of quota even at thousands of users
- **No anti-bot risk** — official API, won't break
- **Faster** — direct API < 200ms vs scraping > 2s
- **Better metadata** — view counts, durations, channel info come baked in for quality filtering
- **freeCodeCamp etc. are handled via curated registry** — more accurate than scraping their site

### Cost impact

- YouTube API: $0
- Lovable AI usage: unchanged (same `generate-module-quiz` calls)
- Supabase: negligible (one tiny cache table)
- **Net: zero added cost, removes paywall friction for students**
