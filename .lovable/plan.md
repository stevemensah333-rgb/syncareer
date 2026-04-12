

## Plan: Two-Way Employer-Student Visibility

### Problem
1. **Employer viewing applicant**: The `PublicPortfolio` page only shows basic profile, projects, and endorsements — missing school, LinkedIn, and skills from `user_skills`.
2. **Student viewing employer**: The "Learn More" dialog on Opportunities only shows job details — no employer/company information.

### Changes

#### 1. Enrich PublicPortfolio with student details

**File**: `src/pages/PublicPortfolio.tsx`

- Fetch `student_details` (school, major, degree_type) for the viewed user
- Fetch `user_skills` (skill_name, proficiency, category) for the viewed user
- Fetch `linkedin_url` from `profiles`
- Display new sections in the profile header:
  - School, major, degree, expected completion
  - LinkedIn link (if available)
  - Skills with proficiency badges (separate from endorsements)

**RLS Note**: `student_details` currently only allows users to view their own rows. We need a new SELECT policy so employers can view student details of their applicants (similar to the existing `profiles` policy "Employers can view applicant profiles").

#### 2. Add RLS policy for student_details and user_skills

**Migration**: Add two new RLS policies:

```sql
-- Employers can view student details for their applicants
CREATE POLICY "Employers can view applicant student details"
ON public.student_details FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN job_postings jp ON ja.job_id = jp.id
    WHERE ja.applicant_id = student_details.user_id
      AND jp.employer_id = auth.uid()
  )
);

-- Employers can view applicant skills
CREATE POLICY "Employers can view applicant skills"
ON public.user_skills FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN job_postings jp ON ja.job_id = jp.id
    WHERE ja.applicant_id = user_skills.user_id
      AND jp.employer_id = auth.uid()
  )
);
```

#### 3. Add employer info to "Learn More" dialog on Opportunities

**File**: `src/pages/Markets.tsx`

- When a student clicks "Learn More", fetch `employer_details` (company_name, industry, company_location, company_size, company_website, company_description) using the job's `employer_id`
- Display a "About the Company" section in the dialog above the job description
- Show: company name, industry, location, size, website link, description

**RLS Note**: `employer_details` currently only allows `user_id = auth.uid()`. We need a new SELECT policy so authenticated users can view employer details for active job postings.

#### 4. Add RLS policy for employer_details (public view for active jobs)

**Migration**:

```sql
-- Anyone authenticated can view employer details if employer has active jobs
CREATE POLICY "Users can view employer details for active jobs"
ON public.employer_details FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_postings
    WHERE job_postings.employer_id = employer_details.user_id
      AND job_postings.status = 'active'
  )
);
```

### Files modified

| File | Change |
|------|--------|
| `src/pages/PublicPortfolio.tsx` | Add student details, skills, LinkedIn to profile view |
| `src/pages/Markets.tsx` | Add "About the Company" section in Learn More dialog |
| Migration SQL | 3 new RLS policies (student_details, user_skills, employer_details) |

### What stays unchanged
- Applicant Tracker navigation (already links to `/portfolio/:id`)
- Existing portfolio projects and endorsements display
- All existing RLS policies

