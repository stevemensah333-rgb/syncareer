## Redesign the Syncareer landing page in the Keitimas/Framer aesthetic

I scrolled through the full Framer template — homepage and `/about` — and captured every recurring pattern. The site is built from a small set of reusable "blocks" stacked on cream sections, bookended by a dark photographic hero and a dark photographic CTA. Here's everything I'm porting.

### Building blocks observed (will recreate all of them)

1. **Floating pill nav** — centered, dark capsule with small icons + labels, sits over hero
2. **Photographic hero** — full-bleed warm image (mountains/forest), giant **serif** headline (very tight tracking), small subhead, two pill CTAs (solid black + white outlined)
3. **Page intro section** — cream background, hairline column dividers, left column = serif H2, right column = body copy, stat row underneath with **orange-accented serif numerals** (10, 500, 92%) over small uppercase labels
4. **"Why Choose" grid** — cream section, centered serif H2, then 2×3 grid of cards: tiny orange numeral (001-006) → serif title → body copy, hairline dividers between cells
5. **Two-column feature list** — cream section, centered serif H2, image on left, right column = stacked feature rows (small icon + serif title + 1-line body), separated by whitespace
6. **Process section** (4 numbered steps) — same hairline-divider treatment as the "Why" grid but in a 4-column row
7. **Services / image cards** — 3 stacked image-led cards (image, serif title, 1-line copy)
8. **Success Stories carousel** — testimonial cards: portrait, big serif quote, two columns "Challenge / Solution", name + role
9. **Final CTA** — same dark photographic background as hero, smaller serif headline + single black pill button
10. **Footer** — dark, two-row: left = "Email me at" + address, right = nav links in serif; bottom row = copyright + privacy

### What changes in the code

**Foundation**
- Add **Instrument Serif** (free, Google Fonts) — perfect match for the Keitimas headline font. Wired as `font-serif` in `tailwind.config.ts`.
- Add a warm cream token (`--landing-cream`) and a soft warm-orange accent (`--landing-amber`) scoped to landing components only — does **not** touch in-app dark/light tokens or your teal brand color. Teal stays the brand accent on CTAs; warm amber is used only for the small numerals (001, 002, stats) to match the editorial vibe.
- Add `Instrument Serif` link to `index.html`.

**Components rebuilt** (all in `src/components/landing/`)
- `LandingBackground.tsx` → split: hero gets a photographic dark image with subtle vignette; sections below use cream. No more 70% black overlay over the whole page.
- `LandingHeader.tsx` → centered floating dark pill nav with small lucide icons (Home / Sparkles for Assessment / Tag for Pricing / LogIn for Sign In)
- `HeroSection.tsx` → giant serif headline, small white subhead, two pill CTAs (solid black "Take Free Assessment" + white-outlined "Sign in"), kept stats line underneath
- `HowItWorksSection.tsx` → "Process" treatment: 4 numbered hairline-divider columns (Assess → Build CV → Practice → Apply)
- `SolutionSection.tsx` → restyled as the **"Why Syncareer?" 2×3 grid** with amber numerals 001-006 (six reasons: AI Career Match, ATS-Ready CV, Voice Interview Prep, Real Job Listings, Skill Gap Closing, Mentor Access)
- New `FeatureSpotlightSection.tsx` → two-column "image left + feature list right" block, headline "Real Tools, Real Outcomes", three rows (Career Discovery / CV Builder / Interview Simulator)
- New `IntroStatsSection.tsx` → the `/about`-style intro with serif H2 left, body right, stats row (e.g. "2,400+ assessments · 12+ universities · 94% completion")
- New `SuccessStoriesSection.tsx` → testimonial carousel built on your existing shadcn `carousel`: 3 student stories, each with portrait, serif quote, Challenge/Solution two-column body, name + university
- `FinalCTASection.tsx` → recolored: dark photographic block with serif headline "Start your career journey today" + single black pill CTA
- `LandingFooter.tsx` → dark footer matching Keitimas: left email, right serif nav, bottom copyright + privacy
- Keep `AnimatedSection.tsx` exactly as is (already perfect for fade-on-scroll)
- Drop `VideoDemoSection` from the page composition (you don't have a demo video). Component file stays in repo, just not imported.

**Page composition** (`src/pages/Landing.tsx`)
```text
LandingHeader (floating pill, sits over hero)
HeroSection                 ← dark photographic
IntroStatsSection           ← cream, serif H2 + stats
HowItWorksSection           ← cream, 4-step Process
SolutionSection             ← cream, "Why Syncareer" 2×3 grid
FeatureSpotlightSection     ← cream, image + feature list
SuccessStoriesSection       ← cream, testimonial carousel
SocialProofSection          ← cream, university logos (kept)
FinalCTASection             ← dark photographic
LandingFooter               ← dark
```

### One decision needed (image direction)

The Keitimas hero leans hard on a **single beautiful warm photograph**. Pick what Syncareer's hero photo should be:

- **A. Sunlit campus / student with laptop** — warm, human, on-brand for students. Sourced from Unsplash, saved to `src/assets/landing-hero.jpg`. Strongest emotional pull.
- **B. Warm landscape (mountains/sunrise)** — closest match to Keitimas, abstract enough to dodge "stocky" feel, easy to tint warm.
- **C. Soft abstract gradient** — cream→amber→teal gradient with grain texture, no photo. Most "premium SaaS", zero copyright concerns, fastest.

If you don't pick, I'll go with **A** (sunlit student) since Syncareer is explicitly student-focused and a face in the hero converts better than a landscape on a SaaS site. We can swap via Visual Edits in 10 seconds if you don't like it.

### Out of scope

- No changes to in-app pages (Dashboard, CV Builder, Learn, etc.) — landing only.
- No new routes, no auth changes, no nav restructuring.
- Brand teal stays as the primary action color in-app; on the landing page it's used only sparingly (one underline on a hero word + outlined button hover) to keep the editorial Keitimas feel intact.

### Technical notes

- 6 files edited, 3 new section components, 1 new font, 1 hero image asset.
- All sections use existing `AnimatedSection` for scroll-in motion.
- Carousel uses existing shadcn `carousel` (already installed).
- Mobile: pill nav collapses to a single hamburger button (kept simple — Keitimas itself just hides nav on mobile).
- Lighthouse-friendly: hero image lazy-loaded with `fetchpriority="high"`, font preconnected.

One shot, one approval needed (image choice A/B/C — defaulting to A if you say "go").
