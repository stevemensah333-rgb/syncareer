import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Briefcase, Lock, Search } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ApplicationWorkspaceDetail } from '@/components/applications/ApplicationWorkspaceDetail';
import { STATUS_COLORS } from '@/features/application-tracker/constants';
import { classifyTrackerError, saveApplicationNotes, updateApplicationStatus, updateApplicationWorkspace, updateInterviewApplicationLink } from '@/features/application-tracker/tracking';
import { STAGE_LABELS, STAGE_ORDER, stageForStatus, statusLabel, statusesForStage, type ApplicationStage } from '@/features/application-tracker/workflow';
import { applicationFacts, ownedWorkspaceLinks, type WorkspaceApplication, type WorkspaceInterview, type WorkspaceResume } from '@/features/application-tracker/workspace';
import { getOrganisation } from '@/features/opportunities/opportunity';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';

type StageFilter = 'all' | ApplicationStage | 'other';
type LoadState = 'loading' | 'ready' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

export default function ApplicationTracker() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [applications, setApplications] = useState<WorkspaceApplication[]>([]);
  const [resumes, setResumes] = useState<WorkspaceResume[]>([]);
  const [interviews, setInterviews] = useState<WorkspaceInterview[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [loadError, setLoadError] = useState<ReturnType<typeof classifyTrackerError> | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [notesState, setNotesState] = useState<SaveState>('idle');
  const [workspaceState, setWorkspaceState] = useState<SaveState>('idle');
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());

  const selectedId = params.get('application');
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
    setUserId(session.user.id);
    try {
      const [appsResult, resumesResult, interviewsResult] = await Promise.all([
        supabase.from('job_applications').select(`*, job:job_postings(title, location, employment_type, company_name, department, source, source_url, application_deadline, skills, experience_level, updated_at)`).eq('applicant_id', session.user.id).order('created_at', { ascending: false }),
        supabase.from('resumes').select('id, user_id, title, updated_at').eq('user_id', session.user.id).order('updated_at', { ascending: false }),
        supabase.from('mock_interviews').select('*').eq('user_id', session.user.id).order('created_at', { ascending: false }),
      ]);
      if (appsResult.error) throw appsResult.error;
      setApplications((appsResult.data ?? []) as unknown as WorkspaceApplication[]);
      setResumes(resumesResult.error ? [] : ownedWorkspaceLinks((resumesResult.data ?? []) as WorkspaceResume[], session.user.id));
      setInterviews(interviewsResult.error ? [] : ownedWorkspaceLinks((interviewsResult.data ?? []) as unknown as WorkspaceInterview[], session.user.id));
      setLoadState('ready');
    } catch (error) {
      setLoadError(classifyTrackerError(error));
      setLoadState('error');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => applications.filter((application) => {
    const facts = applicationFacts(application);
    const term = search.trim().toLowerCase();
    if (term && !`${facts.title ?? ''} ${getOrganisation(facts) ?? ''} ${application.notes ?? ''}`.toLowerCase().includes(term)) return false;
    if (stage === 'all') return true;
    if (stage === 'other') return stageForStatus(application.status) === null;
    return statusesForStage(stage).includes(application.status);
  }), [applications, search, stage]);

  useEffect(() => {
    if (loadState !== 'ready' || selectedId || filtered.length === 0 || window.innerWidth < 1024) return;
    const first = filtered[0];
    if (first) updateParams({ application: first.id });
  }, [filtered, loadState, selectedId, updateParams]);

  const selected = applications.find((application) => application.id === selectedId) ?? null;

  const handleStatus = async (status: string) => {
    if (!selected || !userId) return;
    setStatusSaving(true);
    const result = await updateApplicationStatus(supabase, selected.id, status, userId);
    setStatusSaving(false);
    if (!result.ok) { toast.error(result.userMessage); return; }
    setApplications((items) => items.map((item) => item.id === selected.id ? { ...item, status } : item));
    if (status === 'rejected' || status === 'withdrawn' || status === 'offered') {
      captureProductEvent(ANALYTICS_EVENTS.APPLICATION_OUTCOME_RECORDED, { outcome: status as 'offered' | 'rejected' | 'withdrawn' });
    } else {
      const mapped = (() => {
        const s = stageForStatus(status);
        if (s === 'applied') return 'applied' as const;
        if (s === 'review') return 'considering' as const;
        if (s === 'interview') return 'interview' as const;
        if (s === 'offer') return 'offer' as const;
        return 'other' as const;
      })();
      captureProductEvent(ANALYTICS_EVENTS.APPLICATION_STAGE_RECORDED, { stage: mapped });
    }
    toast.success(`Stage updated to ${statusLabel(status)}`);
  };

  const handleNotes = async (notes: string) => {
    if (!selected || !userId) return;
    setNotesState('saving');
    const result = await saveApplicationNotes(supabase, selected.id, notes, userId);
    if (!result.ok) { setNotesState('failed'); return; }
    setApplications((items) => items.map((item) => item.id === selected.id ? { ...item, notes: notes.trim() || null } : item));
    setNotesState('saved');
  };

  const handleWorkspace = async (update: { resume_id?: string | null; next_action?: string | null; next_action_due?: string | null }) => {
    if (!selected || !userId) return;
    if (update.resume_id && !resumes.some((resume) => resume.id === update.resume_id && resume.user_id === userId)) {
      toast.error('That CV is not available to link.');
      return;
    }
    setWorkspaceState('saving');
    const result = await updateApplicationWorkspace(supabase, selected.id, userId, update);
    if (!result.ok) { setWorkspaceState('failed'); return; }
    setApplications((items) => items.map((item) => item.id === selected.id ? { ...item, ...update, next_action: update.next_action?.trim() || (update.next_action === undefined ? item.next_action : null), next_action_due: update.next_action?.trim() === '' ? null : update.next_action_due === undefined ? item.next_action_due : update.next_action_due } : item));
    if (update.next_action?.trim()) captureProductEvent(ANALYTICS_EVENTS.APPLICATION_NEXT_ACTION_SET, { has_due_date: Boolean(update.next_action_due) });
    setWorkspaceState('saved');
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
    updateParams({ application: application.id }, false);
    requestAnimationFrame(() => rowRefs.current.get(application.id)?.focus());
  };

  const handleInterviewLink = async (interviewId: string, linked: boolean) => {
    if (!selected || !userId || !interviews.some((interview) => interview.id === interviewId && interview.user_id === userId)) return;
    const result = await updateInterviewApplicationLink(supabase, interviewId, userId, linked ? selected.id : null);
    if (!result.ok) { toast.error(result.userMessage); return; }
    setInterviews((items) => items.map((item) => item.id === interviewId ? { ...item, application_id: linked ? selected.id : null } : item));
  };

  return <PageLayout title="Applications" description="Keep each role, CV, preparation and next action in one workspace.">
    <div className="-mx-4 -mb-6 border-y bg-card sm:mx-0 sm:rounded-lg sm:border lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <aside className={`${selected ? 'hidden lg:flex' : 'flex'} min-h-[70vh] flex-col border-r lg:max-h-[calc(100dvh-10rem)]`}>
        <div className="space-y-3 border-b p-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search applications" className="pl-9" value={search} onChange={(e) => updateParams({ q: e.target.value || null })} placeholder="Search applications" /></div>
          <div className="flex gap-1 overflow-x-auto" aria-label="Filter by stage">{(['all', ...STAGE_ORDER] as StageFilter[]).map((value) => <Button key={value} size="sm" variant={stage === value ? 'secondary' : 'ghost'} aria-pressed={stage === value} onClick={() => updateParams({ stage: value === 'all' ? null : value })}>{value === 'all' ? 'All' : STAGE_LABELS[value as ApplicationStage]}</Button>)}</div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadState === 'loading' && <div className="space-y-2 p-3" aria-busy="true">{[1,2,3].map((n) => <Skeleton key={n} className="h-20" />)}</div>}
          {loadState === 'error' && <div role="alert" className="p-6 text-center"><Lock className="mx-auto mb-2 h-8 w-8" /><p className="font-medium">{loadError?.category === 'permission' ? 'You do not have access to applications' : 'Applications could not be loaded'}</p><p className="mt-1 text-sm text-muted-foreground">{loadError?.userMessage}</p>{loadError?.category !== 'permission' && <Button className="mt-3" variant="outline" onClick={load}>Try again</Button>}</div>}
          {loadState === 'ready' && filtered.length === 0 && <div className="p-8 text-center"><Briefcase className="mx-auto mb-2 h-8 w-8 text-muted-foreground" /><p className="font-medium">{applications.length ? 'No applications match' : 'No applications yet'}</p><p className="mt-1 text-sm text-muted-foreground">{applications.length ? 'Try another search or stage.' : 'Mark an opportunity as applied to start a workspace.'}</p>{!applications.length && <Button className="mt-4" onClick={() => navigate('/opportunities')}>Browse Opportunities</Button>}</div>}
          {filtered.map((application, index) => { const facts = applicationFacts(application); return <button key={application.id} aria-label={`${facts.title || 'Application'}. Status ${statusLabel(application.status)}. Open details.`} ref={(node) => { if (node) rowRefs.current.set(application.id, node); else rowRefs.current.delete(application.id); }} data-application-id={application.id} onKeyDown={(event) => handleKey(event, index)} onClick={() => updateParams({ application: application.id }, false)} aria-current={selectedId === application.id ? 'true' : undefined} className={`w-full border-b p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selectedId === application.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'hover:bg-muted/50'}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-medium">{facts.title || 'Application'}</p><p className="truncate text-xs text-muted-foreground">{getOrganisation(facts) || 'Organisation not specified'}</p></div><span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${STATUS_COLORS[application.status] ?? 'bg-muted'}`}>{statusLabel(application.status)}</span></div>{application.job === null && <p className="mt-2 flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3 w-3" />Posting unavailable · using saved role details</p>}{application.next_action && <p className="mt-2 truncate text-xs text-muted-foreground">Next: {application.next_action}</p>}</button>; })}
        </div>
      </aside>
      <section className={`${selected ? 'block' : 'hidden lg:block'} min-w-0`}>{selected ? <ApplicationWorkspaceDetail application={selected} resumes={resumes} interviews={interviews} statusSaving={statusSaving} notesState={notesState} workspaceState={workspaceState} onBack={() => updateParams({ application: null }, false)} onStatus={handleStatus} onNotes={handleNotes} onWorkspace={handleWorkspace} onInterviewLink={handleInterviewLink} /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select an application to open its workspace.</div>}</section>
    </div>
  </PageLayout>;
}
