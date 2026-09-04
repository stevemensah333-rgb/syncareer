import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart3,
  Bookmark,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import { OpportunityCard } from '@/components/opportunities/OpportunityCard';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import { getDeadlineState, type OpportunityJob } from '@/features/opportunities/opportunity';
import { buildFitExplanation, hasProfileSignals, type FitExplanation } from '@/features/opportunities/fit';
import {
  getMajorTerms,
  opportunityRankingSummary,
  rankAndDeduplicateOpportunities,
  type OpportunityProfileSignals,
} from '@/features/opportunities/ranking';
import { classifyTrackerError, startTrackingApplication } from '@/features/application-tracker/tracking';
import type { ApplicationRef } from '@/features/application-tracker/workflow';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { RecordState } from '@/components/dossier';

const EMPLOYMENT_TYPES = ['all', 'full-time', 'part-time', 'internship', 'contract', 'remote'];
const EXPERIENCE_LEVELS = ['all', 'entry', 'mid', 'senior'];
const DEADLINE_FILTERS = [
  { value: 'all', label: 'Any deadline' },
  { value: '7', label: 'Closing in 7 days' },
  { value: '30', label: 'Closing in 30 days' },
];

type LoadStatus = 'loading' | 'error' | 'ready';
const SCROLL_STORAGE_KEY = 'syncareer.opportunities.scrollTop';
const INITIAL_VISIBLE_ROWS = 20;
const WORKSPACE_MIN_HEIGHT = 420;
const WORKSPACE_BOTTOM_PADDING = 24;

// On desktop, sizes the two-pane workspace to the remaining viewport height so the
// job list scrolls inside the viewport instead of extending below the fold (a fixed
// calc offset breaks whenever the header height changes). When too little room
// remains — short viewports — it opts out so the page scrolls naturally instead of
// showing a cramped, half-clipped pane.
const useRemainingViewportHeight = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)');
    const update = () => {
      const element = ref.current;
      if (!desktop.matches || !element || !element.isConnected) {
        if (!desktop.matches) setHeight(null);
        return;
      }
      const top = Math.max(element.getBoundingClientRect().top, 56); // clamp when page is scrolled past the workspace
      const available = window.innerHeight - top - WORKSPACE_BOTTOM_PADDING;
      setHeight(available >= WORKSPACE_MIN_HEIGHT ? Math.floor(available) : null);
    };

    update();
    // Observe body (not just viewport): the header/hero above the workspace can
    // finish rendering after mount, changing the workspace's top offset.
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    window.addEventListener('resize', update);
    window.addEventListener('load', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('load', update);
      window.removeEventListener('scroll', update);
    };
  }, []);

  const constrained = height !== null;
  return { ref, constrained, style: constrained ? { height: `${height}px` } : undefined };
};

