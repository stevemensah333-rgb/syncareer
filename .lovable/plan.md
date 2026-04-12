

# Market Analysis Improvements Plan

## Summary
Five improvements to the Market Analysis feature: region selector, resilient AI parsing, empty states, export/print, and skill gap overlay.

---

## Changes

### 1. Region Selector (Analysis.tsx)
Add a `Select` dropdown next to the header letting users pick a region (Global, North America, Europe, Africa, Asia, Middle East, Latin America). Pass the selected region to `useMarketIntelligence(major, region)`. The hook already accepts a `region` parameter -- just need UI to control it via `useState`.

### 2. Resilient JSON Parsing (Edge Function)
Wrap `JSON.parse(rawContent)` in a try-catch in `market-intelligence/index.ts`. If parsing fails:
- Strip markdown fences (` ```json ... ``` `) and retry
- If still fails, return a 502 with `"AI returned malformed data"` instead of crashing with a 500

### 3. Empty State Handling (MarketOverviewTab + CareerOutlookTab)
Add checks for empty arrays (`hard_skills.length === 0`, etc.) and render helpful empty-state messages instead of blank sections. For example: "No skill data available for this major yet."

### 4. Export / Print Button (Analysis.tsx)
Add a "Download Report" button next to the Refresh button. Uses `window.print()` with a print-friendly CSS media query, or generates a simple text/PDF summary of the current data using the browser print dialog.

### 5. Skill Gap Overlay (MarketOverviewTab)
Fetch the user's skills from the `user_skills` table via the existing Supabase client. Overlay a marker or secondary bar on the Hard Skills demand chart showing which skills the user already has vs. which they're missing. Display a small "You have this" badge next to matched skills.

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/Analysis.tsx` | Add region state, Select dropdown, Download button |
| `src/hooks/useMarketIntelligence.ts` | No changes needed (already supports region param) |
| `supabase/functions/market-intelligence/index.ts` | Add resilient JSON parsing with fence stripping |
| `src/components/analysis/MarketOverviewTab.tsx` | Add empty states, skill gap overlay with user_skills lookup |
| `src/components/analysis/CareerOutlookTab.tsx` | Add empty states for forecast/outlook arrays |

---

## Technical Notes

- Region selector uses the existing `Select` UI component -- no new dependencies
- Skill gap overlay fetches `user_skills` client-side via `supabase.from('user_skills').select(...)` and matches against `hard_skills[].skill` using case-insensitive comparison
- Export uses `window.print()` -- lightweight, no library needed
- Edge function parsing fix is backward-compatible; valid JSON still works as before

