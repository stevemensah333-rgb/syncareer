import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle, Briefcase, Calendar, ChevronRight, Clock, Lock,
  MapPin, RefreshCw, Search, Star, Trash2, User, Video,
} from 'lucide-react';
import { RateCounsellorDialog } from '@/components/counsellor/RateCounsellorDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOutcomeTracking } from '@/hooks/useOutcomeTracking';
import AnimatedSection from '@/components/landing/AnimatedSection';
import { STATUS_COLORS, STATUS_OUTCOME_MAP, formatShortDate, getDaysAgo } from '@/features/application-tracker/constants';
import {
  stageForStatus,
  statusLabel,
  statusesForStage,
  STAGE_LABELS,
  STAGE_ORDER,
  type ApplicationStage,
} from '@/features/application-tracker/workflow';
import {
  classifyTrackerError,
  removeApplicationRecord,
  saveApplicationNotes,
  updateApplicationStatus,
} from '@/features/application-tracker/tracking';
import { getDeadlineState, getOrganisation } from '@/features/opportunities/opportunity';
import { DeadlinePill } from '@/components/opportunities/DeadlinePill';
import {
  ApplicationDetailSheet,
  type CvSummary,
  type TrackedApplication,
} from '@/components/applications/ApplicationDetailSheet';
import { ApplicationRowPreview } from '@/components/applications/ApplicationRowPreview';

type StageFilter = 'all' | ApplicationStage | 'other';

type LoadStatus = 'loading' | 'error' | 'ready';

interface CounsellorBooking {
  id: string;
  counsellor_id: string;
  status: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  created_at: string;
  counsellor?: { full_name: string | null; meeting_link: string | null };
}

