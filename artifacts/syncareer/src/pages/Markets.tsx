import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Briefcase, MapPin, Search, Bookmark, BookmarkCheck, X, BarChart3,
  AlertCircle, RefreshCw, Lock, AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CompanyLogo } from '@/components/opportunities/CompanyLogo';
import { DeadlinePill } from '@/components/opportunities/DeadlinePill';
import { OpportunityPreview } from '@/components/opportunities/OpportunityPreview';
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import {
  getDeadlineState,
  getIngestionFreshness,
  getOrganisation,
  getProvenanceFacts,
  getWorkModeLabel,
  type OpportunityJob,
} from '@/features/opportunities/opportunity';
import { classifyTrackerError, startTrackingApplication } from '@/features/application-tracker/tracking';
import { STATUS_COLORS } from '@/features/application-tracker/constants';
import { statusLabel, type ApplicationRef } from '@/features/application-tracker/workflow';

const EMPLOYMENT_TYPES = ['all', 'full-time', 'part-time', 'internship', 'contract', 'remote'];
const EXPERIENCE_LEVELS = ['all', 'entry', 'mid', 'senior'];
const DEADLINE_FILTERS = [
  { value: 'all', label: 'Any deadline' },
  { value: '7', label: 'Closing in 7 days' },
  { value: '30', label: 'Closing in 30 days' },
];

type LoadStatus = 'loading' | 'error' | 'ready';
const SCROLL_STORAGE_KEY = 'syncareer.opportunities.scrollTop';