const Opportunities = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { studentDetails, profile } = useUserProfile();

  const [jobs, setJobs] = useState<OpportunityJob[]>([]);
  const [profileSignals, setProfileSignals] = useState<Pick<OpportunityProfileSignals, 'skills' | 'interests'>>({
    skills: [],
    interests: [],
  });
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_ROWS);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [applicationsByJob, setApplicationsByJob] = useState<Map<string, ApplicationRef>>(new Map());
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<{ category: string; userMessage: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('job'));
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [trackingIds, setTrackingIds] = useState<Set<string>>(new Set());
  const [partialWarning, setPartialWarning] = useState<string | null>(null);
  const pendingSaveIds = useRef(new Set<string>());
  const saveRequestVersions = useRef(new Map<string, number>());
  const pendingTrackingIds = useRef(new Set<string>());
  const listRef = useRef<HTMLDivElement>(null);
  const { ref: workspaceRef, style: workspaceStyle, constrained: workspaceConstrained } = useRemainingViewportHeight();
  const openMobileOnSelection = useRef(Boolean(searchParams.get('job')));

  // Filters
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [locationFilter, setLocationFilter] = useState(() => searchParams.get('location') ?? '');
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') ?? 'all');
  const [experienceFilter, setExperienceFilter] = useState(() => searchParams.get('level') ?? 'all');
  const [deadlineFilter, setDeadlineFilter] = useState(() => searchParams.get('deadline') ?? 'all');
  const [tab, setTab] = useState<'all' | 'saved'>(() => (searchParams.get('view') === 'saved' ? 'saved' : 'all'));

  const load = useCallback(async () => {
    setLoadStatus('loading');
    setLoadError(null);
    setPartialWarning(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoadStatus('error');
        setLoadError({
          category: 'auth-expired',
          userMessage: 'Please sign in again to view opportunities.',
        });
        return;
      }

      const [jobsRes, savedRes, appsRes, skillsRes, interestsRes] = await Promise.all([
        supabase
          .from('job_postings')
          .select('*')
          .eq('status', 'active')
          .eq('is_external', true)
          .order('created_at', { ascending: false }),
        supabase.from('saved_jobs').select('job_id').eq('user_id', session.user.id),
        supabase
          .from('job_applications')
          .select('id, job_id, status')
          .eq('applicant_id', session.user.id),
        supabase.from('user_skills').select('skill_name').eq('user_id', session.user.id).limit(25),
        supabase
          .from('assessments')
          .select('primary_interest, secondary_interest, tertiary_interest')
          .eq('user_id', session.user.id)
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
          .limit(1),
      ]);

      if (jobsRes.error) throw jobsRes.error;

      setProfileSignals({
        skills: skillsRes.error ? [] : (skillsRes.data ?? []).map((skill) => skill.skill_name).filter(Boolean),
        interests: interestsRes.error
          ? []
          : (interestsRes.data ?? []).flatMap((assessment) => [
              assessment.primary_interest,
              assessment.secondary_interest,
              assessment.tertiary_interest,
            ]).filter((interest): interest is string => Boolean(interest)),
      });
      setSavedIds(new Set(savedRes.error ? [] : (savedRes.data ?? []).map((s) => s.job_id)));
      setApplicationsByJob(
        new Map(
          (appsRes.error ? [] : (appsRes.data ?? []))
            // job_id is nullable since postings can be removed; those applications
            // have no card on this page to mark as applied.
            .filter((a): a is typeof a & { job_id: string } => typeof a.job_id === 'string')
            .map((a) => [a.job_id, { id: a.id, status: a.status }]),
        ),
      );
      if (savedRes.error || appsRes.error) {
        setPartialWarning('Opportunities loaded, but saved or applied state could not be refreshed. Retry before changing those records.');
      }
      setJobs(jobsRes.data ?? []);
      setLoadStatus('ready');
    } catch (err) {
      const classified = classifyTrackerError(err);
      setLoadError({ category: classified.category, userMessage: classified.userMessage });
      setLoadStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rankingProfile = useMemo<OpportunityProfileSignals>(
    () => ({
      major: studentDetails?.major ?? null,
      skills: profileSignals.skills,
      interests: profileSignals.interests,
      earlyCareer: profile?.user_type === 'student' || Boolean(studentDetails),
    }),
    [profile?.user_type, profileSignals.interests, profileSignals.skills, studentDetails],
  );

  const ranked = useMemo(
    () => rankAndDeduplicateOpportunities(jobs, rankingProfile),
    [jobs, rankingProfile],
  );
  const rankingSummary = useMemo(() => opportunityRankingSummary(rankingProfile), [rankingProfile]);
  const deduplicatedCount = jobs.length - ranked.length;
  const fitByJob = useMemo(() => {
    const map = new Map<string, FitExplanation | null>();
    for (const result of ranked) {
      map.set(result.job.id, buildFitExplanation(result.job, result, rankingProfile));
    }
    return map;
  }, [ranked, rankingProfile]);
  const hasSignals = useMemo(() => hasProfileSignals(rankingProfile), [rankingProfile]);

  // Filtered list — ranking and source-level deduplication happen before user filters.
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return ranked.filter((result) => {
      const j = result.job;
      if (tab === 'saved' && !savedIds.has(j.id)) return false;
      if (query) {
        const blob = [
          j.title,
          j.company_name || '',
          j.department || '',
          j.location || '',
          (j.skills || []).join(' '),
          j.description,
          j.requirements || '',
        ].join(' ').toLocaleLowerCase();
        if (!blob.includes(query)) return false;
      }
      if (locationFilter) {
        if (!j.location?.toLocaleLowerCase().includes(locationFilter.toLocaleLowerCase())) return false;
      }
      if (typeFilter !== 'all' && j.employment_type !== typeFilter) return false;
      if (experienceFilter !== 'all' && j.experience_level !== experienceFilter) return false;
      if (deadlineFilter !== 'all') {
        const state = getDeadlineState(j.application_deadline);
        if (state.daysLeft === null || state.daysLeft > Number(deadlineFilter) || state.daysLeft < 0)
          return false;
      }
      return true;
    });
  }, [ranked, tab, savedIds, search, locationFilter, typeFilter, experienceFilter, deadlineFilter]);

  const visibleRanked = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const remainingCount = Math.max(0, filtered.length - visibleRanked.length);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_ROWS);
  }, [deadlineFilter, experienceFilter, locationFilter, search, tab, typeFilter, jobs]);

  const selected = filtered.find((result) => result.job.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (filtered.length && !filtered.find((result) => result.job.id === selectedId)) {
      setSelectedId(filtered[0]!.job.id);
    }
  }, [filtered, selectedId]);

  // A deep link or a relevance re-rank can select a card outside the initial
  // render window. Expand only far enough to make it visible.
  useEffect(() => {
    if (!selectedId) return;
    const selectedIndex = filtered.findIndex((result) => result.job.id === selectedId);
    if (selectedIndex >= 0) setVisibleCount((current) => Math.max(current, selectedIndex + 1));
  }, [filtered, selectedId]);

  // Keep inspection context in the URL so protected-route auth redirects and
  // browser history retain filters and selection.
  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedId) next.set('job', selectedId);
    if (search.trim()) next.set('q', search.trim());
    if (locationFilter) next.set('location', locationFilter);
    if (typeFilter !== 'all') next.set('type', typeFilter);
    if (experienceFilter !== 'all') next.set('level', experienceFilter);
    if (deadlineFilter !== 'all') next.set('deadline', deadlineFilter);
    if (tab === 'saved') next.set('view', 'saved');
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [deadlineFilter, experienceFilter, locationFilter, search, searchParams, selectedId, setSearchParams, tab, typeFilter]);

  useEffect(() => {
    if (!selectedId || jobs.length === 0) return;
    if (openMobileOnSelection.current && jobs.some((job) => job.id === selectedId) && window.innerWidth < 1024) {
      setMobileDetailOpen(true);
      openMobileOnSelection.current = false;
    }
  }, [jobs, searchParams, selectedId]);

  useEffect(() => {
    if (loadStatus !== 'ready' || !listRef.current) return;
    const stored = Number(sessionStorage.getItem(SCROLL_STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) listRef.current.scrollTop = stored;
  }, [loadStatus]);

  useEffect(() => {
    if (loadStatus === 'ready') captureProductEvent(ANALYTICS_EVENTS.OPPORTUNITIES_VIEWED, { view: tab });
  }, [loadStatus, tab]);

  const savedIdsRef = useRef(savedIds);
  savedIdsRef.current = savedIds;
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const partialWarningRef = useRef(partialWarning);
  partialWarningRef.current = partialWarning;
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  const toggleSave = useCallback(async (jobId: string) => {
    if (pendingSaveIds.current.has(jobId) || partialWarningRef.current) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to save opportunities');
      return;
    }
    const wasSaved = savedIdsRef.current.has(jobId);
    const version = (saveRequestVersions.current.get(jobId) ?? 0) + 1;
    saveRequestVersions.current.set(jobId, version);
    pendingSaveIds.current.add(jobId);
    setSavingIds((current) => new Set(current).add(jobId));
    setSavedIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
    try {
      if (wasSaved) {
        const { error } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', user.id)
          .eq('job_id', jobId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saved_jobs')
          .insert({ user_id: user.id, job_id: jobId });
        if (error && error.code !== '23505') throw error;
        const job = jobsRef.current.find((item) => item.id === jobId);
        captureProductEvent(ANALYTICS_EVENTS.OPPORTUNITY_SAVED, { source_kind: job?.is_external ? 'external' : 'native' });
        toast.success('Saved — find it under the Saved tab');
      }
    } catch (err) {
      if (saveRequestVersions.current.get(jobId) === version) {
        setSavedIds((current) => {
          const next = new Set(current);
          if (wasSaved) next.add(jobId);
          else next.delete(jobId);
          return next;
        });
      }
      toast.error(classifyTrackerError(err).userMessage);
    } finally {
      if (saveRequestVersions.current.get(jobId) === version) {
        pendingSaveIds.current.delete(jobId);
        setSavingIds((current) => {
          const next = new Set(current);
          next.delete(jobId);
          return next;
        });
      }
    }
  }, []);

  const trackApplication = useCallback(async (job: OpportunityJob) => {
    if (pendingTrackingIds.current.has(job.id)) return;
    pendingTrackingIds.current.add(job.id);
    setTrackingIds((current) => new Set(current).add(job.id));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to apply');
        return;
      }
      const result = await startTrackingApplication(supabase, session.user.id, job.id);
      if (!result.ok) {
        toast.error(result.userMessage);
        return;
      }
      if (result.alreadyTracked) {
        toast.info('Already tracked — open it from Applications');
        return;
      }
      if (result.applicationId) {
        setApplicationsByJob((prev) => {
          const next = new Map(prev);
          next.set(job.id, { id: result.applicationId!, status: 'pending' });
          return next;
        });
      }
      captureProductEvent(ANALYTICS_EVENTS.APPLICATION_CREATED, { origin: 'opportunity' });
      captureProductEvent(ANALYTICS_EVENTS.OPPORTUNITY_MARKED_APPLIED, { source_kind: job.is_external ? 'external' : 'native' });
      toast.success('Now tracking this application');
    } catch (err) {
      toast.error(classifyTrackerError(err).userMessage);
    } finally {
      pendingTrackingIds.current.delete(job.id);
      setTrackingIds((current) => {
        const next = new Set(current);
        next.delete(job.id);
        return next;
      });
    }
  }, []);

  const activeFilterCount =
    (locationFilter ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (experienceFilter !== 'all' ? 1 : 0) +
    (deadlineFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setLocationFilter('');
    setTypeFilter('all');
    setExperienceFilter('all');
    setDeadlineFilter('all');
  };

  const removeChip = (kind: 'location' | 'type' | 'experience' | 'deadline') => {
    if (kind === 'location') setLocationFilter('');
    if (kind === 'type') setTypeFilter('all');
    if (kind === 'experience') setExperienceFilter('all');
    if (kind === 'deadline') setDeadlineFilter('all');
  };

  const searchSuggestions = useMemo(() => {
    const major = rankingProfile.major?.trim();
    if (!major || search.trim()) return [];
    return getMajorTerms(major)
      .filter((term) => term.toLocaleLowerCase() !== major.toLocaleLowerCase())
      .slice(0, 3);
  }, [rankingProfile.major, search]);

  const searchFeedback = search.trim()
    ? `${filtered.length} ${filtered.length === 1 ? 'opportunity' : 'opportunities'} for “${search.trim()}”`
    : `${filtered.length} open ${filtered.length === 1 ? 'opportunity' : 'opportunities'}`;

  const isLoading = loadStatus === 'loading';

  const handleRowKeyDown = useCallback((event: React.KeyboardEvent<HTMLButtonElement>, jobId: string) => {
    const rows = filteredRef.current;
    const index = rows.findIndex((result) => result.job.id === jobId);
    if (index < 0) return;
    let target = index;
    if (event.key === 'ArrowDown') target = Math.min(rows.length - 1, index + 1);
    else if (event.key === 'ArrowUp') target = Math.max(0, index - 1);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = rows.length - 1;
    else return;
    event.preventDefault();
    const next = rows[target];
    if (!next) return;
    setSelectedId(next.job.id);
    setVisibleCount((current) => Math.max(current, target + 1));
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-opportunity-id="${next.job.id}"]`)?.focus();
    });
  }, []);

  const handleSelect = useCallback((jobId: string) => {
    openMobileOnSelection.current = true;
    setSelectedId(jobId);
    if (window.innerWidth < 1024) setMobileDetailOpen(true);
  }, []);

  const emptyState = () => {
    if (tab === 'saved' && savedIds.size === 0) {
      return {
        title: 'No saved opportunities yet',
        body: 'Save a role from the list and it will be waiting for you here.',
      };
    }
    if (tab === 'saved') {
      return { title: 'Nothing saved matches these filters', body: 'Try widening your filters.' };
    }
    if (jobs.length === 0) {
      return {
        title: 'No open opportunities right now',
        body: 'New roles are added automatically. Check back soon or explore market intelligence for your field.',
      };
    }
    return {
      title: search.trim() ? `No opportunities for “${search.trim()}”` : 'Nothing matches these filters',
      body: 'Try a different search or reset the filters.',
    };
  };

  return (
    <PageLayout
      title="Opportunities"
      description="Explore open roles, see why they fit your path, and decide what to do next."
    >
      <div className="layout-section">
        {/* STEP 1 — What I'm looking for: strong search on the Syncareer canvas */}
        <section className="discover-hero p-4 sm:p-5" aria-labelledby="opportunity-search-title">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="opportunity-search-title" className="type-section-title">
                What are you looking for?
              </h2>
              <p className="type-secondary mt-1 max-w-2xl">
                Search by role, skill, organisation or place. Results update as you type, and the
                feed is ordered using your major, recorded skills and career interests when you
                have them.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/analysis')}
              className="gap-1.5 text-muted-foreground"
            >
              <BarChart3 aria-hidden="true" className="size-4" />
              Market intelligence
            </Button>
          </div>

          <form
            role="search"
            aria-label="Search the opportunity feed"
            onSubmit={(event) => event.preventDefault()}
            className="mt-3 flex flex-col gap-2.5 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Role, skill, organisation, or place"
                aria-label="Search opportunities"
                autoComplete="off"
                className="h-11 pl-9 pr-10"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  <X aria-hidden="true" className="size-4" />
                </button>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFiltersOpen(true)}
              className="h-11 shrink-0 gap-2"
              aria-label={activeFilterCount > 0 ? `Filters, ${activeFilterCount} active` : 'Filters'}
            >
              <SlidersHorizontal aria-hidden="true" className="size-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="soft-primary" className="px-1.5 py-0 text-[11px]" aria-hidden="true">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          </form>

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 min-w-0">
            <p
              key={searchFeedback}
              aria-live="polite"
              className={cn('type-meta animate-fade-in motion-reduce:animate-none', 'pr-1 min-w-0')}
            >
              {searchFeedback}
            </p>
            {searchSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setSearch(suggestion)}
                className="min-h-6 rounded-control border border-border bg-card px-2 py-1 text-[11px] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Active filters as removable chips — progressive disclosure, not a filter wall */}
          {activeFilterCount > 0 && (
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5 min-w-0">
              {locationFilter && (
                <FilterChip label={`Location · ${locationFilter}`} onRemove={() => removeChip('location')} />
              )}
              {typeFilter !== 'all' && (
                <FilterChip
                  label={`Type · ${typeFilter.charAt(0).toUpperCase()}${typeFilter.slice(1)}`}
                  onRemove={() => removeChip('type')}
                />
              )}
              {experienceFilter !== 'all' && (
                <FilterChip
                  label={`Level · ${experienceFilter.charAt(0).toUpperCase()}${experienceFilter.slice(1)}`}
                  onRemove={() => removeChip('experience')}
                />
              )}
              {deadlineFilter !== 'all' && (
                <FilterChip
                  label={DEADLINE_FILTERS.find((option) => option.value === deadlineFilter)?.label ?? 'Deadline'}
                  onRemove={() => removeChip('deadline')}
                />
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Clear all
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </div>
          )}

          {!hasSignals && loadStatus === 'ready' && (
            <p className="type-meta mt-2.5">
              Add your major and skills to see why each role fits.{' '}
              <Link
                to="/cv-builder"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                Update your CV
              </Link>
            </p>
          )}
        </section>

        {partialWarning && (
          <RecordState
            tone="warning"
            title="Saved and tracked state may be out of date"
            description={partialWarning}
            action={
              <Button variant="outline" size="sm" onClick={load}>
                Refresh state
              </Button>
            }
          />
        )}

        {isLoading ? (
          <div
            ref={workspaceRef}
            style={workspaceStyle}
            className={cn(
              'surface-content grid min-h-[520px] gap-3 p-4 lg:grid-cols-[minmax(340px,420px)_1fr]',
              workspaceConstrained && 'lg:overflow-hidden',
            )}
            aria-busy="true"
            aria-label="Loading opportunities"
          >
            <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="discover-object p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-11 w-11 rounded-sm" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="mt-3 h-3 w-1/2" />
                  <div className="mt-4 h-8 w-24" />
                </div>
              ))}
            </div>
            <div className="hidden space-y-4 p-6 lg:block">
              <Skeleton className="h-7 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : loadStatus === 'error' ? (
          <RecordState
            tone="error"
            title={
              loadError?.category === 'permission'
                ? 'You do not have access to opportunities'
                : loadError?.category === 'auth-expired'
                  ? 'Your session has expired'
                  : 'Opportunities could not be loaded'
            }
            description={loadError?.userMessage ?? 'Something went wrong while loading opportunities.'}
            action={
              loadError?.category !== 'permission' ? (
                <Button onClick={load} variant="outline" className="gap-1.5">
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Try again
                </Button>
              ) : undefined
            }
            className="mx-auto max-w-2xl"
          />
        ) : (
          <>
            {/* STEP 2–4 — Relevant opportunities → why they fit → what to do */}
            <div
              ref={workspaceRef}
              style={workspaceStyle}
              className={cn(
                'surface-content grid min-h-[520px] grid-cols-1 lg:grid-cols-[minmax(340px,420px)_1fr]',
                workspaceConstrained && 'lg:overflow-hidden',
              )}
            >
              <section
                className="flex min-h-0 min-w-0 flex-col border-border lg:border-r"
                aria-label="Opportunity results"
              >
                <Tabs value={tab} onValueChange={(value) => setTab(value as 'all' | 'saved')} className="flex min-h-0 flex-1 flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                    <TabsList>
                      <TabsTrigger value="all">Latest</TabsTrigger>
                      <TabsTrigger value="saved" className="gap-1.5">
                        <Bookmark aria-hidden="true" className="size-3.5" />
                        Saved ({savedIds.size})
                      </TabsTrigger>
                    </TabsList>
                    {rankingSummary && tab === 'all' && (
                      <p role="status" className="type-meta min-w-0 truncate">
                        {rankingSummary}
                        {deduplicatedCount > 0
                          ? ` ${deduplicatedCount} duplicate ${deduplicatedCount === 1 ? 'listing was' : 'listings were'} hidden.`
                          : ''}
                      </p>
                    )}
                  </div>

                  {/* The tabs own the results list: each value renders the same
                      list (already filtered by `tab`) inside its panel so the
                      tab triggers reference real tabpanel ids. */}
                  {(['all', 'saved'] as const).map((value) => (
                    <TabsContent key={value} value={value} className="flex min-h-0 flex-col lg:flex-1">
                      <div
                        ref={listRef}
                        className={cn(
                          'grid min-h-0 flex-1 content-start gap-3 p-3 sm:grid-cols-2 lg:grid-cols-1',
                          workspaceConstrained && 'lg:overflow-y-auto',
                        )}
                        aria-label={value === 'saved' ? 'Saved opportunities' : 'Latest opportunities'}
                        onScroll={(event) =>
                          sessionStorage.setItem(SCROLL_STORAGE_KEY, String(event.currentTarget.scrollTop))
                        }
                      >
                        {filtered.length === 0 ? (
                          <div className="p-4 sm:col-span-2 lg:col-span-1">
                            <RecordState
                              tone="empty"
                              title={emptyState().title}
                              description={emptyState().body}
                              action={
                                search.trim() || activeFilterCount > 0 ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSearch('');
                                      resetFilters();
                                    }}
                                    className="gap-1"
                                  >
                                    <X aria-hidden="true" className="size-3.5" />
                                    Clear search and filters
                                  </Button>
                                ) : undefined
                              }
                            />
                          </div>
                        ) : (
                          <>
                            {visibleRanked.map((result) => (
                              <OpportunityCard
                                key={result.job.id}
                                job={result.job}
                                fit={fitByJob.get(result.job.id) ?? null}
                                saved={savedIds.has(result.job.id)}
                                saving={savingIds.has(result.job.id)}
                                bookmarkDisabled={Boolean(partialWarning)}
                                tracking={trackingIds.has(result.job.id)}
                                application={applicationsByJob.get(result.job.id) ?? null}
                                selected={selected?.job.id === result.job.id}
                                onOpen={() => handleSelect(result.job.id)}
                                onRowKeyDown={handleRowKeyDown}
                                onToggleSave={() => toggleSave(result.job.id)}
                                onTrack={() => trackApplication(result.job)}
                              />
                            ))}
                            {remainingCount > 0 && (
                              <div className="p-1 sm:col-span-2 lg:col-span-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="w-full"
                                  onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE_ROWS)}
                                >
                                  Load {Math.min(INITIAL_VISIBLE_ROWS, remainingCount)} more opportunities ({remainingCount} remaining)
                                </Button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </section>

              {/* Desktop contextual panel */}
              <section className="hidden min-h-0 overflow-hidden lg:block" aria-label="Selected opportunity">
                <div className="h-full overflow-y-auto">
                  {selected ? (
                    <OpportunityDetail
                      job={selected.job}
                      fit={fitByJob.get(selected.job.id) ?? null}
                      saved={savedIds.has(selected.job.id)}
                      application={applicationsByJob.get(selected.job.id) ?? null}
                      savingBookmark={savingIds.has(selected.job.id)}
                      tracking={trackingIds.has(selected.job.id)}
                      onToggleSave={() => toggleSave(selected.job.id)}
                      onTrack={() => trackApplication(selected.job)}
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
                      <Search aria-hidden="true" className="mb-4 size-12 opacity-50" />
                      <p className="text-sm">
                        No selection — open an opportunity card to see why it fits and what to do
                        next.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Mobile / touch detail sheet */}
            <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
              <SheetContent
                side="bottom"
                className="h-[92dvh] overflow-y-auto rounded-t-xl p-0 lg:hidden"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>{selected?.job.title ?? 'Opportunity details'}</SheetTitle>
                  <SheetDescription>
                    Full opportunity details, fit, provenance, and application actions
                  </SheetDescription>
                </SheetHeader>
                {selected && (
                  <OpportunityDetail
                    job={selected.job}
                    fit={fitByJob.get(selected.job.id) ?? null}
                    saved={savedIds.has(selected.job.id)}
                    application={applicationsByJob.get(selected.job.id) ?? null}
                    savingBookmark={savingIds.has(selected.job.id)}
                    tracking={trackingIds.has(selected.job.id)}
                    onToggleSave={() => toggleSave(selected.job.id)}
                    onTrack={() => trackApplication(selected.job)}
                    onBack={() => setMobileDetailOpen(false)}
                  />
                )}
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>

      {/* Filters — shallow set behind one disclosure */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-5 py-4">
            <SheetTitle className="text-lg font-semibold">Filters</SheetTitle>
            <SheetDescription>
              Narrow the feed with a few meaningful choices. Active filters appear as chips above
              the results and can be removed there.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-5 py-5">
            <div className="space-y-1.5">
              <label htmlFor="filter-location" className="type-label">
                Location
              </label>
              <div className="relative">
                <MapPin
                  aria-hidden="true"
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="filter-location"
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  placeholder="Anywhere"
                  autoComplete="off"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="type-label" htmlFor="filter-type">
                Opportunity type
              </label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="filter-type" aria-label="Filter by opportunity type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type === 'all' ? 'All types' : type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="type-label" htmlFor="filter-level">
                Experience level
              </label>
              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger id="filter-level" aria-label="Filter by experience level" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level} value={level} className="capitalize">
                      {level === 'all' ? 'Any experience' : level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="type-label" htmlFor="filter-deadline">
                Deadline
              </label>
              <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
                <SelectTrigger id="filter-deadline" aria-label="Filter by deadline" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEADLINE_FILTERS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border px-5 py-4">
            <Button variant="ghost" size="sm" onClick={resetFilters} disabled={activeFilterCount === 0}>
              Reset
            </Button>
            <Button size="sm" onClick={() => setFiltersOpen(false)}>
              Show {filtered.length} {filtered.length === 1 ? 'opportunity' : 'opportunities'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageLayout>
  );
};

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex animate-fade-in items-center gap-1 rounded-control border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground motion-reduce:animate-none">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="flex size-4 items-center justify-center rounded-control text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
      >
        <X aria-hidden="true" className="size-3" />
      </button>
    </span>
  );
}

export default Opportunities;