const ApplicationTracker = () => {
  const { updateOutcome, triggerIntelligenceRefresh } = useOutcomeTracking();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [applications, setApplications] = useState<TrackedApplication[]>([]);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadError, setLoadError] = useState<{ category: string; userMessage: string } | null>(null);
  const [primaryCv, setPrimaryCv] = useState<CvSummary | null>(null);
  const [cvLoadFailed, setCvLoadFailed] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [counsellorBookings, setCounsellorBookings] = useState<CounsellorBooking[]>([]);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<CounsellorBooking | null>(null);

  const fetchCounsellorBookings = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('counsellor_bookings')
        .select('id, counsellor_id, status, scheduled_date, scheduled_time, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        // Fetch counsellor details (name + meeting link) for each booking
        const enriched = await Promise.all(
          data.map(async (b) => {
            const { data: cd } = (await supabase
              .from('counsellor_booking_view' as any)
              .select('full_name, meeting_link')
              .eq('id', b.counsellor_id)
              .single() as any) as { data: { full_name: string; meeting_link: string | null } | null };
            return { ...b, counsellor: cd };
          }),
        );
        setCounsellorBookings(enriched as any);
      }
    } catch (err) {
      console.error('Error fetching counsellor bookings:', err);
    }
  }, []);

  const fetchApplications = useCallback(async () => {
    setLoadStatus('loading');
    setLoadError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoadStatus('error');
        setLoadError({ category: 'auth-expired', userMessage: 'Please sign in again to view your applications.' });
        return;
      }

      const { data, error } = await supabase
        .from('job_applications')
        .select(
          `
          id, job_id, status, notes, resume_url, created_at, updated_at,
          job:job_postings(title, location, employment_type, salary_min, salary_max, company_name, department, source, source_url, application_deadline, skills, experience_level, updated_at)
        `,
        )
        .eq('applicant_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setApplications((data ?? []) as unknown as TrackedApplication[]);
      setLoadStatus('ready');
    } catch (err) {
      const classified = classifyTrackerError(err);
      setLoadError({ category: classified.category, userMessage: classified.userMessage });
      setLoadStatus('error');
    }
  }, []);

  // Targeted CV: the user's primary CV (missing/error is non-blocking).
  const fetchPrimaryCv = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from('resumes')
        .select('id, title, updated_at')
        .eq('user_id', session.user.id)
        .eq('is_primary', true)
        .maybeSingle();
      if (error) throw error;
      setPrimaryCv(data);
      setCvLoadFailed(false);
    } catch {
      setCvLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
    fetchPrimaryCv();
    fetchCounsellorBookings();
  }, [fetchApplications, fetchPrimaryCv, fetchCounsellorBookings]);

  const selectedApplication = useMemo(
    () => applications.find((a) => a.id === selectedId) ?? null,
    [applications, selectedId],
  );

  const openDetail = (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    if (searchParams.get('application')) setSearchParams({}, { replace: true });
  };

  // Deep link: /applications?application=<id> opens that record's detail.
  useEffect(() => {
    const target = searchParams.get('application');
    if (!target || loadStatus !== 'ready') return;
    if (applications.some((a) => a.id === target)) {
      openDetail(target);
    } else {
      toast.error('That application could not be found in your tracker.');
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadStatus, searchParams]);

  const handleRecordStatus = async (status: string) => {
    const app = selectedApplication;
    if (!app) return;
    setSavingStatus(true);
    try {
      const result = await updateApplicationStatus(supabase, app.id, status);
      if (!result.ok) {
        toast.error(result.userMessage);
        return;
      }
      setApplications((apps) => apps.map((a) => (a.id === app.id ? { ...a, status } : a)));
      toast.success(`Status updated to “${statusLabel(status)}”`);

      // Map application status to outcome for the feedback loop
      const jobTitle = app.job?.title;
      const outcome = STATUS_OUTCOME_MAP[status];
      if (jobTitle && outcome) {
        updateOutcome({
          itemTitle: jobTitle,
          outcome: outcome as 'success' | 'rejected' | 'withdrawn',
          details: { status, updated_at: new Date().toISOString() },
        });
        triggerIntelligenceRefresh();
      }
    } catch (err) {
      toast.error(classifyTrackerError(err).userMessage);
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveNotes = async (notes: string) => {
    const app = selectedApplication;
    if (!app) return;
    setSavingNotes(true);
    try {
      const result = await saveApplicationNotes(supabase, app.id, notes);
      if (!result.ok) {
        toast.error(result.userMessage);
        return;
      }
      setApplications((apps) =>
        apps.map((a) => (a.id === app.id ? { ...a, notes: notes.trim() ? notes.trim() : null } : a)),
      );
      toast.success('Notes saved');
    } catch (err) {
      toast.error(classifyTrackerError(err).userMessage);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDelete = async () => {
    const app = selectedApplication;
    if (!app) return;
    setDeleting(true);
    try {
      const result = await removeApplicationRecord(supabase, app.id);
      if (!result.ok) {
        toast.error(result.userMessage);
        return;
      }
      setApplications((apps) => apps.filter((a) => a.id !== app.id));
      setDetailOpen(false);
      toast.success('Application removed');
    } catch (err) {
      toast.error(classifyTrackerError(err).userMessage);
    } finally {
      setDeleting(false);
    }
  };

  // ── Filtering / grouping ────────────────────────────────────────

  const stageCounts = useMemo(() => {
    const counts: Record<StageFilter, number> = {
      all: applications.length,
      applied: 0,
      review: 0,
      interview: 0,
      offer: 0,
      outcome: 0,
      other: 0,
    };
    for (const app of applications) {
      const stage = stageForStatus(app.status);
      if (stage) counts[stage] += 1;
      else counts.other += 1;
    }
    return counts;
  }, [applications]);

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        app.job?.title?.toLowerCase().includes(term) ||
        getOrganisation(app.job ?? {})?.toLowerCase().includes(term) ||
        app.notes?.toLowerCase().includes(term);
      if (!matchesSearch) return false;
      if (stageFilter === 'all') return true;
      if (stageFilter === 'other') return stageForStatus(app.status) === null;
      return statusesForStage(stageFilter).includes(app.status);
    });
  }, [applications, searchTerm, stageFilter]);

  const chipDefs: { key: StageFilter; label: string }[] = useMemo(() => {
    const defs: { key: StageFilter; label: string }[] = [
      { key: 'all', label: 'All' },
      ...STAGE_ORDER.map((s) => ({ key: s as StageFilter, label: STAGE_LABELS[s] })),
    ];
    if (stageCounts.other > 0) defs.push({ key: 'other', label: 'Other' });
    return defs;
  }, [stageCounts.other]);

  const hasAnyApplications = applications.length > 0;

  return (
    <PageLayout
      title="Application Tracker"
      breadcrumbs={[{ label: 'Home', to: '/dashboard' }, { label: 'Applications' }]}
    >
      <div className="space-y-6">
        {/* Stage filter chips */}
        <AnimatedSection y={20}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter applications by stage">
            {chipDefs.map((chip) => (
              <button
                key={chip.key}
                onClick={() => setStageFilter(chip.key)}
                aria-pressed={stageFilter === chip.key}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  stageFilter === chip.key
                    ? 'border-primary bg-primary/10 text-primary font-medium'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                {chip.label}
                <span className="text-xs tabular-nums">{stageCounts[chip.key]}</span>
              </button>
            ))}
          </div>
        </AnimatedSection>

        {/* Search */}
        <AnimatedSection delay={0.08} y={20}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by role, organisation, or notes..."
              className="pl-10"
            />
          </div>
        </AnimatedSection>

        {/* Applications List */}
        <AnimatedSection delay={0.12} y={20}>
          <Card>
            <CardHeader>
              <CardTitle>Your Applications</CardTitle>
              <CardDescription>
                Select an application to see its journey, next step, notes, and outcome.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadStatus === 'loading' ? (
                <div className="space-y-3" aria-busy="true" aria-label="Loading applications">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="p-4 border rounded-lg space-y-3">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  ))}
                </div>
              ) : loadStatus === 'error' ? (
                <div className="text-center py-10 max-w-md mx-auto" role="alert">
                  {loadError?.category === 'permission' || loadError?.category === 'auth-expired' ? (
                    <Lock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
                  ) : (
                    <AlertTriangle className="h-10 w-10 mx-auto mb-3 text-destructive/70" />
                  )}
                  <h3 className="text-lg font-medium mb-1">
                    {loadError?.category === 'permission'
                      ? 'You do not have access to applications'
                      : loadError?.category === 'auth-expired'
                        ? 'Your session has expired'
                        : 'Applications could not be loaded'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {loadError?.userMessage ?? 'Something went wrong while loading your applications.'}
                  </p>
                  {loadError?.category !== 'permission' && (
                    <Button onClick={fetchApplications} variant="outline" className="gap-1.5">
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </Button>
                  )}
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="text-center py-12">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">
                    {hasAnyApplications ? 'No applications match' : 'No applications yet'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {hasAnyApplications
                      ? 'No applications match your search or stage filter.'
                      : 'Find a role in Opportunities, apply, and it will appear here for tracking.'}
                  </p>
                  {!hasAnyApplications && (
                    <Button onClick={() => navigate('/opportunities')}>Browse Opportunities</Button>
                  )}
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border bg-card divide-y">
                  {filteredApplications.map((app) => {
                    const organisation = app.job ? getOrganisation(app.job) : null;
                    const deadline = getDeadlineState(app.job?.application_deadline);
                    return (
                      <ApplicationRowPreview
                        key={app.id}
                        application={app}
                        hasCv={primaryCv ? true : cvLoadFailed ? null : false}
                      >
                        <button
                          onClick={() => openDetail(app.id)}
                          className="w-full p-3.5 text-left transition-colors duration-150 hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-4"
                          aria-label={`${app.job?.title || 'Tracked application'}. Status ${statusLabel(app.status)}. Open details.`}
                        >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <h3 className="font-semibold text-base leading-tight truncate">
                                {app.job?.title || 'Tracked application'}
                              </h3>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  STATUS_COLORS[app.status] ?? 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {statusLabel(app.status)}
                              </span>
                              {app.job === null && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] border-warning/50 text-warning"
                                >
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Posting unavailable
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                              {organisation && <span>{organisation}</span>}
                              {app.job?.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {app.job.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Applied {formatShortDate(app.created_at)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {getDaysAgo(app.updated_at)}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-2 flex-wrap">
                              <DeadlinePill state={deadline} />
                            </div>
                            {app.notes && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{app.notes}</p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                        </div>
                      </button>
                      </ApplicationRowPreview>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>

        {/* Counsellor Sessions */}
        <AnimatedSection delay={0.16} y={20}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Counsellor Sessions
              </CardTitle>
              <CardDescription>Your booked career counselling sessions</CardDescription>
            </CardHeader>
            <CardContent>
              {counsellorBookings.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No counsellor sessions booked yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {counsellorBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 border rounded-lg flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1 min-w-0">
                        <p className="font-medium">{b.counsellor?.full_name || 'Counsellor'}</p>
                        {b.scheduled_date && b.scheduled_time && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(b.scheduled_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at {b.scheduled_time.toString().slice(0, 5)}
                          </p>
                        )}
                        <Badge
                          variant={
                            b.status === 'confirmed'
                              ? 'default'
                              : b.status === 'cancelled'
                                ? 'destructive'
                                : 'outline'
                          }
                          className="text-xs"
                        >
                          {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.status === 'confirmed' && b.counsellor?.meeting_link && (
                          <Button size="sm" asChild>
                            <a href={b.counsellor.meeting_link} target="_blank" rel="noopener noreferrer">
                              <Video className="h-4 w-4 mr-1" />
                              Join Session
                            </a>
                          </Button>
                        )}
                        {b.status === 'confirmed' && !b.counsellor?.meeting_link && (
                          <span className="text-xs text-muted-foreground">Link pending</span>
                        )}
                        {(b.status === 'confirmed' || b.status === 'cancelled') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBookingForRating(b);
                              setRatingDialogOpen(true);
                            }}
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Rate
                          </Button>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive ml-2"
                        onClick={async () => {
                          try {
                            const { error } = await supabase
                              .from('counsellor_bookings')
                              .delete()
                              .eq('id', b.id);
                            if (error) throw error;
                            setCounsellorBookings((prev) => prev.filter((x) => x.id !== b.id));
                            toast.success('Session removed');
                          } catch (err) {
                            console.error(err);
                            toast.error('Failed to remove session');
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedSection>
      </div>

      <ApplicationDetailSheet
        application={selectedApplication}
        open={detailOpen}
        onOpenChange={(open) => (open ? setDetailOpen(true) : closeDetail())}
        primaryCv={primaryCv}
        cvLoadFailed={cvLoadFailed}
        savingStatus={savingStatus}
        savingNotes={savingNotes}
        deleting={deleting}
        onRecordStatus={handleRecordStatus}
        onSaveNotes={handleSaveNotes}
        onDelete={handleDelete}
      />

      {selectedBookingForRating && (
        <RateCounsellorDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          counsellorId={selectedBookingForRating.counsellor_id}
          counsellorName={selectedBookingForRating.counsellor?.full_name || 'Counsellor'}
          onRatingSubmitted={() => setSelectedBookingForRating(null)}
        />
      )}
    </PageLayout>
  );
};

export default ApplicationTracker;
