import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

import { StudentLayout } from '@/components/layout/StudentLayout';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';
import { Button } from '@/components/ui/button';
import { RecordState } from '@/components/dossier';

import { loadDashboardData, type DashboardLoadError, type DashboardInterview } from '@/features/dashboard/data';
import { loadOpportunitySpotlight } from '@/features/dashboard/spotlight';
import { scoreResume } from '@/components/dashboard/home/utils';
import { dashboardDataState, type DashboardApplication, type DashboardSavedJob } from '@/features/dashboard/continuation';
import { opportunityRankingSummary } from '@/features/opportunities/ranking';
import type { OpportunityJob } from '@/features/opportunities/opportunity';
import {
  buildActiveApplications,
  buildCareerJourney,
  buildPreparationItems,
  firstName as toFirstName,
  hasDirection,
  selectNextMove,
  timeOfDayGreeting,
  type CareerDirection,
  type DiscoverSnapshot,
} from '@/features/dashboard/discover';
import {
  CareerJourney,
  ContinueWork,
  DiscoverHero,
  OpportunitySpotlight,
} from '@/components/dashboard/discover';

const EMPTY_INTERVIEW: DashboardInterview = { total: 0, lastRole: null, lastAt: null };

/**
 * Career command center — the student home.
 *
 * Composition answers one primary question: "What should I do next?"
 * Mobile priority: next action → continue (applications) → opportunities → career signal.
 * No invented KPIs or readiness scores.
 */
