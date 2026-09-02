-- Evidence Dossier foundation: durable, reusable evidence items, application
-- requirements, requirement/evidence links, CV usage links, and application-CV
-- lineage.
--
-- Dependencies (must already be live; each is additive and idempotently
-- re-asserted below where a composite foreign key depends on it):
--   20260811110000_application_workspace.sql      (job_applications workspace columns, resumes_id_user_id_key)
--   20260811110100_application_interview_link.sql (job_applications_id_applicant_id_key, mock_interviews.application_id)
--
-- Security model:
--   - All five tables are owner-scoped with RLS SELECT-only policies. Direct
--     client INSERT/UPDATE/DELETE is impossible; every write goes through a
--     SECURITY DEFINER function whose caller identity is always auth.uid().
--   - Mentors (career_counsellor) gain no access to any evidence relation.
--   - No backfill: historical CV entries, interview answers, and notes are
--     never converted into confirmed evidence automatically. Suggestions are
--     generated client-side and only become evidence after explicit review.
--
-- Rollback: supabase/rollback/evidence_dossier_rollback.sql
-- Tests:    supabase/tests/evidence_dossier_rls.sql

-- ── Ownership constraints required by composite foreign keys ─────────────
-- Each is created by an earlier reviewed migration; the guarded re-assertion
-- keeps this migration applicable if any of them has not landed yet.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'resumes_id_user_id_key'
      AND conrelid = 'public.resumes'::regclass
  ) THEN
    ALTER TABLE public.resumes ADD CONSTRAINT resumes_id_user_id_key UNIQUE (id, user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_applications_id_applicant_id_key'
      AND conrelid = 'public.job_applications'::regclass
  ) THEN
    ALTER TABLE public.job_applications ADD CONSTRAINT job_applications_id_applicant_id_key UNIQUE (id, applicant_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mock_interviews_id_user_id_key'
      AND conrelid = 'public.mock_interviews'::regclass
  ) THEN
    ALTER TABLE public.mock_interviews ADD CONSTRAINT mock_interviews_id_user_id_key UNIQUE (id, user_id);
  END IF;
END $$;

-- ── Application-CV lineage columns ───────────────────────────────────────
-- resume_id re-asserts the reviewed application-workspace column so this
-- migration remains self-sufficient for that one column it writes.

ALTER TABLE public.job_applications ADD COLUMN IF NOT EXISTS resume_id uuid;

ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS document_scope text NOT NULL DEFAULT 'base'
    CHECK (document_scope IN ('base', 'application')),
  ADD COLUMN IF NOT EXISTS source_resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS resumes_document_scope_idx
  ON public.resumes (user_id, document_scope)
  WHERE document_scope = 'application';

-- One application-scoped CV must never be silently shared by two
-- applications. Expressed as a trigger because the exclusivity depends on
-- another table's column (resumes.document_scope), which a partial index
-- cannot reference. Legacy links to base CVs are untouched.
CREATE OR REPLACE FUNCTION public.enforce_application_cv_exclusive_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'job_applications' THEN
    IF NEW.resume_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.resumes r
      WHERE r.id = NEW.resume_id AND r.document_scope = 'application'
    ) AND EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.resume_id = NEW.resume_id AND ja.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'This application CV is already linked to another application';
    END IF;
  ELSIF TG_TABLE_NAME = 'resumes' THEN
    IF NEW.document_scope = 'application' AND OLD.document_scope <> 'application' AND EXISTS (
      SELECT 1 FROM public.job_applications ja
      WHERE ja.resume_id = NEW.id
    ) AND 1 < (
      SELECT count(*) FROM public.job_applications ja WHERE ja.resume_id = NEW.id
    ) THEN
      RAISE EXCEPTION 'An application CV linked by multiple applications cannot be re-scoped';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS job_applications_application_cv_exclusive ON public.job_applications;
CREATE TRIGGER job_applications_application_cv_exclusive
AFTER INSERT OR UPDATE OF resume_id ON public.job_applications
FOR EACH ROW EXECUTE FUNCTION public.enforce_application_cv_exclusive_link();

