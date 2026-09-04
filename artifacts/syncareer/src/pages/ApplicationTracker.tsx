import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Briefcase, ChevronRight, Lock, Search, X } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationObject } from '@/components/applications/ApplicationObject';
import { supabase } from '@/integrations/supabase/client';
import { classifyTrackerError, type TrackerWriteFailure } from '@/features/application-tracker/tracking';
import { loadApplicationIndex } from '@/features/application-tracker/applicationIndexData';
import {
  buildApplicationSummaries,
  filterOptions,
  matchesFilter,
  matchesSearch,
  needsAttention,
  parseApplicationFilter,
  recentActivity,
  type ApplicationSummary,
} from '@/features/application-tracker/applicationIndex';
import { cn } from '@/lib/utils';

type LoadState = 'loading' | 'ready' | 'error';

/**
 * Applications — the Prove hub index.
 *
 * Each record renders as an application object (opportunity, stage, next
 * action, evidence and CV state, metadata) that opens its dedicated
 * workspace. Filters describe states the stored records are actually in, and
 * the lower region only appears when real records support it.
 */
export default function ApplicationTracker() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [summaries, setSummaries] = useState<ApplicationSummary[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<TrackerWriteFailure | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const objectRefs = useRef(new Map<string, HTMLButtonElement>());
  const now = useRef(Date.now()).current;

  const search = params.get('q') ?? '';
  const filter = parseApplicationFilter(params.get('state'));

  const updateParams = useCallback((values: Record<string, string | null>) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(values)) value ? next.set(key, value) : next.delete(key);
      return next;
    }, { replace: true });
  }, [setParams]);

  const load = useCallback(async () => {
    setLoadState('loading');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoadError(classifyTrackerError({ code: 'NO_SESSION' }));
      setLoadState('error');
      return;
    }
    const result = await loadApplicationIndex(supabase, session.user.id);
    if (!result.ok) {
      setLoadError(result.error);
      setLoadState('error');
      return;
    }
    setSummaries(
      buildApplicationSummaries(result.data.applications, result.data.resumes, result.data.evidence),
    );
    setLoadState('ready');
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Legacy deep link: /applications?application=:id → canonical workspace route.
  const legacyId = params.get('application');
  useEffect(() => {
    if (!legacyId) return;
    const forwarded = new URLSearchParams();
    const query = params.get('q');
    const stateParam = params.get('state');
    if (query) forwarded.set('q', query);
    if (stateParam) forwarded.set('state', stateParam);
    const suffix = forwarded.toString();
    navigate(`/applications/${encodeURIComponent(legacyId)}${suffix ? `?${suffix}` : ''}`, { replace: true });
  }, [legacyId, params, navigate]);

  const options = useMemo(() => filterOptions(summaries), [summaries]);
  const visible = useMemo(
    () => summaries.filter((summary) => matchesFilter(summary, filter) && matchesSearch(summary, search)),
    [summaries, filter, search],
  );
  const attention = useMemo(() => needsAttention(summaries), [summaries]);
  const activity = useMemo(() => recentActivity(summaries), [summaries]);

  // A filter can disappear when the records behind it do; fall back to All.
  const activeFilter = options.some((option) => option.value === filter) ? filter : 'all';

  const openApplication = (applicationId: string) => {
    setOpeningId(applicationId);
    navigate(`/applications/${encodeURIComponent(applicationId)}`);
  };

  const handleKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let target = index;
    if (event.key === 'ArrowDown') target = Math.min(index + 1, visible.length - 1);
    else if (event.key === 'ArrowUp') target = Math.max(index - 1, 0);
    else if (event.key === 'Home') target = 0;
    else if (event.key === 'End') target = visible.length - 1;
    else return;
    event.preventDefault();
    const summary = visible[target];
    if (!summary) return;
    requestAnimationFrame(() => objectRefs.current.get(summary.id)?.focus());
  };

  return (
    <PageLayout
      title="Applications"
      description="Every application you are proving, with its stage, evidence and next step."
      headerVariant="document"
    >
      <div className="space-y-6">
        <section className="surface-content overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Filter applications by state">
              {options.map((option) => {
                const isActive = activeFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => updateParams({ state: option.value === 'all' ? null : option.value })}
                    className={cn(
                      'interactive h-8 rounded-control px-3 text-xs font-medium',
                      isActive ? 'bg-selected text-selected-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {option.label}
                    <span className="ml-1.5 tabular-nums opacity-70">{option.count}</span>
                  </button>
                );
              })}
            </div>

            <div className="relative sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
              <Input
                aria-label="Search applications"
                className="h-9 rounded-input pl-9 pr-8 text-sm"
                value={search}
                onChange={(event) => updateParams({ q: event.target.value || null })}
                placeholder="Search role or company…"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => updateParams({ q: null })}
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {loadState === 'loading' && (
            <div className="space-y-3 p-4" aria-busy="true" role="status">
              <span className="sr-only">Loading applications</span>
              {[1, 2, 3].map((n) => (
                <Skeleton key={n} className="h-28 w-full rounded-surface" />
              ))}
            </div>
          )}

          {loadState === 'error' && (
            <div role="alert" className="space-y-3 p-8 text-center">
              <Lock className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
              <p className="font-semibold text-foreground">
                {loadError?.category === 'permission'
                  ? 'You do not have access to applications'
                  : 'Applications could not be loaded'}
              </p>
              <p className="type-meta mx-auto max-w-sm">{loadError?.userMessage}</p>
              {loadError?.category !== 'permission' && (
                <Button size="sm" variant="outline" onClick={load}>Try again</Button>
              )}
            </div>
          )}

          {loadState === 'ready' && visible.length === 0 && (
            <div className="space-y-3 p-10 text-center">
              <Briefcase className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
              <p className="font-semibold text-foreground">
                {summaries.length ? 'No applications match' : 'No applications yet'}
              </p>
              <p className="type-meta mx-auto max-w-sm">
                {summaries.length
                  ? 'Adjust your search or choose another state.'
                  : 'Mark an opportunity as applied to open a workspace with its requirements, evidence, CV and interview preparation.'}
              </p>
              {summaries.length ? (
                <Button size="sm" variant="outline" onClick={() => updateParams({ q: null, state: null })}>
                  Clear filters
                </Button>
              ) : (
                <Button size="sm" onClick={() => navigate('/opportunities')}>Browse Opportunities</Button>
              )}
            </div>
          )}

          {loadState === 'ready' && visible.length > 0 && (
            <div role="group" aria-label="Applications">
              {visible.map((summary, index) => (
                <ApplicationObject
                  key={summary.id}
                  summary={summary}
                  selected={openingId === summary.id}
                  now={now}
                  onOpen={() => openApplication(summary.id)}
                  onKeyDown={(event) => handleKey(event, index)}
                  registerRef={(node) => {
                    if (node) objectRefs.current.set(summary.id, node);
                    else objectRefs.current.delete(summary.id);
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {loadState === 'ready' && (attention.length > 0 || activity.length > 0) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {attention.length > 0 && (
              <section aria-labelledby="applications-attention" className="surface-content p-4 sm:p-5">
                <h2 id="applications-attention" className="type-section-title">Needs your attention</h2>
                <ul className="mt-3 space-y-2">
                  {attention.map((summary) => (
                    <li key={summary.id}>
                      <Link
                        to={`/applications/${encodeURIComponent(summary.id)}`}
                        className="interactive flex items-start justify-between gap-3 rounded-control px-2 py-2 -mx-2"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">{summary.role}</span>
                          <span className="type-meta block">
                            {summary.nextAction.dueState === 'overdue'
                              ? 'Next action overdue'
                              : summary.nextAction.dueState === 'today'
                                ? 'Next action due today'
                                : `${summary.evidence?.gapRequirementCount ?? 0} requirement${(summary.evidence?.gapRequirementCount ?? 0) === 1 ? '' : 's'} without evidence`}
                          </span>
                        </span>
                        <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {activity.length > 0 && (
              <section aria-labelledby="applications-activity" className="surface-content p-4 sm:p-5">
                <h2 id="applications-activity" className="type-section-title">Recent activity</h2>
                <ul className="mt-3 space-y-2">
                  {activity.map((summary) => (
                    <li key={summary.id} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm text-foreground">{summary.role}</span>
                      <span className="type-meta shrink-0">
                        {summary.stageLabel} ·{' '}
                        {new Date(summary.lastActivityAt ?? summary.appliedAt).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
