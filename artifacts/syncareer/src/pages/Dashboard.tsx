import React, { useEffect, useState, useMemo } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';

import { Greeting } from '@/components/dashboard/home/Greeting';
import { PrimaryFocusCard, type PrimaryApplication, type PrimarySaved } from '@/components/dashboard/home/PrimaryFocusCard';
import { AttentionList, type AttentionItem } from '@/components/dashboard/home/AttentionList';
import { RecentApplications, type RecentApp } from '@/components/dashboard/home/RecentApplications';
import { NextActionsList, type NextAction } from '@/components/dashboard/home/NextActions';
import { OnboardingProgress, type OnboardingStep } from '@/components/dashboard/home/OnboardingProgress';
import { RecentCompleted, type CompletedItem } from '@/components/dashboard/home/RecentCompleted';
import { EmptyState } from '@/components/dashboard/home/EmptyState';
import { ACTIVE_STATUSES, scoreResume, getDaysUntilDeadline } from '@/components/dashboard/home/utils';

interface JobLite {
  id: string;
  title: string;
  company_name?: string | null;
  location?: string | null;
  employment_type?: string | null;
  application_deadline?: string | null;
}

interface AppRow {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  job: JobLite | null;
}

interface SavedRow {
  job_id: string;
  created_at: string;
  job: JobLite | null;
}

interface InterviewRow {
  id: string;
  job_role: string;
  overall_score: number | null;
  completed_at: string | null;
  created_at: string;
  status: string;
}

