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
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Dashboard() {
  const { profile, studentDetails, loading: profileLoading } = useUserProfile();
  const userId = useSupabaseUserId();

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);
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
        const [assessmentRes, appsRes, savedRes, resumeRes] = await Promise.all([
          supabase
            .from('assessments')
            .select('completed_at')
            .eq('user_id', userId)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('job_applications')
            .select(`
              id, status, created_at, updated_at, next_action, next_action_due, resume_id,
              job_title_snapshot, company_name_snapshot,
              job:job_postings(id, title, company_name, location, employment_type, application_deadline)
            `)
            .eq('applicant_id', userId)
            .order('updated_at', { ascending: false })
            .limit(12),
          supabase
            .from('saved_jobs')
            .select(`
              job_id, created_at,
              job:job_postings(id, title, company_name, location, employment_type, application_deadline)
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('resumes')
            .select('personal_info, education, experience, skills, projects, achievements, updated_at')
            .eq('user_id', userId)
            .eq('is_primary', true)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        const failures = [
          assessmentRes.error && 'assessment', appsRes.error && 'applications', savedRes.error && 'saved opportunities',
          resumeRes.error && 'CV',
        ].filter((value): value is string => Boolean(value));
        setLoadErrors(failures);

        if (assessmentRes.data) {
          setAssessmentDone(true);
        }

        const appRows: DashboardApplication[] = (appsRes.data as any[] | null)?.map((r: any) => ({
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
          next_action: r.next_action ?? null,
          next_action_due: r.next_action_due ?? null,
          resume_id: r.resume_id ?? null,
          job_title_snapshot: r.job_title_snapshot ?? null,
          company_name_snapshot: r.company_name_snapshot ?? null,
          job: r.job ?? null,
        })) ?? [];
        setApplications(appRows);

        const savedRows: DashboardSavedJob[] = (savedRes.data as any[] | null)?.map((r: any) => ({
          job_id: r.job_id,
          created_at: r.created_at,
          job: r.job ?? null,
        })) ?? [];
        setSavedJobs(savedRows);

        const resumeData = resumeRes.data as any;
        if (resumeData) {
          setCvCompletion(scoreResume(resumeData));
        } else {
          setCvCompletion(0);
        }
      } catch (e) {
        console.error('Dashboard load error', e);
        setLoadErrors(['dashboard']);
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
      if (applications.some(a => (a.job as any)?.id === saved.job_id)) continue;
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

    if (activeApplication && !activeApplication.resume_id) {
      actions.push({
        id: 'link-cv',
        title: cvCompletion === 0 ? 'Create a CV for this application' : 'Link and review your CV',
        description: `Prepare evidence for ${applicationTitle(activeApplication)} and link the right CV from its workspace.`,
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
        {/* Greeting */}
        <Greeting fullName={profile?.full_name ?? null} major={major} school={university} />

        {loading ? (
          <div className="grid gap-4">
            <div className="h-40 animate-pulse rounded-lg bg-muted" />
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-4">
                <div className="h-56 animate-pulse rounded-lg bg-muted" />
                <div className="h-72 animate-pulse rounded-lg bg-muted" />
              </div>
              <div className="space-y-4">
                <div className="h-40 animate-pulse rounded-lg bg-muted" />
                <div className="h-48 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {loadErrors.length > 0 && <div role="alert" className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><span>{coreDataUnavailable ? 'Your current work could not be loaded.' : `Some dashboard data could not be loaded: ${loadErrors.join(', ')}. Available sections are still shown.`}</span></div>
              <Button size="sm" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button>
            </div>}

            {!coreDataUnavailable && (primaryFocus.type === 'start' ? <EmptyState hasApplicationHistory={applications.length > 0} showAssessment={!major && !assessmentDone} /> : <PrimaryFocusCard {...primaryFocus} />)}

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
