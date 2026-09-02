import React, { useEffect, useState, useMemo } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';

import { Greeting } from '@/components/dashboard/home/Greeting';
import { PrimaryFocusCard } from '@/components/dashboard/home/PrimaryFocusCard';
import { AttentionList, type AttentionItem } from '@/components/dashboard/home/AttentionList';
import { RecentApplications, type RecentApp } from '@/components/dashboard/home/RecentApplications';
import { NextActionsList, type NextAction } from '@/components/dashboard/home/NextActions';
import { EmptyState } from '@/components/dashboard/home/EmptyState';
import { ACTIVE_STATUSES, scoreResume, getDaysUntilDeadline } from '@/components/dashboard/home/utils';
import { SavedDecisions } from '@/components/dashboard/home/SavedDecisions';
import { applicationCompany, applicationTitle, dashboardDataState, selectPrimaryFocus, type DashboardApplication, type DashboardSavedJob } from '@/features/dashboard/continuation';
import { loadDashboardData, type DashboardLoadError } from '@/features/dashboard/data';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RecordState } from '@/components/dossier';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, studentDetails, loading: profileLoading } = useUserProfile();
  const userId = useSupabaseUserId();

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadErrors, setLoadErrors] = useState<DashboardLoadError[]>([]);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [applications, setApplications] = useState<DashboardApplication[]>([]);
  const [savedJobs, setSavedJobs] = useState<DashboardSavedJob[]>([]);
  const [cvCompletion, setCvCompletion] = useState(0);

  const major = studentDetails?.major ?? null;
  const university = studentDetails?.school ?? null;

  useEffect(() => {
    if (profileLoading) return;
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadErrors([]);
      try {
        const bundle = await loadDashboardData(supabase, userId);
        if (cancelled) return;

        setLoadErrors(bundle.errors);
        setAssessmentDone(bundle.assessmentDone);
        setApplications(bundle.applications);
        setSavedJobs(bundle.savedJobs);
        setCvCompletion(bundle.resume ? scoreResume(bundle.resume) : 0);

        if (bundle.errors.length > 0) {
          console.warn('[Dashboard] Some data sources were unavailable', {
            sources: bundle.errors,
          });
        }
      } catch {
        // The loader settles each database request independently. Reaching this
        // branch means the aggregation itself failed, so the application source
        // is treated as unavailable rather than presenting a false empty state.
        console.error('[Dashboard] Data aggregation failed');
        setLoadErrors(['applications']);
        setAssessmentDone(false);
        setApplications([]);
        setSavedJobs([]);
        setCvCompletion(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, profileLoading, reloadKey]);

  // Derived: primary focus
  const primaryFocus = useMemo(() => selectPrimaryFocus(applications, savedJobs), [applications, savedJobs]);

  // Attention: deadlines within 30 days
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const all: AttentionItem[] = [];
    for (const app of applications) {
      if (app.next_action && app.next_action_due && ACTIVE_STATUSES.includes(app.status)) {
        const days = getDaysUntilDeadline(app.next_action_due);
        if (days !== null && days <= 30) all.push({
          id: `action-${app.id}`,
          title: app.next_action,
          company: `${applicationTitle(app)}${applicationCompany(app) ? ` · ${applicationCompany(app)}` : ''}`,
          deadline: app.next_action_due,
          source: 'application',
          kind: 'next-action',
          href: `/applications?application=${encodeURIComponent(app.id)}`,
        });
      }
    }
    for (const saved of savedJobs) {
      const dl = saved.job?.application_deadline;
      if (!dl) continue;
      const days = getDaysUntilDeadline(dl);
      if (days === null || days < 0 || days > 30) continue;
      // avoid duplicating if already tracked via application for same job id
      if (applications.some((application) => application.job?.id === saved.job_id)) continue;
      all.push({
        id: `saved-${saved.job_id}`,
        title: saved.job?.title ?? 'Saved role',
        company: saved.job?.company_name ?? null,
        deadline: dl,
        source: 'saved',
        href: `/opportunities?job=${encodeURIComponent(saved.job_id)}`,
      });
    }
    all.sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
    return all.slice(0, 3);
  }, [applications, savedJobs]);

  const recentApps = useMemo<RecentApp[]>(() => {
    return applications.slice(0, 4).map(a => ({
      id: a.id,
      status: a.status,
      created_at: a.created_at,
      updated_at: a.updated_at,
      job: {
        title: applicationTitle(a),
        company_name: applicationCompany(a),
        location: a.job?.location,
      },
    }));
  }, [applications]);

  const nextActions = useMemo<NextAction[]>(() => {
    const actions: NextAction[] = [];
    const activeApplication = primaryFocus.type === 'application' ? primaryFocus.data : null;

    if (activeApplication) {
      actions.push({
        id: 'review-cv',
        title: cvCompletion === 0 ? 'Create a CV for this application' : 'Review your CV for this application',
        description: `Prepare evidence for ${applicationTitle(activeApplication)} and tailor your CV to the role requirements.`,
        href: `/cv-builder?application=${encodeURIComponent(activeApplication.id)}&targetRole=${encodeURIComponent(applicationTitle(activeApplication))}`,
        icon: 'cv',
      });
    }

    if (activeApplication?.status === 'interview') {
      actions.push({
        id: 'interview-practice',
        title: 'Prepare for the interview stage',
        description: `Practise for ${applicationTitle(activeApplication)} using the application context you have already recorded.`,
        href: `/interview-simulator?application=${encodeURIComponent(activeApplication.id)}&role=${encodeURIComponent(applicationTitle(activeApplication))}`,
        icon: 'interview',
      });
    }

    if (!activeApplication && savedJobs.length === 0) {
      actions.push({
        id: 'find-opportunity',
        title: 'Find an opportunity to work on',
        description: 'Review current external listings, then save one or record that you applied.',
        href: '/opportunities',
        icon: 'opportunities',
      });
    }

    if (!major && applications.length === 0 && savedJobs.length === 0 && !assessmentDone) {
      actions.push({
        id: 'assessment',
        title: 'Still choosing a direction?',
        description: 'Explore interest themes and broad role families. This does not measure skill or readiness.',
        href: '/assessment',
        icon: 'opportunities',
      });
    }
    return actions.slice(0, 3);
  }, [assessmentDone, cvCompletion, primaryFocus, major, applications.length, savedJobs.length]);

  const undecidedSavedJobs = useMemo(() => {
    const tracked = new Set(applications.map((application) => application.job?.id).filter(Boolean));
    return savedJobs.filter((saved) => !tracked.has(saved.job_id) && (primaryFocus.type !== 'saved' || saved.job_id !== primaryFocus.data.job_id));
  }, [applications, primaryFocus, savedJobs]);

  const coreDataUnavailable = dashboardDataState(loadErrors) === 'unavailable' || (loadErrors.includes('saved opportunities') && primaryFocus.type === 'start');

  return (
    <StudentLayout title="">
      <div className="space-y-6">
        <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
          <Greeting fullName={profile?.full_name ?? null} major={major} school={university} />
          <Button variant="outline" onClick={() => navigate('/opportunities')} className="self-start gap-1.5 sm:self-auto">
            Find an opportunity <ArrowRight className="h-4 w-4" />
          </Button>
        </header>

        {loading ? (
          <div className="grid gap-6" aria-busy="true" aria-label="Loading application desk">
            <div className="dossier-document overflow-hidden">
              <div className="h-36 animate-pulse border-b border-border bg-muted/60 motion-reduce:animate-none" />
              <div className="h-12 animate-pulse border-b border-border bg-muted/40 motion-reduce:animate-none" />
              <div className="h-44 animate-pulse bg-muted/25 motion-reduce:animate-none" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
              <div className="space-y-6">
                <div className="h-64 animate-pulse border border-border bg-muted/40 motion-reduce:animate-none" />
                <div className="h-48 animate-pulse border border-border bg-muted/30 motion-reduce:animate-none" />
              </div>
              <div className="space-y-6">
                <div className="h-44 animate-pulse border border-border bg-muted/40 motion-reduce:animate-none" />
                <div className="h-52 animate-pulse border border-border bg-muted/30 motion-reduce:animate-none" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {loadErrors.length > 0 && (
              <RecordState
                tone={coreDataUnavailable ? 'error' : 'warning'}
                title={coreDataUnavailable ? 'Your current work could not be loaded' : 'Some records are temporarily unavailable'}
                description={coreDataUnavailable ? 'Retry to load your applications and saved opportunities.' : `Unavailable sources: ${loadErrors.join(', ')}. The records that loaded successfully are still shown.`}
                action={<Button size="sm" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button>}
              />
            )}

            {!coreDataUnavailable && (primaryFocus.type === 'start' ? <EmptyState hasApplicationHistory={applications.length > 0} showAssessment={!major && !assessmentDone} /> : <PrimaryFocusCard {...primaryFocus} cvStarted={cvCompletion > 0} />)}

            {!coreDataUnavailable && <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.8fr)]">
              <div className="min-w-0 space-y-6">
                <RecentApplications items={recentApps} />
                <SavedDecisions items={undecidedSavedJobs} />
              </div>
              <aside className="space-y-6"><AttentionList items={attentionItems} /><NextActionsList actions={nextActions} /></aside>
            </div>}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
