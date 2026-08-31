import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_EDITOR_GROUPS, canRecordStatus } from '@/features/application-tracker/workflow';
import { applicationFacts, nextActionDueState, type WorkspaceApplication, type WorkspaceInterview, type WorkspaceResume } from '@/features/application-tracker/workspace';
import { getOrganisation, getProvenanceFacts } from '@/features/opportunities/opportunity';
import { ContextualAssistantDrawer } from '@/components/assistant/ContextualAssistantDrawer';
import { RequirementEvidenceActions } from '@/components/learning/RequirementEvidenceActions';
import { buildEvidenceHref } from '@/features/learning/requirementLearning';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

interface Props {
  application: WorkspaceApplication;
  resumes: WorkspaceResume[];
  interviews: WorkspaceInterview[];
  statusSaving: boolean;
  notesState: SaveState;
  workspaceState: SaveState;
  onBack: () => void;
  onStatus: (status: string) => void;
  onNotes: (notes: string) => void;
  onWorkspace: (update: { resume_id?: string | null; next_action?: string | null; next_action_due?: string | null }) => void;
  onInterviewLink: (interviewId: string, linked: boolean) => void;
}

export function ApplicationWorkspaceDetail({ application, resumes, interviews, statusSaving, notesState, workspaceState, onBack, onStatus, onNotes, onWorkspace, onInterviewLink }: Props) {
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 1024);
  const [notes, setNotes] = useState(application.notes ?? '');
  const [nextAction, setNextAction] = useState(application.next_action ?? '');
  const [due, setDue] = useState(application.next_action_due ?? '');
  const assistantUndoNotes = useRef<string | null>(null);
  useEffect(() => {
    setNotes(application.notes ?? '');
    setNextAction(application.next_action ?? '');
    setDue(application.next_action_due ?? '');
  }, [application.id, application.notes, application.next_action, application.next_action_due]);
  useEffect(() => {
    const updateViewport = () => setDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  const facts = useMemo(() => applicationFacts(application), [application]);
  const organisation = getOrganisation(facts) ?? 'Organisation not specified';
  const provenance = getProvenanceFacts(facts);
  const dueState = nextActionDueState(application.next_action, application.next_action_due);
  const cvHref = `/cv-builder?application=${encodeURIComponent(application.id)}${application.job_id ? `&opportunity=${encodeURIComponent(application.job_id)}` : ''}&targetRole=${encodeURIComponent(facts.title ?? '')}`;
  const practiceHref = `/interview-simulator?application=${encodeURIComponent(application.id)}&role=${encodeURIComponent(facts.title ?? '')}`;
  const linkedInterviews = interviews.filter((interview) => interview.application_id === application.id);
  const availableInterviews = interviews.filter((interview) => !interview.application_id);
  const notesDirty = notes.trim() !== (application.notes ?? '');
  const actionDirty = nextAction.trim() !== (application.next_action ?? '') || due !== (application.next_action_due ?? '');

  // Overview/Actions are rendered by plain function calls rather than as
  // nested component definitions: defining them as components would give them
  // a fresh type identity on every parent render, unmounting and remounting
  // this whole workspace subtree on every keystroke (losing input focus).
  const renderOverview = () => <div className="space-y-5">
    {application.job === null && <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">The source posting is unavailable. This workspace is using the durable facts saved with your application.</div>}
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</h3>
      <h2 className="text-xl font-semibold">{facts.title || 'Application'}</h2>
      <p className="text-sm text-muted-foreground">{organisation}{facts.location ? ` · ${facts.location}` : ''}</p>
      <p className="text-sm whitespace-pre-wrap">{facts.employment_type || 'Role type not provided'}</p>
      {facts.skills?.length ? <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requirements</p>
        {facts.skills.map((skill) => <RequirementEvidenceActions key={skill} requirement={skill} role={facts.title ?? undefined} evidenceHref={buildEvidenceHref({ requirement: skill, role: facts.title ?? undefined, applicationId: application.id, returnTo: `/applications?application=${encodeURIComponent(application.id)}` })} />)}
      </div> : <p className="text-sm text-muted-foreground">Requirements were not provided.</p>}
    </section>
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Where you are</h3>
      <p className="text-sm font-medium">{application.status === 'offered' ? 'Offer received' : STATUS_EDITOR_GROUPS.flatMap((group) => group.options).find((option) => option.value === application.status)?.label ?? application.status}</p>
      <Select value={application.status} disabled={statusSaving} onValueChange={(value) => canRecordStatus(application.status, value) && onStatus(value)}>
        <SelectTrigger aria-label="Application stage"><SelectValue /></SelectTrigger>
        <SelectContent>{STATUS_EDITOR_GROUPS.map((group) => <SelectGroup key={group.id}><SelectLabel>{group.label}</SelectLabel>{group.options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectGroup>)}</SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">Stage and terminal outcome use the same approved status vocabulary. Changing status does not write a separate outcome field.</p>
    </section>
    <section className="space-y-1 text-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Source</h3>
      <p>{provenance.sourceLabel}</p>
      {provenance.sourceUrl ? <a className="inline-flex items-center gap-1 text-primary hover:underline" href={provenance.sourceUrl} target="_blank" rel="noopener noreferrer">Original source <ExternalLink className="h-3.5 w-3.5" /></a> : <p className="text-muted-foreground">Original source link unavailable.</p>}
    </section>
  </div>;

  const renderActions = (only?: 'cv' | 'practice' | 'notes') => <div className="space-y-5">
    {!only && <section className="space-y-2 rounded-lg border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recommended next step</p>
      <h3 className="font-semibold">Next action</h3>
      {application.next_action ? <p className="text-sm">{application.next_action}</p> : <p className="text-sm text-muted-foreground">No next action set.</p>}
      {application.next_action_due && <p className={`text-xs ${dueState === 'overdue' ? 'text-destructive' : dueState === 'today' ? 'text-warning' : 'text-muted-foreground'}`}>{dueState === 'overdue' ? 'Overdue' : dueState === 'today' ? 'Due today' : 'Upcoming'} · {application.next_action_due}</p>}
      <Input aria-label="Next action" value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="e.g. Follow up with recruiter" />
      <Input aria-label="Next action due date" type="date" value={due} disabled={!nextAction.trim()} onChange={(e) => setDue(e.target.value)} />
      <Button size="sm" disabled={!actionDirty || workspaceState === 'saving'} onClick={() => onWorkspace({ next_action: nextAction, next_action_due: nextAction.trim() ? due || null : null })}>{workspaceState === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}Save next action</Button>
      <SaveMessage state={workspaceState} />
    </section>}
    {!only && <section className="space-y-2 rounded-lg border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Human guidance</p>
      <h3 className="font-semibold">Ask a verified mentor</h3>
      <p className="text-sm text-muted-foreground">Request focused CV, interview, portfolio or industry guidance for this application.</p>
      <Button variant="outline" size="sm" asChild><Link to={`/mentors?application=${encodeURIComponent(application.id)}`}><MessageSquare className="h-4 w-4" />Find a mentor</Link></Button>
    </section>}
    {(!only || only === 'cv') && <section className="space-y-2">
      <h3 className="font-semibold">Targeted CV</h3>
      <Select value={application.resume_id ?? 'none'} onValueChange={(value) => onWorkspace({ resume_id: value === 'none' ? null : value })}>
        <SelectTrigger aria-label="Linked CV"><SelectValue placeholder="No linked CV" /></SelectTrigger>
        <SelectContent><SelectItem value="none">No linked CV</SelectItem>{resumes.map((resume) => <SelectItem key={resume.id} value={resume.id}>{resume.title || 'Untitled CV'}</SelectItem>)}</SelectContent>
      </Select>
      {!application.resume_id && <p className="text-sm text-muted-foreground">No CV linked to this application.</p>}
      <Button variant="outline" size="sm" asChild><Link to={cvHref}><FileText className="h-4 w-4" />Open CV builder</Link></Button>
    </section>}
    {(!only || only === 'practice') && <section className="space-y-2">
      <h3 className="font-semibold">Interview practice</h3>
      {linkedInterviews.length ? linkedInterviews.map((interview) => <div key={interview.id} className="flex items-center justify-between gap-2 rounded border p-2 text-sm"><span>{interview.job_role || 'Interview practice'}</span><Button size="sm" variant="ghost" onClick={() => onInterviewLink(interview.id, false)}>Unlink</Button></div>) : <p className="text-sm text-muted-foreground">No interview practice linked yet.</p>}
      {availableInterviews.length > 0 && <Select onValueChange={(id) => onInterviewLink(id, true)}><SelectTrigger aria-label="Link interview practice"><SelectValue placeholder="Link existing practice" /></SelectTrigger><SelectContent>{availableInterviews.map((interview) => <SelectItem key={interview.id} value={interview.id}>{interview.job_role || 'Interview practice'}</SelectItem>)}</SelectContent></Select>}
      <Button variant="outline" size="sm" asChild><Link to={practiceHref}><MessageSquare className="h-4 w-4" />Start practice</Link></Button>
    </section>}
    {(!only || only === 'notes') && <section className="space-y-2">
      <h3 className="font-semibold">Notes</h3>
      <Textarea aria-label="Application notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={6} />
      <ContextualAssistantDrawer
        task="application.draft_follow_up"
        description="Draft a follow-up or organise notes using only the role facts and optional notes you choose to send."
        suggestedPrompt="Draft a concise follow-up using only the supplied facts. Leave placeholders for any contact name or date that was not supplied."
        context={[
          { id: 'application-role', label: facts.title || 'Application', provenance: 'opportunity', content: [facts.title, organisation, application.status].filter(Boolean).join(' · ') },
          { id: 'application-notes', label: 'Application notes', provenance: 'application_notes', content: notes, optional: true, personal: true },
        ]}
        acceptLabel="Add to notes draft"
        onAccept={(text) => { assistantUndoNotes.current = notes; setNotes((current) => current.trim() ? `${current.trim()}\n\n${text}` : text); }}
        onUndo={() => { if (assistantUndoNotes.current !== null) { setNotes(assistantUndoNotes.current); assistantUndoNotes.current = null; } }}
      />
      <Button size="sm" disabled={!notesDirty || notesState === 'saving'} onClick={() => onNotes(notes)}>{notesState === 'saving' && <Loader2 className="h-4 w-4 animate-spin" />}{notesState === 'failed' && <RotateCcw className="h-4 w-4" />}{notesState === 'failed' ? 'Retry save' : 'Save notes'}</Button>
      <SaveMessage state={notesState} />
    </section>}
  </div>;

  if (desktop) return <div className="grid grid-cols-[minmax(0,1fr)_minmax(280px,380px)] divide-x bg-card"><main className="p-6">{renderOverview()}</main><aside className="p-5">{renderActions()}</aside></div>;
  return <div className="h-full bg-card"><div className="border-b p-3"><Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" />Back to applications</Button></div><Tabs defaultValue="overview"><TabsList className="m-3 grid grid-cols-4"><TabsTrigger value="overview">Overview</TabsTrigger><TabsTrigger value="cv">CV</TabsTrigger><TabsTrigger value="practice">Practice</TabsTrigger><TabsTrigger value="notes">Notes</TabsTrigger></TabsList><TabsContent value="overview" className="p-4">{renderOverview()}</TabsContent><TabsContent value="cv" className="p-4">{renderActions('cv')}</TabsContent><TabsContent value="practice" className="p-4">{renderActions('practice')}</TabsContent><TabsContent value="notes" className="p-4">{renderActions('notes')}</TabsContent></Tabs></div>;
}

function SaveMessage({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return <p role="status" className={`text-xs ${state === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Save failed. Your changes are still here; retry when ready.'}</p>;
}