export default function Dashboard() {
  const navigate = useNavigate();
  const { profile, studentDetails, loading: profileLoading } = useUserProfile();
  const userId = useSupabaseUserId();

  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [loadErrors, setLoadErrors] = useState<DashboardLoadError[]>([]);
  const [assessmentDone, setAssessmentDone] = useState(false);
  const [direction, setDirection] = useState<CareerDirection | null>(null);
  const [applications, setApplications] = useState<DashboardApplication[]>([]);
  const [savedJobs, setSavedJobs] = useState<DashboardSavedJob[]>([]);
  const [cvCompletion, setCvCompletion] = useState(0);
  const [interview, setInterview] = useState<DashboardInterview>(EMPTY_INTERVIEW);
  const [spotlight, setSpotlight] = useState<OpportunityJob[]>([]);
  const [spotlightError, setSpotlightError] = useState(false);

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
        setDirection(bundle.direction);
        setApplications(bundle.applications);
        setSavedJobs(bundle.savedJobs);
        setCvCompletion(bundle.resume ? scoreResume(bundle.resume) : 0);
        setInterview(bundle.interview);

        // Spotlight excludes roles already tracked or saved so the home
        // never re-features work the student has decided on.
        const excluded = new Set<string>([
          ...bundle.applications.map((application) => application.job?.id).filter((id): id is string => Boolean(id)),
          ...bundle.savedJobs.map((saved) => saved.job_id),
        ]);
        const featured = await loadOpportunitySpotlight(
          supabase,
          {
            major: studentDetails?.major ?? null,
            interests: [bundle.direction?.primary, bundle.direction?.secondary, bundle.direction?.tertiary].filter(
              (value): value is string => Boolean(value),
            ),
            earlyCareer: profile?.user_type === 'student' || Boolean(studentDetails),
          },
          excluded,
        );
        if (cancelled) return;
        setSpotlight(featured.jobs);
        setSpotlightError(featured.error);

        if (bundle.errors.length > 0) {
          console.warn('[Dashboard] Some data sources were unavailable', { sources: bundle.errors });
        }
      } catch {
        console.error('[Dashboard] Data aggregation failed');
        setLoadErrors(['applications']);
        setAssessmentDone(false);
        setDirection(null);
        setApplications([]);
        setSavedJobs([]);
        setCvCompletion(0);
        setInterview(EMPTY_INTERVIEW);
        setSpotlight([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // studentDetails/profile are stable per session; userId + reloadKey drive reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profileLoading, reloadKey]);

  const snapshot = useMemo<DiscoverSnapshot>(
    () => ({
      fullName: profile?.full_name ?? null,
      major,
      school: university,
      assessmentDone,
      direction,
      applications,
      savedJobs,
      cvCompletion,
      interview,
    }),
    [profile?.full_name, major, university, assessmentDone, direction, applications, savedJobs, cvCompletion, interview],
  );

  const nextMove = useMemo(() => selectNextMove(snapshot), [snapshot]);
  const journey = useMemo(() => buildCareerJourney(snapshot, nextMove), [snapshot, nextMove]);
  const activeApps = useMemo(() => buildActiveApplications(snapshot, nextMove), [snapshot, nextMove]);
  const prepItems = useMemo(() => buildPreparationItems(snapshot, nextMove), [snapshot, nextMove]);

  const directionLine = useMemo(() => {
    if (major?.trim()) {
      return university?.trim() ? `${major.trim()} · ${university.trim()}` : major.trim();
    }
    if (direction?.primary) return `${direction.primary} interest`;
    return null;
  }, [major, university, direction]);

  const rankingSummary = useMemo(
    () =>
      opportunityRankingSummary({
        major,
        interests: [direction?.primary, direction?.secondary, direction?.tertiary].filter(
          (value): value is string => Boolean(value),
        ),
        earlyCareer: profile?.user_type === 'student' || Boolean(studentDetails),
      }),
    [major, direction, profile?.user_type, studentDetails],
  );

  const savedJobIds = useMemo(
    () => new Set(savedJobs.map((saved) => saved.job_id)),
    [savedJobs],
  );

  const handleSavedChange = useCallback((jobId: string, saved: boolean) => {
    setSavedJobs((current) => {
      if (saved) {
        if (current.some((row) => row.job_id === jobId)) return current;
        return [{ job_id: jobId, created_at: new Date().toISOString(), job: null }, ...current];
      }
      return current.filter((row) => row.job_id !== jobId);
    });
    if (saved) {
      // Once saved, drop it from the spotlight so it doesn't keep featuring.
      setSpotlight((jobs) => jobs.filter((job) => job.id !== jobId));
    }
  }, []);

  const coreDataUnavailable = dashboardDataState(loadErrors) === 'unavailable';
  const nonCriticalErrors = loadErrors.filter((error) => error !== 'applications');

  return (
    <StudentLayout title="">
      {loading ? (
        <DashboardSkeleton />
      ) : coreDataUnavailable ? (
        <div className="space-y-6">
          <RecordState
            tone="error"
            title="Your dashboard could not be loaded"
            description="We could not load your applications and current work. Retry to try again."
            action={
              <Button size="sm" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
                Retry
              </Button>
            }
          />
        </div>
      ) : (
        <div className="command-center flex flex-col gap-8 lg:gap-10">
          {nonCriticalErrors.length > 0 && (
            <RecordState
              tone="warning"
              title="Some records are temporarily unavailable"
              description={`Unavailable: ${nonCriticalErrors.join(', ')}. Everything that loaded is shown below.`}
              action={
                <Button size="sm" variant="outline" onClick={() => setReloadKey((value) => value + 1)}>
                  Retry
                </Button>
              }
            />
          )}

          {/* 1. Next action — always first */}
          <div className="order-1">
            <DiscoverHero
              greeting={timeOfDayGreeting()}
              firstName={toFirstName(profile?.full_name)}
              directionLine={directionLine}
              nextMove={nextMove}
            />
          </div>

          {/* 2. Continue — applications + CV / interview / assessment */}
          <div className="order-2">
            <ContinueWork
              applications={activeApps}
              totalTracked={applications.length}
              items={prepItems}
            />
          </div>

          {/* 3. Opportunities — small set of meaningful objects */}
          <div className="order-3">
            <OpportunitySpotlight
              jobs={spotlight}
              rankingSummary={rankingSummary}
              error={spotlightError}
              savedJobIds={savedJobIds}
              userId={userId}
              onSavedChange={handleSavedChange}
            />
          </div>

          {/* 4. Career signal — Discover · Prove · Advance (last on mobile) */}
          <div className="order-4">
            <CareerJourney phases={journey} />
          </div>

          {!hasDirection(snapshot) && applications.length === 0 && (
            <div className="order-5">
              <div className="discover-object p-5">
                <p className="text-sm font-medium text-foreground">Still choosing a direction?</p>
                <p className="type-secondary mt-1">
                  A short interest check surfaces the role families worth exploring. It does not
                  measure skill or readiness.
                </p>
                <div className="mt-4">
                  <Button variant="outline" size="sm" onClick={() => navigate('/assessment')} className="gap-1.5">
                    Take the assessment <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </StudentLayout>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true" aria-label="Loading your career command center">
      <div className="discover-hero h-52 animate-pulse motion-reduce:animate-none sm:h-56" />
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-surface border border-border bg-muted/40 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-surface border border-border bg-muted/30 motion-reduce:animate-none"
          />
        ))}
      </div>
      <div className="h-36 animate-pulse rounded-surface-lg border border-border bg-muted/25 motion-reduce:animate-none" />
    </div>
  );
}
