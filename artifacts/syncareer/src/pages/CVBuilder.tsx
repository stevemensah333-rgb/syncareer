import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { CVEditorWorkspace } from '@/components/cv-builder/CVEditorWorkspace';
import { supabase } from '@/integrations/supabase/client';
import type { CVData } from '@/features/cv-builder/types';
import {
  classifyLoadError,
  loadPrimaryCV,
  logCvPersistenceFailure,
  savePrimaryCV,
  type CvPersistenceFailure,
} from '@/features/cv-builder/persistence';
import {
  buildCandidateEvidence,
  buildOpportunityContext,
  matchRequirementToEvidence,
  type OpportunityContext,
} from '@/features/cv-builder/guidance';
import { RequirementEvidenceActions } from '@/components/learning/RequirementEvidenceActions';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import type { OpportunityJob } from '@/features/opportunities/opportunity';

/**
 * Standalone base-CV editor. It edits only the user's primary CV row;
 * application-specific tailoring lives at /applications/:applicationId/cv.
 * Legacy `/cv-builder?application=` links redirect to that route.
 */
const CVBuilder = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetRole = searchParams.get('targetRole') || searchParams.get('role') || '';
  const targetCompany = searchParams.get('company') || '';
  const applicationId = searchParams.get('application') || '';
  const opportunityId = searchParams.get('opportunity') || searchParams.get('job') || '';
  const requestedReturnTo = searchParams.get('returnTo') || '';
  const safeReturnTo = requestedReturnTo.startsWith('/opportunities') || requestedReturnTo.startsWith('/applications') ? requestedReturnTo : '';

  const [initialCv, setInitialCv] = useState<CVData | null>(null);
  const [isLoadingCV, setIsLoadingCV] = useState(true);
  const [loadFailure, setLoadFailure] = useState<CvPersistenceFailure | null>(null);
  const [opportunityContext, setOpportunityContext] = useState<OpportunityContext | null>(null);
  const [opportunityContextLoading, setOpportunityContextLoading] = useState(false);
  const [opportunityContextError, setOpportunityContextError] = useState<string | null>(null);

  useEffect(() => {
    // An application query param means the caller wanted application
    // tailoring; send them to the application-scoped editor, which saves to
    // its own copy instead of silently editing the primary CV.
    if (!applicationId) return;
    navigate(`/applications/${encodeURIComponent(applicationId)}/cv`, { replace: true });
  }, [applicationId, navigate]);

  const loadSavedCV = useCallback(async () => {
    setIsLoadingCV(true);
    setLoadFailure(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session?.user?.id) throw { code: 'NO_SESSION', message: 'No authenticated session' };

      const loaded = await loadPrimaryCV(supabase, data.session.user.id);
      if (loaded) {
        setInitialCv(loaded.cv);
      } else {
        setInitialCv(null);
      }
    } catch (error) {
      const failure = classifyLoadError(error);
      logCvPersistenceFailure('load', failure);
      setLoadFailure(failure);
    } finally {
      setIsLoadingCV(false);
    }
  }, []);

  useEffect(() => {
    void loadSavedCV();
  }, [loadSavedCV]);

  useEffect(() => {
    let active = true;
    if (!opportunityId) {
      setOpportunityContext(null);
      setOpportunityContextError(null);
      setOpportunityContextLoading(false);
      return () => { active = false; };
    }
    setOpportunityContextLoading(true);
    setOpportunityContextError(null);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('job_postings')
          .select('*')
          .eq('id', opportunityId)
          .maybeSingle();
        if (!active) return;
        if (error || !data) {
          setOpportunityContext(null);
          setOpportunityContextError('The selected opportunity could not be loaded. Choose it again before requesting AI wording.');
          return;
        }
        try {
          setOpportunityContext(buildOpportunityContext(data as OpportunityJob));
        } catch {
          setOpportunityContext(null);
          setOpportunityContextError('The selected opportunity does not contain usable role context.');
        }
      } catch {
        if (active) {
          setOpportunityContext(null);
          setOpportunityContextError('The selected opportunity could not be loaded. Choose it again before requesting AI wording.');
        }
      } finally {
        if (active) setOpportunityContextLoading(false);
      }
    })();
    return () => { active = false; };
  }, [opportunityId]);

  useEffect(() => {
    try {
      const entry = targetRole || targetCompany ? 'opportunity' : 'navigation';
      captureProductEvent(ANALYTICS_EVENTS.CV_STARTED, { entry });
    } catch { /* analytics must never break */ }
    // Runs once per mount on purpose.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async (cv: CVData) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      return savePrimaryCV(supabase, '', cv);
    }
    return savePrimaryCV(supabase, session.user.id, cv);
  }, []);

  const skillGuidance = useMemo(() => {
    const candidateEvidence = buildCandidateEvidence(initialCv ?? { personal: { firstName: '', lastName: '', phone: '', nationality: '', email: '', schoolEmail: '', linkedIn: '' }, education: { university: '', location: '', degree: '', graduationDate: '', gpa: '' }, achievements: [], experience: [], projects: [], activities: [], skills: [], references: '' });
    return (opportunityContext?.requirements ?? [])
      .filter((requirement) => requirement.kind === 'required_skill' || requirement.kind === 'preferred_skill')
      .map((requirement) => ({ requirement, match: matchRequirementToEvidence(requirement, candidateEvidence) }));
  }, [initialCv, opportunityContext]);

  const [dismissedTargetSkills, setDismissedTargetSkills] = useState<string[]>([]);

  const contextBanner = (targetRole || opportunityContext) && initialCv ? (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-primary font-medium">Tailoring CV for</p>
          <p className="text-base font-medium text-foreground">
            {targetRole}{targetCompany ? ` · ${targetCompany}` : ''}
          </p>
        </div>
        {safeReturnTo && (
          <Button size="sm" variant="ghost" asChild>
            <Link to={safeReturnTo}>Back to opportunity</Link>
          </Button>
        )}
      </div>
      {skillGuidance.length > 0 ? (
        <div className="mt-3 space-y-2">
          {([
            { title: 'Supported by your evidence', statuses: ['supported'] },
            { title: 'Possibly supported — confirm', statuses: ['partially_supported', 'unclear'] },
            { title: 'Required by the role but not yet supported', statuses: ['unsupported'] },
          ] as const).map((group) => {
            const items = skillGuidance.filter(({ requirement, match }) => group.statuses.includes(match.status as never) && !dismissedTargetSkills.includes(requirement.text));
            if (!items.length) return null;
            return <section key={group.title} className="rounded-lg border bg-card/70 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p><div className="mt-2 space-y-2">{items.map(({ requirement, match }) => <div key={requirement.requirementId}>{match.status === 'supported' ? <p className="text-sm text-success">✓ {requirement.text} — supported by contextual CV/project evidence. Review before relying on it.</p> : <RequirementEvidenceActions surface="cv" requirement={requirement.text} role={targetRole} onAddEvidence={() => { toast.info(`Add a truthful experience or project example showing ${requirement.text}. The skill has not been added.`); }} onNotRelevant={() => setDismissedTargetSkills((current) => current.includes(requirement.text) ? current : [...current, requirement.text])} />}</div>)}</div></section>;
          })}
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <PageLayout title="CV Builder" description="Create, review, and save your primary CV." breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'CV Builder' }]}>
      {loadFailure ? (
        <div className="mx-auto max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center" role="alert">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" aria-hidden />
          <h2 className="text-lg font-semibold">Your saved CV could not be opened</h2>
          <p className="mt-2 text-sm text-muted-foreground">{loadFailure.userMessage}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Editing is paused so an unseen cloud copy cannot be overwritten.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => void loadSavedCV()}>
            Try again
          </Button>
        </div>
      ) : (
        <CVEditorWorkspace
          loading={isLoadingCV}
          initialCv={initialCv}
          save={handleSave}
          contextBanner={contextBanner}
          assistantOpportunity={opportunityContext}
          assistantOpportunityLoading={opportunityContextLoading}
          assistantOpportunityError={opportunityContextError}
          postSaveAction={safeReturnTo ? { label: 'Back to opportunity', to: safeReturnTo } : undefined}
        />
      )}
    </PageLayout>
  );
};

export default CVBuilder;
