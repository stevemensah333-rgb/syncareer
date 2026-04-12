

## Phase 1: Removals — Talent Insights, Employee Invite, and Edge Function

### What gets removed

1. **Talent Insights page** — `src/pages/employer/TalentInsights.tsx` (privacy risk, duplicates Hire with AI)
2. **AddEmployeeDialog** — `src/components/employer/AddEmployeeDialog.tsx` (non-functional, no backend table)
3. **send-employee-invite edge function** — `supabase/functions/send-employee-invite/index.ts` (supports removed feature)
4. **Employee section in MyCompany** — the "Registered Employees" card referencing `AddEmployeeDialog`

### Files modified

| File | Change |
|------|--------|
| `src/App.tsx` | Remove `TalentInsights` import (line 46) and route (lines 128-130) |
| `src/components/layout/EmployerLayout.tsx` | Remove Talent Insights nav item (line 26) |
| `src/components/layout/Sidebar.tsx` | Remove Talent Insights nav entry (lines 123-126) |
| `src/components/layout/MobileBottomNav.tsx` | Remove Insights tab (line 43) |
| `src/pages/employer/MyCompany.tsx` | Remove `AddEmployeeDialog` import and the employees section |

### Files deleted

| File |
|------|
| `src/pages/employer/TalentInsights.tsx` |
| `src/components/employer/AddEmployeeDialog.tsx` |
| `supabase/functions/send-employee-invite/index.ts` |

### Edge function cleanup
The deployed `send-employee-invite` edge function will also be removed from the backend.

### What stays
My Company (profile), Post Job, Applicants, Hire with AI, Settings — all untouched. These will be improved in subsequent phases.

