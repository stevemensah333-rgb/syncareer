import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Briefcase, Lock, Search } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { classifyTrackerError } from '@/features/application-tracker/tracking';
import { STAGE_LABELS, STAGE_ORDER, stageForStatus, statusLabel, statusesForStage, type ApplicationStage } from '@/features/application-tracker/workflow';
import { applicationFacts, type WorkspaceApplication } from '@/features/application-tracker/workspace';
import { getOrganisation } from '@/features/opportunities/opportunity';

type StageFilter = 'all' | ApplicationStage | 'other';
type LoadState = 'loading' | 'ready' | 'error';

/**
 * Dossier index: searchable list of applications. Each row opens the canonical
 * dossier route; the legacy `?application=` deep link redirects there with
 * meaningful filters preserved.
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

  return <PageLayout title="Applications" description="Keep each role, CV, preparation and next action in one workspace." headerVariant="document">
    <div className="-mx-4 -mb-6 border-y bg-card sm:mx-0 sm:rounded-lg sm:border">
      <div className="flex min-h-[70vh] flex-col">
        <div className="space-y-3 border-b p-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search applications" className="pl-9" value={search} onChange={(e) => updateParams({ q: e.target.value || null })} placeholder="Search applications" /></div>
          <div className="flex gap-1 overflow-x-auto" aria-label="Filter by stage">{(['all', ...STAGE_ORDER] as StageFilter[]).map((value) => <Button key={value} size="sm" variant={stage === value ? 'secondary' : 'ghost'} aria-pressed={stage === value} onClick={() => updateParams({ stage: value === 'all' ? null : value })}>{value === 'all' ? 'All' : STAGE_LABELS[value as ApplicationStage]}</Button>)}</div>
        </div>
        <div className="flex-1">
          {loadState === 'loading' && <div className="space-y-2 p-3" aria-busy="true">{[1,2,3].map((n) => <Skeleton key={n} className="h-20" />)}</div>}
          {loadState === 'error' && <div role="alert" className="p-6 text-center"><Lock className="mx-auto mb-2 h-8 w-8" /><p className="font-medium">{loadError?.category === 'permission' ? 'You do not have access to applications' : 'Applications could not be loaded'}</p><p className="mt-1 text-sm text-muted-foreground">{loadError?.userMessage}</p>{loadError?.category !== 'permission' && <Button className="mt-3" variant="outline" onClick={load}>Try again</Button>}</div>}
          {loadState === 'ready' && filtered.length === 0 && <div className="p-8 text-center"><Briefcase className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="font-medium">{applications.length ? 'No applications match' : 'No applications yet'}</p><p className="mt-1 text-sm text-muted-foreground">{applications.length ? 'Try another search or stage.' : 'Mark an opportunity as applied to start a workspace.'}</p>{!applications.length && <Button className="mt-4" onClick={() => navigate('/opportunities')}>Browse Opportunities</Button>}</div>}
          {filtered.map((application, index) => { const facts = applicationFacts(application); return <button key={application.id} aria-label={`${facts.title || 'Application'}. Status ${statusLabel(application.status)}. Open dossier.`} ref={(node) => { if (node) rowRefs.current.set(application.id, node); else rowRefs.current.delete(application.id); }} data-application-id={application.id} onKeyDown={(event) => handleKey(event, index)} onClick={() => openDossier(application.id)} className={`w-full border-b p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring hover:bg-muted/50`}><div className="flex items-start justify-between gap-2 min-w-0"><div className="min-w-0 flex-1"><p className="truncate font-medium">{facts.title || 'Application'}</p><p className="truncate text-xs text-muted-foreground">{getOrganisation(facts) || 'Organisation not specified'}</p></div><span className="shrink-0 border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{statusLabel(application.status)}</span></div>{application.job === null && <p className="mt-2 flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3 w-3" />Posting unavailable · using saved role details</p>}{application.next_action && <p className="mt-2 truncate text-xs text-muted-foreground">Next: {application.next_action}</p>}</button>; })}
        </div>
      </div>
    </div>
  </PageLayout>;
}