const Opportunities = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [jobs, setJobs] = useState<OpportunityJob[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [applicationsByJob, setApplicationsByJob] = useState<Map<string, ApplicationRef>>(new Map());
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<{ category: string; userMessage: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('job'));
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [trackingIds, setTrackingIds] = useState<Set<string>>(new Set());
  const [partialWarning, setPartialWarning] = useState<string | null>(null);
  const pendingSaveIds = useRef(new Set<string>());
  const saveRequestVersions = useRef(new Map<string, number>());
  const pendingTrackingIds = useRef(new Set<string>());
  const listRef = useRef<HTMLDivElement>(null);
  const openMobileOnSelection = useRef(Boolean(searchParams.get('job')));

  // Filters
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [locationFilter, setLocationFilter] = useState(() => searchParams.get('location') ?? '');
  const [typeFilter, setTypeFilter] = useState(() => searchParams.get('type') ?? 'all');
  const [experienceFilter, setExperienceFilter] = useState(() => searchParams.get('level') ?? 'all');
  const [deadlineFilter, setDeadlineFilter] = useState(() => searchParams.get('deadline') ?? 'all');
  const [tab, setTab] = useState<'all' | 'saved'>(() => searchParams.get('view') === 'saved' ? 'saved' : 'all');

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

      const [jobsRes, savedRes, appsRes] = await Promise.all([
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
      ]);

      if (jobsRes.error) throw jobsRes.error;

      setSavedIds(new Set(savedRes.error ? [] : (savedRes.data ?? []).map((s) => s.job_id)));
      setApplicationsByJob(
        new Map((appsRes.error ? [] : (appsRes.data ?? [])).map((a) => [a.job_id, { id: a.id, status: a.status }])),
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

  // Filtered list
  const filtered = useMemo(() => {
    return jobs.filter((j) => {
      if (tab === 'saved' && !savedIds.has(j.id)) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${j.title} ${j.company_name || ''} ${j.department || ''} ${(j.skills || []).join(' ')}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (locationFilter) {
        if (!j.location?.toLowerCase().includes(locationFilter.toLowerCase())) return false;
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
  }, [jobs, tab, savedIds, search, locationFilter, typeFilter, experienceFilter, deadlineFilter]);

  const selected = filtered.find((j) => j.id === selectedId) || filtered[0];

  useEffect(() => {
    if (filtered.length && !filtered.find((j) => j.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  // Keep inspection context in the URL so protected-route auth redirects and
  // browser history retain filters and selection.
  useEffect(() => {
    const next = new URLSearchParams();
    if (selectedId) next.set('job', selectedId);
    if (search) next.set('q', search);
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

  const toggleSave = async (jobId: string) => {
    if (pendingSaveIds.current.has(jobId) || partialWarning) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to save opportunities');
      return;
    }
    const wasSaved = savedIds.has(jobId);
    const version = (saveRequestVersions.current.get(jobId) ?? 0) + 1;
    saveRequestVersions.current.set(jobId, version);
    pendingSaveIds.current.add(jobId);
    setSavingIds((current) => new Set(current).add(jobId));
    setSavedIds((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(jobId); else next.add(jobId);
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
        toast.success('Saved — find it under the Saved tab');
      }
    } catch (err) {
      if (saveRequestVersions.current.get(jobId) === version) {
        setSavedIds((current) => {
          const next = new Set(current);
          if (wasSaved) next.add(jobId); else next.delete(jobId);
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
  };

  /**
   * Turn an opportunity into a tracked application. This is the single
   * creation path for tracker rows — external postings are marked as applied
   * after the user applies on the source site; native postings submit
   * directly.
   */
  const trackApplication = async (job: OpportunityJob) => {
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
  };

  const activeFilterCount =
    (search ? 1 : 0) +
    (locationFilter ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) +
    (experienceFilter !== 'all' ? 1 : 0) +
    (deadlineFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setSearch('');
    setLocationFilter('');
    setTypeFilter('all');
    setExperienceFilter('all');
    setDeadlineFilter('all');
  };

  const isLoading = loadStatus === 'loading';

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, jobId: string) => {
    const index = filtered.findIndex((job) => job.id === jobId);
    if (index < 0) return;
    let target = index;
    if (event.key === 'ArrowDown') target = Math.min(filtered.length - 1, index + 1);
    else if (event.key === 'ArrowUp') target = Math.max(0, index - 1);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = filtered.length - 1;
    else return;
    event.preventDefault();
    const next = filtered[target];
    if (!next) return;
    setSelectedId(next.id);
    requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLButtonElement>(`[data-opportunity-id="${next.id}"]`)?.focus();
    });
  };

  const renderJobRow = (job: OpportunityJob) => {
    const deadline = getDeadlineState(job.application_deadline);
    const organisation = getOrganisation(job);
    const workMode = getWorkModeLabel(job);
    const provenance = getProvenanceFacts(job);
    const freshness = getIngestionFreshness(job.updated_at);
    const application = applicationsByJob.get(job.id) ?? null;
    const saved = savedIds.has(job.id);
    const isSelected = selected?.id === job.id;
    return (
      <div key={job.id} className="relative">
      <OpportunityPreview job={job} saved={saved} application={application}>
        <button
          onClick={() => {
            openMobileOnSelection.current = true;
            setSelectedId(job.id);
            if (window.innerWidth < 1024) setMobileDetailOpen(true);
          }}
          onKeyDown={(event) => handleRowKeyDown(event, job.id)}
          data-opportunity-id={job.id}
          aria-label={`${job.title}${organisation ? ` at ${organisation}` : ''}. Open details.`}
          aria-current={isSelected ? 'true' : undefined}
          className={`w-full text-left p-4 pr-12 border-l-4 transition-colors ${
            isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
          }`}
        >
          <div className="flex items-start gap-3">
            <CompanyLogo job={job} size={40} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-sm leading-tight truncate">{job.title}</h3>
                {saved ? <BookmarkCheck className="h-4 w-4 shrink-0 text-primary" aria-label="Saved" /> : null}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {organisation ?? 'Organisation not specified'}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {job.location}
                </span>
                {workMode && <span>{workMode}</span>}
                <span className="capitalize">{job.employment_type}</span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {deadline.kind === 'none' ? <span className="text-xs text-muted-foreground">Deadline not provided</span> : <DeadlinePill state={deadline} />}
                {job.is_external && (
                  <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                    via {provenance.sourceLabel}
                  </Badge>
                )}
                <span className={`text-[10px] ${freshness.kind === 'stale' ? 'text-warning' : 'text-muted-foreground'}`}>{freshness.label}</span>
                {application && (
                  <span
                    className={`text-[10px] px-1.5 py-0 rounded-full font-medium ${
                      STATUS_COLORS[application.status] ?? 'bg-muted text-muted-foreground'
                    }`}
                  >
                    Tracked · {statusLabel(application.status)}
                  </span>
                )}
                {saved && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <BookmarkCheck className="h-3 w-3 text-primary" />
                    Saved
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      </OpportunityPreview>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-9 w-9"
          onClick={() => toggleSave(job.id)}
          disabled={savingIds.has(job.id) || Boolean(partialWarning)}
          aria-label={saved ? `Unsave ${job.title}` : `Save ${job.title}`}
          aria-pressed={saved}
        >
          {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
        </Button>
      </div>
    );
  };

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
    return { title: 'No jobs match your filters', body: 'Try a different search or reset the filters.' };
  };

  return (
    <PageLayout title="Latest opportunities" description="External listings ordered by when Syncareer ingested them. Confirm details on the original source.">
      {/* Search + filter bar */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search titles, organisations, or skills"
              aria-label="Search opportunities"
              className="pl-9"
            />
          </div>
          <div className="relative w-48 hidden sm:block">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Location"
              aria-label="Filter by location"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/analysis')}
            className="h-10 shrink-0 gap-1.5 text-muted-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            Market Intelligence
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger aria-label="Filter by opportunity type" className="w-auto min-w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">
                  {t === 'all' ? 'All types' : t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={experienceFilter} onValueChange={setExperienceFilter}>
            <SelectTrigger aria-label="Filter by experience level" className="w-auto min-w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map((l) => (
                <SelectItem key={l} value={l} className="capitalize">
                  {l === 'all' ? 'Any experience' : l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
            <SelectTrigger aria-label="Filter by deadline" className="w-auto min-w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEADLINE_FILTERS.map((d) => (
                <SelectItem key={d.value} value={d.value}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
              <X className="h-3 w-3" />
              Reset ({activeFilterCount})
            </Button>
          )}
          <div className="ml-auto text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'}
          </div>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'saved')}>
          <TabsList>
            <TabsTrigger value="all">Latest</TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />
              Saved ({savedIds.size})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {partialWarning ? (
        <div role="status" className="mb-3 flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2 text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />{partialWarning}</span>
          <Button variant="outline" size="sm" onClick={load}>Refresh state</Button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid lg:grid-cols-[minmax(340px,420px)_1fr] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
          <Card className="p-4 space-y-4" aria-busy="true" aria-label="Loading opportunities">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </Card>
          <Card className="hidden lg:block p-6 space-y-4">
            <Skeleton className="h-7 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </Card>
        </div>
      ) : loadStatus === 'error' ? (
        <Card className="p-10 text-center max-w-xl mx-auto" role="alert">
          {loadError?.category === 'permission' || loadError?.category === 'auth-expired' ? (
            <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
          ) : (
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-destructive/70" />
          )}
          <h2 className="font-semibold text-lg mb-1">
            {loadError?.category === 'permission'
              ? 'You do not have access to opportunities'
              : loadError?.category === 'auth-expired'
                ? 'Your session has expired'
                : 'Opportunities could not be loaded'}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {loadError?.userMessage ?? 'Something went wrong while loading opportunities.'}
          </p>
          {loadError?.category !== 'permission' && (
            <Button onClick={load} variant="outline" className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}
        </Card>
      ) : (
        <>
          {/* Two-pane layout */}
          <div className="grid lg:grid-cols-[minmax(340px,420px)_1fr] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
            <Card className="overflow-hidden flex flex-col">
              <div
                ref={listRef}
                className="flex-1 overflow-y-auto divide-y"
                aria-label="Latest opportunities"
                onScroll={(event) => sessionStorage.setItem(SCROLL_STORAGE_KEY, String(event.currentTarget.scrollTop))}
              >
                {filtered.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium text-sm text-foreground">{emptyState().title}</p>
                    <p className="text-sm mt-1">{emptyState().body}</p>
                    {activeFilterCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={resetFilters} className="mt-3 gap-1">
                        <X className="h-3 w-3" />
                        Reset filters
                      </Button>
                    )}
                  </div>
                ) : (
                  filtered.map(renderJobRow)
                )}
              </div>
            </Card>
            <Card className="hidden lg:block overflow-hidden">
              <div className="h-full overflow-y-auto">
                {selected ? (
                  <OpportunityDetail
                    job={selected}
                    saved={savedIds.has(selected.id)}
                    application={applicationsByJob.get(selected.id) ?? null}
                    savingBookmark={savingIds.has(selected.id)}
                    tracking={trackingIds.has(selected.id)}
                    onToggleSave={() => toggleSave(selected.id)}
                    onTrack={() => trackApplication(selected)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                    <Briefcase className="h-12 w-12 mb-4 opacity-50" />
                    <p>Select an opportunity to see the details</p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Mobile / touch detail sheet (bottom drawer) */}
          <Sheet open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
            <SheetContent
              side="bottom"
              className="h-[92dvh] overflow-y-auto rounded-t-xl p-0 lg:hidden"
            >
              <SheetHeader className="sr-only">
                <SheetTitle>{selected?.title ?? 'Opportunity details'}</SheetTitle>
                <SheetDescription>
                  Full opportunity details, provenance, and application actions
                </SheetDescription>
              </SheetHeader>
              {selected && (
                <OpportunityDetail
                  job={selected}
                  saved={savedIds.has(selected.id)}
                  application={applicationsByJob.get(selected.id) ?? null}
                  savingBookmark={savingIds.has(selected.id)}
                  tracking={trackingIds.has(selected.id)}
                  onToggleSave={() => toggleSave(selected.id)}
                  onTrack={() => trackApplication(selected)}
                  onBack={() => setMobileDetailOpen(false)}
                />
              )}
            </SheetContent>
          </Sheet>
        </>
      )}
    </PageLayout>
  );
};

export default Opportunities;