DROP TRIGGER IF EXISTS resumes_application_cv_exclusive ON public.resumes;
CREATE TRIGGER resumes_application_cv_exclusive
AFTER UPDATE OF document_scope ON public.resumes
FOR EACH ROW EXECUTE FUNCTION public.enforce_application_cv_exclusive_link();

-- ── evidence_items ───────────────────────────────────────────────────────

CREATE TABLE public.evidence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN (
    'work', 'project', 'education', 'achievement', 'leadership', 'volunteering', 'other'
  )),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 1200),
  occurred_on date,
  review_status text NOT NULL DEFAULT 'draft' CHECK (review_status IN ('draft', 'confirmed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_items_id_user_id_key UNIQUE (id, user_id)
);

CREATE INDEX evidence_items_user_created_idx ON public.evidence_items (user_id, created_at DESC);

COMMENT ON TABLE public.evidence_items IS
  'Student-owned evidence records. review_status is owner-reported; it never implies external verification.';

-- ── evidence_sources ─────────────────────────────────────────────────────

CREATE TABLE public.evidence_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('resume_entry', 'interview_response', 'url', 'manual_note')),
  resume_id uuid,
  interview_id uuid,
  entry_locator text CHECK (entry_locator IS NULL OR char_length(entry_locator) BETWEEN 1 AND 320),
  source_label text NOT NULL CHECK (char_length(source_label) BETWEEN 1 AND 160),
  source_excerpt text NOT NULL CHECK (char_length(source_excerpt) BETWEEN 1 AND 800),
  source_url text CHECK (
    source_url IS NULL OR (char_length(source_url) <= 2048 AND source_url ~* '^https?://')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_sources_evidence_owner_fkey
    FOREIGN KEY (evidence_id, user_id) REFERENCES public.evidence_items (id, user_id) ON DELETE CASCADE,
  CONSTRAINT evidence_sources_resume_owner_fkey
    FOREIGN KEY (resume_id, user_id) REFERENCES public.resumes (id, user_id) ON DELETE CASCADE,
  CONSTRAINT evidence_sources_interview_owner_fkey
    FOREIGN KEY (interview_id, user_id) REFERENCES public.mock_interviews (id, user_id) ON DELETE CASCADE,
  -- Fields must match the selected source type; cross-type references fail.
  CONSTRAINT evidence_sources_type_shape CHECK (
    (source_type = 'resume_entry'      AND resume_id IS NOT NULL AND interview_id IS NULL AND source_url IS NULL) OR
    (source_type = 'interview_response' AND resume_id IS NULL AND interview_id IS NOT NULL AND source_url IS NULL) OR
    (source_type = 'url'               AND resume_id IS NULL AND interview_id IS NULL AND source_url IS NOT NULL) OR
    (source_type = 'manual_note'       AND resume_id IS NULL AND interview_id IS NULL AND source_url IS NULL)
  )
);

CREATE INDEX evidence_sources_evidence_idx ON public.evidence_sources (evidence_id);
CREATE INDEX evidence_sources_user_idx ON public.evidence_sources (user_id);

COMMENT ON TABLE public.evidence_sources IS
  'Where an evidence item came from. Composite owner-matched foreign keys make cross-user CV/interview references impossible.';

-- ── application_requirements ─────────────────────────────────────────────

CREATE TABLE public.application_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 160),
  detail text CHECK (detail IS NULL OR char_length(detail) BETWEEN 1 AND 1000),
  origin text NOT NULL CHECK (origin IN ('posting_skill', 'manual')),
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT application_requirements_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT application_requirements_application_owner_fkey
    FOREIGN KEY (application_id, user_id) REFERENCES public.job_applications (id, applicant_id) ON DELETE CASCADE
);

-- Case-insensitive uniqueness of a requirement label within one application.
CREATE UNIQUE INDEX application_requirements_unique_label
  ON public.application_requirements (application_id, lower(label));
CREATE INDEX application_requirements_application_order_idx
  ON public.application_requirements (application_id, sort_order);
CREATE INDEX application_requirements_user_idx ON public.application_requirements (user_id);

-- ── application_evidence_links ───────────────────────────────────────────