export default function Dashboard() {
  const { profile, studentDetails, loading: profileLoading } = useUserProfile();
  const userId = useSupabaseUserId();

  const [loading, setLoading] = useState(true);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [primaryInterest, setPrimaryInterest] = useState<string | null>(null);
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedRow[]>([]);
  const [cvCompletion, setCvCompletion] = useState(0);
  const [cvUpdatedAt, setCvUpdatedAt] = useState<string | null>(null);
  const [interviewScore, setInterviewScore] = useState(0);
  const [interviews, setInterviews] = useState<InterviewRow[]>([]);

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
      try {
        const [
          assessmentRes,
          appsRes,
          savedRes,
          resumeRes,
          interviewsRes,
        ] = await Promise.all([
          supabase
            .from('assessments')
            .select('primary_interest, completed_at')
            .eq('user_id', userId)
            .not('completed_at', 'is', null)
            .order('completed_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase
            .from('job_applications')
            .select(`
              id, status, created_at, updated_at,
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
          supabase
            .from('mock_interviews')
            .select('id, job_role, overall_score, completed_at, created_at, status')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(6),
        ]);

        if (cancelled) return;

        if (assessmentRes.data) {
          setAssessmentDone(true);
          setPrimaryInterest(assessmentRes.data.primary_interest ?? null);
        }

        const appRows: AppRow[] = (appsRes.data as any[] | null)?.map((r: any) => ({
          id: r.id,
          status: r.status,
          created_at: r.created_at,
          updated_at: r.updated_at,
          job: r.job ?? null,
        })) ?? [];
        setApplications(appRows);

        const savedRows: SavedRow[] = (savedRes.data as any[] | null)?.map((r: any) => ({
          job_id: r.job_id,
          created_at: r.created_at,
          job: r.job ?? null,
        })) ?? [];
        setSavedJobs(savedRows);

        const resumeData = resumeRes.data as any;
        if (resumeData) {
          setCvCompletion(scoreResume(resumeData));
          setCvUpdatedAt(resumeData.updated_at ?? null);
        } else {
          setCvCompletion(0);
        }

        const interviewRows: InterviewRow[] = (interviewsRes.data as any[] | null) ?? [];
        setInterviews(interviewRows);
        const latestScored = interviewRows.find(i => i.overall_score !== null);
        setInterviewScore(latestScored?.overall_score ?? 0);
      } catch (e) {
        console.error('Dashboard load error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [userId, profileLoading]);

  // Derived: primary focus
  const primaryFocus = useMemo(() => {
    if (applications.length === 0 && savedJobs.length === 0) return { type: 'none' as const };
    // Prefer active application
    const active = applications.find(a => ACTIVE_STATUSES.includes(a.status));
    if (active) {
      const d: PrimaryApplication = {
        id: active.id,
        status: active.status,
        created_at: active.created_at,
        updated_at: active.updated_at,
        job: active.job ? {
          id: (active.job as any).id,
          title: active.job.title,
          company_name: active.job.company_name,
          location: active.job.location,
          employment_type: active.job.employment_type,
          application_deadline: active.job.application_deadline,
        } : null,
      };
      return { type: 'application' as const, data: d };
    }
    // If no active but have applications, show most recent as focus (to record outcome etc)
    if (applications.length > 0) {
      const recent = applications[0]!;
      const d: PrimaryApplication = {
        id: recent.id,
        status: recent.status,
        created_at: recent.created_at,
        updated_at: recent.updated_at,
        job: recent.job ? {
          id: (recent.job as any).id,
          title: recent.job.title,
          company_name: recent.job.company_name,
          location: recent.job.location,
          employment_type: recent.job.employment_type,
          application_deadline: recent.job.application_deadline,
        } : null,
      };
      return { type: 'application' as const, data: d };
    }
    // Saved jobs fallback
    const saved = savedJobs[0];
    if (saved?.job) {
      const d: PrimarySaved = {
        job_id: saved.job_id,
        created_at: saved.created_at,
        job: {
          id: (saved.job as any).id,
          title: saved.job.title,
          company_name: saved.job.company_name,
          location: saved.job.location,
          employment_type: saved.job.employment_type,
          application_deadline: saved.job.application_deadline,
        },
      };
      return { type: 'saved' as const, data: d };
    }
    return { type: 'none' as const };
  }, [applications, savedJobs]);

  // Attention: deadlines within 30 days
  const attentionItems = useMemo<AttentionItem[]>(() => {
    const all: AttentionItem[] = [];
    for (const app of applications) {
      const dl = app.job?.application_deadline;
      if (!dl) continue;
      const days = getDaysUntilDeadline(dl);
      if (days === null || days < 0 || days > 30) continue;
      all.push({
        id: `app-${app.id}`,
        title: app.job?.title ?? 'Application',
        company: app.job?.company_name ?? null,
        deadline: dl,
        source: 'application',
        href: '/applications',
      });
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
        href: '/opportunities',
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
      job: a.job ? {
        title: a.job.title,
        company_name: a.job.company_name,
        location: a.job.location,
      } : null,
    }));
  }, [applications]);

  const nextActions = useMemo<NextAction[]>(() => {
    const actions: NextAction[] = [];
    if (!assessmentDone) {
      actions.push({
        id: 'assessment',
        title: 'Take the career assessment',
        description: 'Discover your top career fits — 10 minutes with RIASEC.',
        href: '/assessment',
        icon: 'opportunities',
      });
      // for new users without assessment, return early with just this + browse
      if (applications.length === 0 && savedJobs.length === 0) {
        actions.push({
          id: 'browse',
          title: 'Browse opportunities',
          description: 'See roles matched to your background and save ones to pursue.',
          href: '/opportunities',
          icon: 'opportunities',
        });
        return actions.slice(0, 3);
      }
    }

    if (cvCompletion < 60) {
      actions.push({
        id: 'cv',
        title: cvCompletion === 0 ? 'Build your CV' : 'Improve your CV',
        description: cvCompletion === 0
          ? 'Create a clear, role-focused CV for your applications.'
          : `Your CV is ${cvCompletion}% complete. Use the section checklist to decide what to add next.`,
        href: '/cv-builder',
        icon: 'cv',
      });
    }

    if (interviewScore === 0 || interviewScore < 70) {
      actions.push({
        id: 'interview',
        title: interviewScore === 0 ? 'Practise an interview' : 'Lift your interview score',
        description: interviewScore === 0
          ? 'Run a mock interview with feedback tailored to a role you care about.'
          : `Last score ${interviewScore}%. One more practice session to reach 70%.`,
        href: '/interview-simulator',
        icon: 'interview',
      });
    }

    if (savedJobs.length > 0 && applications.length === 0) {
      actions.push({
        id: 'apply-saved',
        title: 'Apply to a saved role',
        description: `You have ${savedJobs.length} saved ${savedJobs.length === 1 ? 'role' : 'roles'}. Start with your most recent save.`,
        href: '/opportunities',
        icon: 'opportunities',
      });
    }

    const hasOffer = applications.some(a => a.status === 'offered');
    if (hasOffer) {
      actions.push({
        id: 'outcome-offer',
        title: 'Record your offer outcome',
        description: 'You have an offer in your tracker. Update the outcome to keep your pipeline accurate.',
        href: '/applications',
        icon: 'outcome',
      });
    } else {
      const pendingOld = applications.find(a => {
        const days = (Date.now() - new Date(a.updated_at).getTime()) / 86400000;
        return a.status === 'pending' && days > 7;
      });
      if (pendingOld) {
        actions.push({
          id: 'review-pending',
          title: 'Review pending application',
          description: `Your application for ${pendingOld.job?.title ?? 'a role'} has been pending for over a week. Consider following up or recording an outcome.`,
          href: '/applications',
          icon: 'outcome',
        });
      }
    }

    if (actions.length === 0 && applications.length === 0) {
      actions.push({
        id: 'browse-fallback',
        title: 'Browse opportunities',
        description: 'Find and save roles aligned to your major and skills.',
        href: '/opportunities',
        icon: 'opportunities',
      });
    }

    // deduplicate by id, limit 3
    const seen = new Set<string>();
    const uniq: NextAction[] = [];
    for (const a of actions) {
      if (seen.has(a.id)) continue;
      seen.add(a.id);
      uniq.push(a);
      if (uniq.length >= 3) break;
    }
    return uniq;
  }, [assessmentDone, cvCompletion, interviewScore, applications, savedJobs]);

  const recentCompleted = useMemo<CompletedItem[]>(() => {
    const items: CompletedItem[] = [];
    for (const app of applications.slice(0, 5)) {
      items.push({
        id: `app-${app.id}`,
        type: 'application',
        title: app.job?.title ? `Applied to ${app.job.title}` : 'Application submitted',
        date: app.created_at,
      });
    }
    for (const iv of interviews.slice(0, 5)) {
      if (!iv.completed_at && iv.status !== 'completed' && iv.overall_score === null) continue;
      items.push({
        id: `iv-${iv.id}`,
        type: 'interview',
        title: iv.job_role ? `Interview practice: ${iv.job_role}` : 'Interview practice',
        date: iv.completed_at ?? iv.created_at,
      });
    }
    if (cvCompletion > 0 && cvUpdatedAt) {
      items.push({
        id: 'cv',
        type: 'cv',
        title: 'CV updated',
        date: cvUpdatedAt,
      });
    }
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items.slice(0, 3);
  }, [applications, interviews, cvCompletion, cvUpdatedAt]);

  const onboardingSteps = useMemo<OnboardingStep[]>(() => {
    return [
      {
        id: 'profile',
        label: 'Complete profile',
        description: major ? `${major}${university ? ` at ${university}` : ''}` : 'Add your major and university to get matched roles',
        done: !!major,
        href: '/onboarding',
      },
      {
        id: 'assessment',
        label: 'Take career assessment',
        description: assessmentDone ? (primaryInterest ? `Top fit: ${primaryInterest}` : 'Assessment completed') : 'Discover your top career fits in 10 minutes',
        done: assessmentDone,
        href: '/assessment',
      },
      {
        id: 'cv',
        label: 'Build your CV',
        description: cvCompletion > 0 ? `CV completion ${cvCompletion}%` : 'Create your primary CV',
        done: cvCompletion > 0,
        href: '/cv-builder',
      },
    ];
  }, [major, university, assessmentDone, primaryInterest, cvCompletion]);

  const showOnboarding = useMemo(() => {
    const onboardingIncomplete = profile?.onboarding_completed === false;
    const hasIncompleteStep = onboardingSteps.some(s => !s.done);
    // Only show when genuinely incomplete and user has little activity
    return onboardingIncomplete || (hasIncompleteStep && (applications.length + savedJobs.length <= 1));
  }, [profile?.onboarding_completed, onboardingSteps, applications.length, savedJobs.length]);

  const isNewUser = useMemo(() => {
    return applications.length === 0 && savedJobs.length === 0 && cvCompletion === 0 && interviewScore === 0 && !assessmentDone;
  }, [applications.length, savedJobs.length, cvCompletion, interviewScore, assessmentDone]);

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
        ) : isNewUser ? (
          <div className="space-y-6">
            <EmptyState />
            {showOnboarding && <OnboardingProgress steps={onboardingSteps} />}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_0.9fr] gap-6 items-start">
            {/* Main column */}
            <div className="space-y-6 min-w-0">
              {primaryFocus.type !== 'none' && <PrimaryFocusCard {...primaryFocus as any} />}

              <RecentApplications items={recentApps} />

              {/* On mobile, attention and next actions appear after recent apps before completed? Keep same order for desktop via side column */}
              <div className="lg:hidden space-y-6">
                <AttentionList items={attentionItems} />
                <NextActionsList actions={nextActions} />
                <RecentCompleted items={recentCompleted} />
                {showOnboarding && <OnboardingProgress steps={onboardingSteps} />}
              </div>
            </div>

            {/* Side column */}
            <div className="hidden lg:flex flex-col gap-6">
              <AttentionList items={attentionItems} />
              <NextActionsList actions={nextActions} />
              <RecentCompleted items={recentCompleted} />
              {showOnboarding && <OnboardingProgress steps={onboardingSteps} />}
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
