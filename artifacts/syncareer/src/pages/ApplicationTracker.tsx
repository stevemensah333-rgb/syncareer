import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronRight,
  FileText,
  Lock,
  MapPin,
  Mic,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { STATUS_BADGE_VARIANT } from '@/features/application-tracker/constants';
import { supabase } from '@/integrations/supabase/client';
import { classifyTrackerError } from '@/features/application-tracker/tracking';
import {
  STAGE_LABELS,
  STAGE_ORDER,
  stageForStatus,
  statusLabel,
  statusesForStage,
  type ApplicationStage,
} from '@/features/application-tracker/workflow';
import { applicationFacts, type WorkspaceApplication } from '@/features/application-tracker/workspace';
import { getDeadlineState, getOrganisation } from '@/features/opportunities/opportunity';

type StageFilter = 'all' | ApplicationStage | 'other';
type LoadState = 'loading' | 'ready' | 'error';

/**
 * Prove Hub: Dossier index & application manager.
 * Each application has its own dedicated workspace with an evidence dossier,
 * tailored CV, interview practice, and next actions.
 */
export default function ApplicationTracker() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [applications, setApplications] = useState<WorkspaceApplication[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<ReturnType<typeof classifyTrackerError> | null>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  const search = params.get('q') ?? '';
  const rawStage = params.get('stage') ?? 'all';
  const stage = (rawStage === 'all' || rawStage === 'other' || STAGE_ORDER.includes(rawStage as ApplicationStage) ? rawStage : 'all') as StageFilter;

  const updateParams = useCallback((values: Record<string, string | null>, replace = true) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key);
      return next;
    }, { replace });
  }, [setParams]);

  const load = useCallback(async () => {
    setLoadState('loading');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoadError(classifyTrackerError({ code: 'NO_SESSION' }));
      setLoadState('error');
      return;
    }
    try {
      const appsResult = await supabase
        .from('job_applications')
        .select(`*, job:job_postings(title, location, employment_type, company_name, department, source, source_url, application_deadline, skills, experience_level, updated_at)`)
        .eq('applicant_id', session.user.id)
        .order('created_at', { ascending: false });
      if (appsResult.error) throw appsResult.error;
      setApplications((appsResult.data ?? []) as unknown as WorkspaceApplication[]);
      setLoadState('ready');
    } catch (error) {
      setLoadError(classifyTrackerError(error));
      setLoadState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Legacy deep link: /applications?application=:id → canonical dossier route.
  const legacyId = params.get('application');
  useEffect(() => {
    if (!legacyId) return;
    const forwarded = new URLSearchParams();
    const query = params.get('q');
    const stageParam = params.get('stage');
    if (query) forwarded.set('q', query);
    if (stageParam) forwarded.set('stage', stageParam);
    const suffix = forwarded.toString();
    navigate(`/applications/${encodeURIComponent(legacyId)}${suffix ? `?${suffix}` : ''}`, { replace: true });
  }, [legacyId, params, navigate]);

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
      const st = stageForStatus(app.status);
      if (st && counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts.other++;
      }
    }
    return counts;
  }, [applications]);

  const filtered = useMemo(() => applications.filter((application) => {
    const facts = applicationFacts(application);
    const term = search.trim().toLowerCase();
    if (term && !`${facts.title ?? ''} ${getOrganisation(facts) ?? ''} ${application.notes ?? ''}`.toLowerCase().includes(term)) return false;
    if (stage === 'all') return true;
    if (stage === 'other') return stageForStatus(application.status) === null;
    return statusesForStage(stage).includes(application.status);
  }), [applications, search, stage]);

  const openDossier = (applicationId: string) => {
    navigate(`/applications/${encodeURIComponent(applicationId)}`);
  };

  const handleKey = (event: React.KeyboardEvent, index: number) => {
    let target = index;
    if (event.key === 'ArrowDown') target = Math.min(index + 1, filtered.length - 1);
    else if (event.key === 'ArrowUp') target = Math.max(index - 1, 0);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = filtered.length - 1;
    else return;
    event.preventDefault();
    const application = filtered[target];
    if (!application) return;
    requestAnimationFrame(() => rowRefs.current.get(application.id)?.focus());
  };

  return (
    <PageLayout
      title="Applications"
      description="Keep each role, CV, preparation and next action in one workspace."
      headerVariant="document"
    >
      <div className="space-y-6">
        {/* Pipeline Summary Metrics (when records exist) */}
        {applications.length > 0 && loadState === 'ready' && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-surface border border-border bg-card p-3 sm:p-4">
              <p className="type-meta text-muted-foreground">Total Active</p>
              <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{applications.length}</p>
            </div>
            <div className="rounded-surface border border-border bg-card p-3 sm:p-4">
              <p className="type-meta text-muted-foreground">In Review</p>
              <p className="mt-1 text-xl font-bold text-primary sm:text-2xl">{stageCounts.review}</p>
            </div>
            <div className="rounded-surface border border-border bg-card p-3 sm:p-4">
              <p className="type-meta text-muted-foreground">Interviewing</p>
              <p className="mt-1 text-xl font-bold text-primary sm:text-2xl">{stageCounts.interview}</p>
            </div>
            <div className="rounded-surface border border-border bg-card p-3 sm:p-4">
              <p className="type-meta text-muted-foreground">Offers</p>
              <p className="mt-1 text-xl font-bold text-success sm:text-2xl">{stageCounts.offer}</p>
            </div>
          </div>
        )}

        {/* Main Applications Workspace Surface */}
        <div className="rounded-surface border border-border bg-card shadow-sm overflow-hidden">
          {/* Search and Filters Bar */}
          <div className="border-b border-border bg-card/60 p-3 sm:p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search applications"
                className="pl-9 pr-8 rounded-input text-sm"
                value={search}
                onChange={(e) => updateParams({ q: e.target.value || null })}
                placeholder="Search by role, company or notes…"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => updateParams({ q: null })}
                  className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0" role="toolbar" aria-label="Filter by stage">
              {(['all', ...STAGE_ORDER] as StageFilter[]).map((value) => {
                const isSelected = stage === value;
                const count = stageCounts[value] ?? 0;
                return (
                  <Button
                    key={value}
                    size="sm"
                    variant={isSelected ? 'secondary' : 'ghost'}
                    aria-pressed={isSelected}
                    className={`h-8 rounded-control text-xs shrink-0 ${isSelected ? 'font-semibold' : ''}`}
                    onClick={() => updateParams({ stage: value === 'all' ? null : value })}
                  >
                    {value === 'all' ? 'All' : STAGE_LABELS[value as ApplicationStage]}
                    {count > 0 && (
                      <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-muted-foreground">
                        {count}
                      </span>
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* List Area */}
          <div>
            {loadState === 'loading' && (
              <div className="space-y-3 p-4" aria-busy="true" role="status">
                {[1, 2, 3].map((n) => (
                  <Skeleton key={n} className="h-20 w-full rounded-surface" />
                ))}
              </div>
            )}

            {loadState === 'error' && (
              <div role="alert" className="p-8 text-center space-y-3">
                <Lock className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="font-semibold text-foreground">
                  {loadError?.category === 'permission'
                    ? 'You do not have access to applications'
                    : 'Applications could not be loaded'}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">{loadError?.userMessage}</p>
                {loadError?.category !== 'permission' && (
                  <Button className="mt-3 rounded-control" size="sm" variant="outline" onClick={load}>
                    Try again
                  </Button>
                )}
              </div>
            )}

            {loadState === 'ready' && filtered.length === 0 && (
              <div className="p-10 text-center space-y-3">
                <Briefcase className="mx-auto h-10 w-10 text-muted-foreground/60" aria-hidden="true" />
                <p className="font-semibold text-foreground">
                  {applications.length ? 'No applications match' : 'No applications yet'}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {applications.length
                    ? 'Try adjusting your search keywords or selecting another stage filter.'
                    : 'Mark an opportunity as applied to create a dedicated application workspace with tailored CV and interview prep.'}
                </p>
                {!applications.length ? (
                  <div className="pt-2">
                    <Button onClick={() => navigate('/opportunities')} className="rounded-control text-xs">
                      Browse Opportunities
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateParams({ q: null, stage: null })}
                      className="rounded-control text-xs"
                    >
                      Clear filters
                    </Button>
                  </div>
                )}
              </div>
            )}

            {filtered.map((application, index) => {
              const facts = applicationFacts(application);
              const organisation = getOrganisation(facts);
              const deadline = facts.application_deadline ? getDeadlineState(facts.application_deadline) : null;
              const title = facts.title || 'Application';

              return (
                <button
                  key={application.id}
                  aria-label={`${title}. Status ${statusLabel(application.status)}. Open dossier.`}
                  ref={(node) => {
                    if (node) rowRefs.current.set(application.id, node);
                    else rowRefs.current.delete(application.id);
                  }}
                  data-application-id={application.id}
                  onKeyDown={(event) => handleKey(event, index)}
                  onClick={() => openDossier(application.id)}
                  className="w-full border-b border-border/70 p-4 text-left transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring last:border-b-0"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-sm text-foreground">{title}</p>
                        <Badge
                          variant={STATUS_BADGE_VARIANT[application.status] ?? 'soft-neutral'}
                          className="shrink-0 text-[10px]"
                        >
                          {statusLabel(application.status)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {organisation ? (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                            {organisation}
                          </span>
                        ) : (
                          <span>Organisation not specified</span>
                        )}

                        {facts.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" aria-hidden="true" />
                            {facts.location}
                          </span>
                        )}

                        {deadline && deadline.label && (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" aria-hidden="true" />
                            {deadline.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="hidden sm:inline-flex items-center text-xs text-primary font-medium">
                        Open workspace <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                      </span>
                    </div>
                  </div>

                  {application.job === null && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Posting unavailable · using saved role details
                    </p>
                  )}

                  {application.next_action && (
                    <div className="mt-2.5 rounded-surface border border-border/50 bg-secondary/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                      <strong className="font-semibold text-foreground">Next step:</strong> {application.next_action}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Intentional Lower Workspace Section: Prove Hub Continuity */}
        {applications.length > 0 && loadState === 'ready' && (
          <section
            aria-labelledby="prove-hub-guidance-title"
            className="rounded-surface border border-border/70 bg-secondary/20 p-5 sm:p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 id="prove-hub-guidance-title" className="text-sm font-semibold text-foreground">
                  Prove Hub Workspace Capabilities
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Every tracked application is backed by a dedicated suite of preparation tools
                </p>
              </div>
              <Button size="sm" variant="outline" asChild className="rounded-control text-xs">
                <Link to="/opportunities">
                  Browse new opportunities <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-surface border border-border bg-card p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-primary">
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  <h3 className="text-xs font-semibold text-foreground">Evidence Dossier</h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Map and verify specific project and work experience items against exact job requirements.
                </p>
              </div>

              <div className="rounded-surface border border-border bg-card p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  <h3 className="text-xs font-semibold text-foreground">Tailored Application CV</h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Maintain an application-specific CV copy with tailored bullets without overwriting your master CV.
                </p>
              </div>

              <div className="rounded-surface border border-border bg-card p-3.5 space-y-1.5">
                <div className="flex items-center gap-2 text-primary">
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  <h3 className="text-xs font-semibold text-foreground">Role Interview Simulation</h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Practise multi-round voice interview questions tailored specifically to this job posting.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>
    </PageLayout>
  );
}