CREATE TABLE public.application_evidence_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relevance_note text CHECK (relevance_note IS NULL OR char_length(relevance_note) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT application_evidence_links_requirement_owner_fkey
    FOREIGN KEY (requirement_id, user_id) REFERENCES public.application_requirements (id, user_id) ON DELETE CASCADE,
  CONSTRAINT application_evidence_links_evidence_owner_fkey
    FOREIGN KEY (evidence_id, user_id) REFERENCES public.evidence_items (id, user_id) ON DELETE CASCADE,
  CONSTRAINT application_evidence_links_pair_unique UNIQUE (requirement_id, evidence_id)
);

CREATE INDEX application_evidence_links_evidence_idx ON public.application_evidence_links (evidence_id);

-- ── resume_evidence_links ────────────────────────────────────────────────
-- Records which evidence informed a CV entry. Deleting the CV row cascades
-- the usage link; the reusable evidence itself is never deleted with it.

CREATE TABLE public.resume_evidence_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL,
  evidence_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cv_section text NOT NULL CHECK (cv_section IN (
    'experience', 'projects', 'activities', 'education', 'achievements', 'skills'
  )),
  entry_locator text NOT NULL CHECK (char_length(entry_locator) BETWEEN 1 AND 320),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resume_evidence_links_resume_owner_fkey
    FOREIGN KEY (resume_id, user_id) REFERENCES public.resumes (id, user_id) ON DELETE CASCADE,
  CONSTRAINT resume_evidence_links_evidence_owner_fkey
    FOREIGN KEY (evidence_id, user_id) REFERENCES public.evidence_items (id, user_id) ON DELETE CASCADE,
  CONSTRAINT resume_evidence_links_usage_unique UNIQUE (resume_id, cv_section, entry_locator, evidence_id)
);

CREATE INDEX resume_evidence_links_evidence_idx ON public.resume_evidence_links (evidence_id);
CREATE INDEX resume_evidence_links_resume_idx ON public.resume_evidence_links (resume_id);

-- ── Row Level Security ───────────────────────────────────────────────────
-- Owner read-only access; every mutation flows through the SECURITY DEFINER
-- operations below. Mentors and anonymous sessions receive nothing.

ALTER TABLE public.evidence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_evidence_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_evidence_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read evidence items" ON public.evidence_items FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Owners read evidence sources" ON public.evidence_sources FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Owners read application requirements" ON public.application_requirements FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Owners read application evidence links" ON public.application_evidence_links FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Owners read resume evidence links" ON public.resume_evidence_links FOR SELECT TO authenticated
  USING (user_id = auth.uid());

GRANT SELECT ON public.evidence_items TO authenticated;
GRANT SELECT ON public.evidence_sources TO authenticated;
GRANT SELECT ON public.application_requirements TO authenticated;
GRANT SELECT ON public.application_evidence_links TO authenticated;
GRANT SELECT ON public.resume_evidence_links TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.evidence_sources TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_requirements TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_evidence_links TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_evidence_links TO service_role;

REVOKE INSERT, UPDATE, DELETE ON public.evidence_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.evidence_sources FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.application_requirements FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.application_evidence_links FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.resume_evidence_links FROM authenticated;

-- ── Server operations ────────────────────────────────────────────────────
-- Caller identity is always derived from auth.uid(); clients never submit
-- owner ids. All operations validate lengths/shapes server-side.

