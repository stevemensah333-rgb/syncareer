

## Plan: CV Builder → Learn Integration (close the skill-gap loop)

Wire the existing `analyze-portfolio` Edge Function into the CV Builder UI, then surface a tight "skills you have vs. skills you need" panel that deep-links to Learn for each missing skill. No new tab, no new page — strengthen the Guided Journey spine.

### What the user will see

**In CV Builder (`/cv-builder`):**

1. A new **"Upload Existing CV"** button next to *Preview / Save / Download PDF* (top right of the form). Accepts PDF or DOCX, max 5 MB.
2. While analyzing: an inline progress card replaces the form area showing "Reading your CV…" with a spinner.
3. After analysis completes:
   - Form tabs auto-fill with extracted Personal, Education, Experience, Projects, and Skills (toast: *"CV analyzed — review and edit each section"*).
   - The CV Strength Score in the sidebar updates from the AI-returned `scores.overall`.
4. A new **"Skill Gap Analysis"** card appears in the sidebar, *below* the Strength Score and *above* the AI Assistant. It shows:
   - **Roles you fit**: 3–5 chips from `suggestedRoles` (e.g. *Junior Data Analyst*, *Marketing Associate*).
   - **Skills to develop**: up to 6 chips from `missingSkills`. Each chip is clickable.
   - A primary button: **"Close these gaps in Learn →"** that navigates to `/learn?focus=<skill1>,<skill2>,...`.

**In Learn (`/learn`):**

5. When `?focus=` is present in the URL, a new banner appears at the top of the page:
   > "Based on your CV, focus on these skills: [chip] [chip] [chip]" — with a *Clear focus* link.
6. The "Skill Gaps & Resources" section reorders so focused skills come first, and each focused skill card auto-expands.
7. If a focused skill isn't already in the user's career framework, it's still injected as a temporary card so the user always sees the courses for what their CV said they were missing.

### Files to add

| File | Purpose |
|------|---------|
| `src/components/cv-builder/CVUploadDialog.tsx` | Dialog with drag-drop file picker, file validation (PDF/DOCX, ≤5 MB), base64 conversion, `analyze-portfolio` invocation, error handling. |
| `src/components/cv-builder/CVSkillGapPanel.tsx` | Sidebar card rendering `suggestedRoles` chips + `missingSkills` chips + the *Close these gaps in Learn* CTA. |
| `src/hooks/useCVAnalysis.ts` | Manages analysis state (`idle / uploading / analyzing / done / error`), holds the structured response from `analyze-portfolio`, and exposes `analyzeFile(file)` + `applyToCVData(setCVData)`. |

### Files to modify

| File | Change |
|------|--------|
| `src/pages/CVBuilder.tsx` | Add **Upload Existing CV** button → opens `CVUploadDialog`. On success, call `applyToCVData(setCVData)` to merge AI-extracted fields into existing CV state (don't overwrite non-empty user fields). Render `<CVSkillGapPanel />` in the sidebar when analysis result exists. |
| `src/pages/Learn.tsx` | Read `?focus=` from `useSearchParams`. Inject focused skills into the rendered list, auto-expand their `SkillGapCard`s, render a dismissible "Focused from your CV" banner. |
| `src/components/learn/SkillGapCard.tsx` | Accept optional `defaultExpanded` prop (so focused skills open automatically). |

### How extracted data merges into the CV form

The `analyze-portfolio` response includes free-form analysis text and structured `extractedSkills`, `experienceSummary`, `scores`, `suggestedRoles`, `missingSkills`. Since the function does **not** currently return structured `personal/education/experience/projects` blocks, we will:

- **Skills**: merge `extractedSkills[].name` into `cvData.skills` (dedupe, keep user's existing).
- **Experience summary**: surface `experienceSummary.keyAchievements` as a *suggested bullets* hint inside the AI Assistant sidebar — user clicks to insert into the active Experience entry.
- **Personal / Education / Experience details**: the function would need a small extension to return these structured. We will extend `analyze-portfolio` to add `extractedPersonal`, `extractedEducation`, and `extractedExperience` to the tool schema (additive, backward-compatible), and merge them into `cvData` only where current fields are empty.
- **Strength Score**: feed `scores.overall` into the sidebar score card alongside the existing `useCVStrengthScore` heuristic (show whichever is more recent / both as "AI score" + "Heuristic score").

### Edge function change (`supabase/functions/analyze-portfolio/index.ts`)

Add three optional properties to the existing `analyze_portfolio` tool schema:

- `extractedPersonal`: `{ firstName, lastName, email, phone, linkedIn, nationality }`
- `extractedEducation`: `{ university, degree, location, graduationDate, gpa }`
- `extractedExperience`: `[{ company, role, location, date, bullets[] }]`

These are additive — existing callers keep working. Update the system prompt to instruct the model to populate them when confident.

### Loop, end-to-end

```text
Upload CV (PDF/DOCX)
   │
   ▼
analyze-portfolio (Edge fn, Gemini-2.5-flash, tool calling)
   │
   ├─► Auto-fill CV form tabs (where empty)
   ├─► Update Strength Score
   ├─► Sidebar: "Roles you fit" + "Skills to develop"
   │
   └─► [Close these gaps in Learn →]
            │
            ▼
       /learn?focus=skill1,skill2,skill3
            │
            ├─► Banner: "Focused from your CV"
            ├─► Focused skills sorted to top, auto-expanded
            └─► Existing course recommendation + validation flow
```

### Guardrails

- **File limits**: 5 MB max, PDF / DOCX / DOC only, validated client-side before base64 encoding.
- **Don't clobber user input**: merge logic only fills empty fields; existing entries are preserved.
- **Auth**: `analyze-portfolio` already enforces JWT — no additional changes.
- **Cost / abuse**: a single CV upload per session is sufficient; we'll show a "Re-analyze" link rather than auto-running on every form change.
- **Failure modes**: if the AI returns no structured skills (fallback path in the Edge fn), the dialog shows the raw analysis text and the user can dismiss without changes — CV form stays untouched.

### Out of scope (for this change)

- No Skills tab in the sidebar (per earlier conversation: integration > new tab).
- No retraining of the Strength Score formula — we display the AI score alongside, not as a replacement.
- No changes to Portfolio, Assessment, or the Skill Graph schema.

