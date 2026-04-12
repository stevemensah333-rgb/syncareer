

# Landing Page Assessment & Improvement Plan

## Current Issues

### Critical: Page doesn't scroll
The `html, body { h-full }` in `index.css` (line 106) prevents scrolling on the landing page. The SolutionSection, VideoDemoSection, SocialProofSection, FinalCTA, and Footer are all rendered but completely invisible — users only see the hero. This means 80% of the landing page content is hidden.

### "Create Account" button is nearly invisible
The white outline button blends into the lighter areas of the background image. On mobile it's almost unreadable.

### Background image text conflict
The background image contains "SynCareer — Where Ambition meets Opportunity" text baked into the image, which competes with the hero headline. Two competing headlines on screen at once is confusing.

### No mobile hamburger menu
The header nav links (Features, Demo) are hidden on mobile via `hidden md:flex`, but there's no mobile menu alternative.

---

## Improvement Plan

### 1. Fix scrolling (Critical)
Change `h-full` to `min-h-full` on `html, body` in `index.css` so the page can scroll past the viewport height. This will immediately reveal all 5 sections.

### 2. Fix "Create Account" button visibility
Change the outline button to use a semi-transparent white background (`bg-white/20`) so it's visible regardless of what part of the background image is behind it.

### 3. Clean up background image overlap
Add a stronger overlay or larger blur specifically behind the hero text area so the baked-in background text doesn't compete with the headline.

### 4. Add mobile navigation
Add a hamburger menu icon on mobile that opens a sheet/drawer with the nav links (Features, Demo, Log in, Get Started).

### 5. Add a "How It Works" micro-section
Between Hero and SolutionSection, add a simple 3-step strip: "1. Take Assessment → 2. Build Your CV → 3. Practice Interviews". This gives visitors an immediate mental model before scrolling further.

### 6. Add social proof numbers to hero
Below the subtitle, add a small stats bar: "2,400+ assessments taken · 12+ universities · 100% free to start". Numbers build instant trust.

### 7. Improve CTA hierarchy
The hero has two CTAs that compete. Make "Take Free Assessment" larger and more prominent. Make "Create Account" smaller text-link style, not a full button.

---

## Technical Changes

| File | Change |
|------|--------|
| `src/index.css` (line 106) | Change `h-full` to `min-h-full` |
| `src/components/landing/HeroSection.tsx` | Fix button visibility, add stats bar, adjust CTA hierarchy |
| `src/components/landing/LandingBackground.tsx` | Strengthen overlay behind hero area |
| `src/components/landing/LandingHeader.tsx` | Add mobile hamburger menu with Sheet component |
| `src/components/landing/HowItWorksSection.tsx` | Create new 3-step strip component |
| `src/pages/Landing.tsx` | Insert HowItWorksSection between Hero and Solution |