-- Import the posting's explicit skills as requirements. Idempotent: labels
-- already present for the application (case-insensitively) are skipped, and
-- description text is never converted into requirements.
CREATE OR REPLACE FUNCTION public.initialize_application_requirements(p_application_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_application public.job_applications;
  v_next_order integer;
  v_imported integer := 0;
  v_skill record;
BEGIN
  SELECT * INTO v_application FROM public.job_applications
  WHERE id = p_application_id AND applicant_id = auth.uid();
  IF v_application.id IS NULL THEN RAISE EXCEPTION 'Application is not available'; END IF;
  IF v_application.job_id IS NULL THEN
    RETURN jsonb_build_object('imported', 0, 'requirements', '[]'::jsonb);
  END IF;

  SELECT coalesce(max(sort_order), -1) + 1 INTO v_next_order
  FROM public.application_requirements WHERE application_id = v_application.id;

  FOR v_skill IN
    SELECT DISTINCT st.canonical_name
    FROM public.job_posting_skills jps
    JOIN public.skills_taxonomy st ON st.id = jps.skill_id AND st.is_active
    WHERE jps.job_posting_id = v_application.job_id
    ORDER BY st.canonical_name
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.application_requirements ar
      WHERE ar.application_id = v_application.id AND lower(ar.label) = lower(v_skill.canonical_name)
    ) THEN CONTINUE; END IF;
    INSERT INTO public.application_requirements (application_id, user_id, label, detail, origin, sort_order)
    VALUES (v_application.id, auth.uid(), left(v_skill.canonical_name, 160), NULL, 'posting_skill', v_next_order);
    v_next_order := v_next_order + 1;
    v_imported := v_imported + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'imported', v_imported,
    'requirements', coalesce((
      SELECT jsonb_agg(to_jsonb(ar) ORDER BY ar.sort_order, ar.created_at)
      FROM public.application_requirements ar WHERE ar.application_id = v_application.id
    ), '[]'::jsonb)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_manual_application_requirement(
  p_application_id uuid, p_label text, p_detail text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.application_requirements; v_next_order integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.job_applications WHERE id = p_application_id AND applicant_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Application is not available'; END IF;
  IF char_length(trim(p_label)) NOT BETWEEN 1 AND 160 THEN RAISE EXCEPTION 'Requirement label is required'; END IF;
  IF p_detail IS NOT NULL AND char_length(trim(p_detail)) = 0 THEN p_detail := NULL; END IF;
  IF p_detail IS NOT NULL AND char_length(p_detail) > 1000 THEN RAISE EXCEPTION 'Requirement detail is too long'; END IF;

  SELECT coalesce(max(sort_order), -1) + 1 INTO v_next_order
  FROM public.application_requirements WHERE application_id = p_application_id;

  INSERT INTO public.application_requirements (application_id, user_id, label, detail, origin, sort_order)
  VALUES (p_application_id, auth.uid(), trim(p_label), p_detail, 'manual', v_next_order)
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_application_requirement(p_requirement_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.application_requirements;
BEGIN
  DELETE FROM public.application_requirements
  WHERE id = p_requirement_id AND user_id = auth.uid()
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Requirement not found'; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

-- Create the application-scoped CV for a dossier. Transactional and
-- idempotent: if the application already links an owned application-scoped
-- CV, that copy is returned instead of creating a duplicate. The source must
-- be an owned base CV. Every user-editable column is copied verbatim,
-- preserving unknown compatible JSON fields inside the payload columns.
CREATE OR REPLACE FUNCTION public.create_application_cv(p_application_id uuid, p_source_resume_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_application public.job_applications;
  v_source public.resumes;
  v_existing public.resumes;
  v_copy public.resumes;
BEGIN
  SELECT * INTO v_application FROM public.job_applications
  WHERE id = p_application_id AND applicant_id = auth.uid() FOR UPDATE;
  IF v_application.id IS NULL THEN RAISE EXCEPTION 'Application is not available'; END IF;

  IF v_application.resume_id IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.resumes
    WHERE id = v_application.resume_id AND user_id = auth.uid() AND document_scope = 'application';
    IF v_existing.id IS NOT NULL THEN RETURN to_jsonb(v_existing); END IF;
  END IF;

  SELECT * INTO v_source FROM public.resumes
  WHERE id = p_source_resume_id AND user_id = auth.uid() AND document_scope = 'base';
  IF v_source.id IS NULL THEN RAISE EXCEPTION 'Source CV is not available'; END IF;

  INSERT INTO public.resumes (
    user_id, title, template, personal_info, education, experience,
    projects, achievements, skills, references_section, is_primary,
    document_scope, source_resume_id
  ) VALUES (
    auth.uid(), v_source.title, v_source.template, v_source.personal_info,
    v_source.education, v_source.experience, v_source.projects,
    v_source.achievements, v_source.skills, v_source.references_section,
    false, 'application', v_source.id
  ) RETURNING * INTO v_copy;

  UPDATE public.job_applications SET resume_id = v_copy.id WHERE id = v_application.id;

  RETURN to_jsonb(v_copy);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_evidence_item(
  p_category text, p_title text, p_summary text, p_occurred_on date DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.evidence_items;
BEGIN
  IF p_category NOT IN ('work','project','education','achievement','leadership','volunteering','other') THEN
    RAISE EXCEPTION 'Invalid evidence category';
  END IF;
  IF char_length(trim(p_title)) NOT BETWEEN 1 AND 120 THEN RAISE EXCEPTION 'Evidence title must be between 1 and 120 characters'; END IF;
  IF char_length(trim(p_summary)) NOT BETWEEN 1 AND 1200 THEN RAISE EXCEPTION 'Evidence summary must be between 1 and 1200 characters'; END IF;
  INSERT INTO public.evidence_items (user_id, category, title, summary, occurred_on)
  VALUES (auth.uid(), p_category, trim(p_title), trim(p_summary), p_occurred_on)
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

-- Editing the title or summary of confirmed evidence returns it to draft so
-- the derived support status never overstates reviewed material. Archived
-- evidence is frozen history and cannot be edited back into circulation.
CREATE OR REPLACE FUNCTION public.update_evidence_item(
  p_evidence_id uuid, p_category text DEFAULT NULL, p_title text DEFAULT NULL,
  p_summary text DEFAULT NULL, p_occurred_on date DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.evidence_items;
BEGIN
  SELECT * INTO v_row FROM public.evidence_items WHERE id = p_evidence_id AND user_id = auth.uid() FOR UPDATE;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Evidence not found'; END IF;
  IF v_row.review_status = 'archived' THEN RAISE EXCEPTION 'Archived evidence cannot be edited'; END IF;

  IF p_category IS NOT NULL THEN
    IF p_category NOT IN ('work','project','education','achievement','leadership','volunteering','other') THEN
      RAISE EXCEPTION 'Invalid evidence category';
    END IF;
  END IF;
  IF p_title IS NOT NULL AND char_length(trim(p_title)) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Evidence title must be between 1 and 120 characters';
  END IF;
  IF p_summary IS NOT NULL AND char_length(trim(p_summary)) NOT BETWEEN 1 AND 1200 THEN
    RAISE EXCEPTION 'Evidence summary must be between 1 and 1200 characters';
  END IF;

  UPDATE public.evidence_items SET
    category = coalesce(p_category, category),
    title = coalesce(nullif(trim(p_title), ''), title),
    summary = coalesce(nullif(trim(p_summary), ''), summary),
    occurred_on = coalesce(p_occurred_on, occurred_on),
    review_status = CASE
      WHEN (nullif(trim(p_title), '') IS NOT NULL AND nullif(trim(p_title), '') IS DISTINCT FROM title)
        OR (nullif(trim(p_summary), '') IS NOT NULL AND nullif(trim(p_summary), '') IS DISTINCT FROM summary)
      THEN 'draft' ELSE review_status END,
    updated_at = now()
  WHERE id = v_row.id
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_evidence_item(p_evidence_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.evidence_items;
BEGIN
  UPDATE public.evidence_items SET review_status = 'confirmed', updated_at = now()
  WHERE id = p_evidence_id AND user_id = auth.uid() AND review_status IN ('draft', 'confirmed')
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.evidence_items WHERE id = p_evidence_id AND user_id = auth.uid()) THEN
      RAISE EXCEPTION 'Archived evidence cannot be confirmed';
    END IF;
    RAISE EXCEPTION 'Evidence not found';
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_evidence_item(p_evidence_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.evidence_items; v_json jsonb;
BEGIN
  UPDATE public.evidence_items SET review_status = 'archived', updated_at = now()
  WHERE id = p_evidence_id AND user_id = auth.uid() AND review_status <> 'archived'
  RETURNING * INTO v_row;
  IF v_row.id IS NOT NULL THEN RETURN to_jsonb(v_row); END IF;
  -- Idempotent: archiving an already-archived item returns it unchanged.
  SELECT to_jsonb(e) INTO v_json FROM public.evidence_items e
  WHERE e.id = p_evidence_id AND e.user_id = auth.uid();
  IF v_json IS NULL THEN RAISE EXCEPTION 'Evidence not found'; END IF;
  RETURN v_json;
END;
$$;

-- The owner-matched composite foreign keys reject any CV or interview the
-- caller does not own, even under a privileged synthetic write.
CREATE OR REPLACE FUNCTION public.add_evidence_source(
  p_evidence_id uuid, p_source_type text, p_source_label text, p_source_excerpt text,
  p_entry_locator text DEFAULT NULL, p_source_url text DEFAULT NULL,
  p_resume_id uuid DEFAULT NULL, p_interview_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.evidence_sources;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.evidence_items WHERE id = p_evidence_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Evidence not found'; END IF;
  IF p_source_type NOT IN ('resume_entry','interview_response','url','manual_note') THEN
    RAISE EXCEPTION 'Invalid source type';
  END IF;
  IF char_length(trim(p_source_label)) NOT BETWEEN 1 AND 160 THEN
    RAISE EXCEPTION 'Source label must be between 1 and 160 characters';
  END IF;
  IF char_length(trim(p_source_excerpt)) NOT BETWEEN 1 AND 800 THEN
    RAISE EXCEPTION 'Source excerpt must be between 1 and 800 characters';
  END IF;

  IF p_source_type = 'resume_entry' THEN
    IF p_resume_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.resumes WHERE id = p_resume_id AND user_id = auth.uid()
    ) THEN RAISE EXCEPTION 'CV is not available'; END IF;
    IF p_interview_id IS NOT NULL OR p_source_url IS NOT NULL THEN RAISE EXCEPTION 'Source fields do not match a CV entry'; END IF;
  ELSIF p_source_type = 'interview_response' THEN
    IF p_interview_id IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.mock_interviews WHERE id = p_interview_id AND user_id = auth.uid()
    ) THEN RAISE EXCEPTION 'Interview is not available'; END IF;
    IF p_resume_id IS NOT NULL OR p_source_url IS NOT NULL THEN RAISE EXCEPTION 'Source fields do not match an interview response'; END IF;
  ELSIF p_source_type = 'url' THEN
    IF p_source_url IS NULL OR p_source_url !~* '^https?://' OR char_length(p_source_url) > 2048 THEN
      RAISE EXCEPTION 'A valid HTTP(S) URL is required';
    END IF;
    IF p_resume_id IS NOT NULL OR p_interview_id IS NOT NULL THEN RAISE EXCEPTION 'Source fields do not match a URL source'; END IF;
  ELSE -- manual_note
    IF p_resume_id IS NOT NULL OR p_interview_id IS NOT NULL OR p_source_url IS NOT NULL THEN
      RAISE EXCEPTION 'Source fields do not match a manual note';
    END IF;
  END IF;

  INSERT INTO public.evidence_sources (
    evidence_id, user_id, source_type, resume_id, interview_id,
    entry_locator, source_label, source_excerpt, source_url
  ) VALUES (
    p_evidence_id, auth.uid(), p_source_type, p_resume_id, p_interview_id,
    nullif(trim(coalesce(p_entry_locator, '')), ''), trim(p_source_label), trim(p_source_excerpt),
    nullif(trim(coalesce(p_source_url, '')), '')
  ) RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_evidence_source(p_source_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.evidence_sources;
BEGIN
  DELETE FROM public.evidence_sources WHERE id = p_source_id AND user_id = auth.uid()
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Source not found'; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

-- Archived evidence can no longer receive new links. Re-linking an existing
-- pair updates the relevance note instead of failing.
CREATE OR REPLACE FUNCTION public.link_evidence_to_requirement(
  p_requirement_id uuid, p_evidence_id uuid, p_relevance_note text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.application_evidence_links;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.application_requirements WHERE id = p_requirement_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Requirement not found'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.evidence_items WHERE id = p_evidence_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Evidence not found'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.evidence_items
    WHERE id = p_evidence_id AND user_id = auth.uid() AND review_status = 'archived'
  ) THEN RAISE EXCEPTION 'Archived evidence cannot be linked'; END IF;
  IF p_relevance_note IS NOT NULL THEN
    IF char_length(trim(p_relevance_note)) = 0 THEN p_relevance_note := NULL;
    ELSIF char_length(trim(p_relevance_note)) > 500 THEN RAISE EXCEPTION 'Relevance note is too long';
    ELSE p_relevance_note := trim(p_relevance_note);
    END IF;
  END IF;

  INSERT INTO public.application_evidence_links (requirement_id, evidence_id, user_id, relevance_note)
  VALUES (p_requirement_id, p_evidence_id, auth.uid(), p_relevance_note)
  ON CONFLICT (requirement_id, evidence_id) DO UPDATE
    SET relevance_note = EXCLUDED.relevance_note
  RETURNING * INTO v_row;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_evidence_from_requirement(p_requirement_id uuid, p_evidence_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.application_evidence_links;
BEGIN
  DELETE FROM public.application_evidence_links
  WHERE requirement_id = p_requirement_id AND evidence_id = p_evidence_id AND user_id = auth.uid()
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Link not found'; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

-- Attach or replace the evidence recorded for a CV entry. The CV must be
-- owned; archived evidence is rejected. Deleting the CV entry (or the CV)
-- removes the usage link only, never the evidence itself.
CREATE OR REPLACE FUNCTION public.link_evidence_to_resume_entry(
  p_resume_id uuid, p_evidence_id uuid, p_cv_section text, p_entry_locator text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.resume_evidence_links;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.resumes WHERE id = p_resume_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'CV is not available'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.evidence_items WHERE id = p_evidence_id AND user_id = auth.uid() AND review_status <> 'archived'
  ) THEN RAISE EXCEPTION 'Evidence is not available for linking'; END IF;
  IF p_cv_section NOT IN ('experience','projects','activities','education','achievements','skills') THEN
    RAISE EXCEPTION 'Invalid CV section';
  END IF;
  IF char_length(trim(p_entry_locator)) NOT BETWEEN 1 AND 320 THEN RAISE EXCEPTION 'Entry locator is required'; END IF;

  INSERT INTO public.resume_evidence_links (resume_id, evidence_id, user_id, cv_section, entry_locator)
  VALUES (p_resume_id, p_evidence_id, auth.uid(), p_cv_section, trim(p_entry_locator))
  ON CONFLICT (resume_id, cv_section, entry_locator, evidence_id) DO NOTHING
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN
    SELECT * INTO v_row FROM public.resume_evidence_links l
    WHERE l.resume_id = p_resume_id AND l.cv_section = p_cv_section
      AND l.entry_locator = trim(p_entry_locator) AND l.evidence_id = p_evidence_id;
  END IF;
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.unlink_evidence_from_resume_entry(
  p_resume_id uuid, p_evidence_id uuid, p_cv_section text, p_entry_locator text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.resume_evidence_links;
BEGIN
  DELETE FROM public.resume_evidence_links
  WHERE resume_id = p_resume_id AND evidence_id = p_evidence_id AND user_id = auth.uid()
    AND cv_section = p_cv_section AND entry_locator = trim(p_entry_locator)
  RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Usage link not found'; END IF;
  RETURN to_jsonb(v_row);
END;
$$;

-- ── Function grants ──────────────────────────────────────────────────────

REVOKE ALL ON FUNCTION public.enforce_application_cv_exclusive_link() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.initialize_application_requirements(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_manual_application_requirement(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_application_requirement(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_application_cv(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_evidence_item(text, text, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_evidence_item(uuid, text, text, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_evidence_item(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.archive_evidence_item(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_evidence_source(uuid, text, text, text, text, text, uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_evidence_source(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_evidence_to_requirement(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unlink_evidence_from_requirement(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.link_evidence_to_resume_entry(uuid, uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.unlink_evidence_from_resume_entry(uuid, uuid, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.initialize_application_requirements(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_manual_application_requirement(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_application_requirement(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_application_cv(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_evidence_item(text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_evidence_item(uuid, text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_evidence_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_evidence_item(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_evidence_source(uuid, text, text, text, text, text, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_evidence_source(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_evidence_to_requirement(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_evidence_from_requirement(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_evidence_to_resume_entry(uuid, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_evidence_from_resume_entry(uuid, uuid, text, text) TO authenticated;
