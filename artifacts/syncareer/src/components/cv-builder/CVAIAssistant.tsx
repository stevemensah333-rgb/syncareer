import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Lightbulb, Loader2, RotateCcw, Send, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CVData } from '@/features/cv-builder/types';
import { SECTION_TIPS } from '@/features/cv-builder/constants';
import type { CVAIProposal } from '@/features/cv-builder/aiProposal';
import {
  buildCandidateEvidence,
  matchRequirementToEvidence,
  type CandidateEvidence,
  type CvSuggestion,
  type OpportunityContext,
} from '@/features/cv-builder/guidance';
import {
  isSuggestionSafeToAccept,
  proposeCvBulletImprovement,
  revalidateCvSuggestion,
} from '@/features/cv-builder/aiOperations';
import { AssistantRequestError } from '@/features/contextual-assistant/contract';

interface Props {
  cvData: CVData;
  activeSection: string;
  opportunity: OpportunityContext | null;
  opportunityLoading?: boolean;
  opportunityError?: string | null;
  onSuggestion: (proposal: CVAIProposal) => boolean;
  onUndo: () => void;
}

interface BulletOption { path: string; value: string; label: string; }

const NON_CANDIDATE_REQUIREMENTS = new Set(['deadline', 'location', 'work_authorization']);

function evidenceLabel(evidence: CandidateEvidence): string {
  return `${evidence.title}${evidence.organisation ? ` · ${evidence.organisation}` : ''}`;
}

export function CVAIAssistant({
  cvData,
  activeSection,
  opportunity,
  opportunityLoading = false,
  opportunityError = null,
  onSuggestion,
  onUndo,
}: Props) {
  const bullets = useMemo<BulletOption[]>(() => {
    if (!['experience', 'projects', 'activities'].includes(activeSection)) return [];
    const rows = cvData[activeSection as 'experience' | 'projects' | 'activities'];
    return rows.flatMap((row) => row.bullets.map((value, index) => ({
      path: `${activeSection}.${row.id}.bullets.${index}`,
      value,
      label: `${'company' in row ? row.company : 'projectName' in row ? row.projectName : row.organization || activeSection} · bullet ${index + 1}`,
    }))).filter((item) => item.value.trim());
  }, [activeSection, cvData]);
  const evidence = useMemo(() => buildCandidateEvidence(cvData), [cvData]);
  const requirements = useMemo(
    () => (opportunity?.requirements ?? []).filter((item) => !NON_CANDIDATE_REQUIREMENTS.has(item.kind)),
    [opportunity],
  );
  const [selectedPath, setSelectedPath] = useState('');
  const selected = bullets.find((item) => item.path === selectedPath) ?? bullets[0] ?? null;
  const [requirementId, setRequirementId] = useState('');
  const requirement = requirements.find((item) => item.requirementId === requirementId) ?? requirements[0] ?? null;
  const match = useMemo(
    () => requirement ? matchRequirementToEvidence(requirement, evidence) : null,
    [evidence, requirement],
  );
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<Set<string>>(new Set());
  const [instruction, setInstruction] = useState('Rewrite this bullet to make the connection specific and concise without adding facts.');
  const [suggestion, setSuggestion] = useState<CvSuggestion | null>(null);
  const [editedText, setEditedText] = useState('');
  const [state, setState] = useState<'idle' | 'pending' | 'rejected' | 'accepted'>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tips = SECTION_TIPS[activeSection] || SECTION_TIPS.personal;

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    setSuggestion(null);
    setEditedText('');
    setState('idle');
    setError(null);
  }, [selected?.path, requirement?.requirementId]);

  useEffect(() => {
    if (!selected) {
      setSelectedEvidenceIds(new Set());
      return;
    }
    const direct = evidence.find((item) => item.description.includes(selected.value));
    const recommended = match?.evidenceIds ?? [];
    setSelectedEvidenceIds(new Set([direct?.evidenceId, ...recommended].filter((id): id is string => Boolean(id)).slice(0, 4)));
  }, [evidence, match?.evidenceIds, selected]);

  const selectedEvidence = evidence.filter((item) => selectedEvidenceIds.has(item.evidenceId));
  const currentSuggestion = useMemo(() => {
    if (!suggestion || !opportunity || !requirement) return suggestion;
    return revalidateCvSuggestion(suggestion, editedText, selectedEvidence, [requirement], opportunity);
  }, [editedText, opportunity, requirement, selectedEvidence, suggestion]);
  const safeToAccept = Boolean(currentSuggestion && isSuggestionSafeToAccept(currentSuggestion));

  const toggleEvidence = (evidenceId: string) => {
    setSelectedEvidenceIds((current) => {
      const next = new Set(current);
      if (next.has(evidenceId)) next.delete(evidenceId);
      else if (next.size < 7) next.add(evidenceId);
      return next;
    });
  };

  const requestSuggestion = async () => {
    if (!selected || !opportunity || !requirement || !match || selectedEvidence.length === 0 || state === 'pending') return;
    setState('pending');
    setError(null);
    setSuggestion(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await proposeCvBulletImprovement({
        fieldPath: selected.path,
        originalText: selected.value,
        instruction,
        opportunity,
        requirements: [requirement],
        evidence: selectedEvidence,
        matches: [match],
      }, controller.signal);
      setSuggestion(result);
      setEditedText(result.proposedText);
      setState('idle');
    } catch (cause) {
      if (cause instanceof AssistantRequestError && cause.code === 'cancelled') return;
      setError(cause instanceof AssistantRequestError
        ? cause.message
        : 'A safe, evidence-grounded suggestion could not be prepared. Nothing was changed.');
      setState('idle');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  };

  const accept = () => {
    if (!currentSuggestion || !safeToAccept) return;
    const accepted = onSuggestion({
      fieldPath: currentSuggestion.fieldPath,
      before: currentSuggestion.originalText,
      after: currentSuggestion.proposedText,
      rationale: currentSuggestion.rationale,
    });
    if (accepted) setState('accepted');
  };

  return <div className="space-y-4">
    <Card>
      <CardHeader className="pb-3"><CardTitle className="text-base">Job-specific bullet suggestion</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        {opportunityLoading ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading the selected opportunity…</p>
          : opportunityError ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{opportunityError}</div>
          : !opportunity ? <div className="rounded-lg border bg-muted/40 p-3 text-sm"><p className="font-medium">Choose an opportunity before requesting AI wording.</p><p className="mt-1 text-muted-foreground">Job-specific guidance needs a real role and candidate evidence; generic CV prompts are disabled here.</p><Button asChild size="sm" variant="outline" className="mt-3"><Link to="/opportunities">Choose an opportunity</Link></Button></div>
          : requirements.length === 0 ? <div role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">No meaningful candidate requirement could be extracted from this posting. Confirm the original source before tailoring your CV.</div>
          : !bullets.length ? <p className="text-sm text-muted-foreground">Open Experience, Projects or Activities and enter a bullet before requesting a rewrite.</p>
          : <>
            <div className="rounded-lg border bg-primary/5 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-primary">Active context</p>
              <p className="mt-1 font-medium">{opportunity.title}{opportunity.organisation ? ` · ${opportunity.organisation}` : ''}</p>
              <p className="mt-1 text-xs text-muted-foreground">Only the selected requirement and evidence below will be sent.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assistant-cv-bullet">Original bullet</Label>
              <Select value={selected?.path ?? ''} onValueChange={setSelectedPath}><SelectTrigger id="assistant-cv-bullet"><SelectValue /></SelectTrigger><SelectContent>{bullets.map((bullet) => <SelectItem key={bullet.path} value={bullet.path}>{bullet.label}</SelectItem>)}</SelectContent></Select>
              {selected && <p className="rounded-md border bg-muted/30 p-3 text-sm">{selected.value}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assistant-requirement">Requirement to address</Label>
              <Select value={requirement?.requirementId ?? ''} onValueChange={setRequirementId}><SelectTrigger id="assistant-requirement"><SelectValue /></SelectTrigger><SelectContent>{requirements.map((item) => <SelectItem key={item.requirementId} value={item.requirementId}>{item.text}</SelectItem>)}</SelectContent></Select>
              {match && <div className="flex items-start gap-2 rounded-md border p-3 text-xs"><Badge variant="outline" className="shrink-0 capitalize">{match.status.replace('_', ' ')}</Badge><span className="text-muted-foreground">{match.explanation}</span></div>}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Candidate evidence allowed for this rewrite</legend>
              <p className="text-xs text-muted-foreground">A listed skill alone is partial evidence. Select only items that genuinely support the wording.</p>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-2">
                {evidence.length ? evidence.map((item) => <label key={item.evidenceId} className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-muted/50">
                  <Checkbox checked={selectedEvidenceIds.has(item.evidenceId)} onCheckedChange={() => toggleEvidence(item.evidenceId)} aria-label={`Use ${evidenceLabel(item)} as evidence`} />
                  <span className="min-w-0 text-sm"><span className="block font-medium">{evidenceLabel(item)}</span><span className="block line-clamp-2 text-xs text-muted-foreground">{item.category} · {item.description}</span></span>
                </label>) : <p className="p-2 text-sm text-muted-foreground">Add truthful CV experience, project, education, activity or skills evidence first.</p>}
              </div>
            </fieldset>

            <div className="space-y-2"><Label htmlFor="assistant-bullet-instruction">Additional instruction</Label><Textarea id="assistant-bullet-instruction" value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={3} maxLength={2_000} /></div>
            <Button onClick={() => void requestSuggestion()} disabled={state === 'pending' || !instruction.trim() || selectedEvidence.length === 0}><Send className="h-4 w-4" />{state === 'pending' ? 'Preparing suggestion…' : suggestion ? 'Regenerate suggestion' : 'Request suggestion'}</Button>
            {error && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}<Button className="mt-2" size="sm" variant="outline" onClick={() => void requestSuggestion()}>Retry</Button></div>}

            {currentSuggestion && state !== 'rejected' && <section aria-labelledby="cv-suggestion-heading" className="space-y-4 rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 id="cv-suggestion-heading" className="font-medium">Suggested for review</h3><Badge variant="secondary" className="capitalize">{currentSuggestion.confidence} confidence</Badge></div>
              <div className="grid gap-3 sm:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Original</p><p className="mt-1 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{currentSuggestion.originalText}</p></div><div><Label htmlFor="assistant-edited-proposal" className="text-xs uppercase tracking-wide text-muted-foreground">Proposed — editable</Label><Textarea id="assistant-edited-proposal" className="mt-1 min-h-28" value={editedText} onChange={(event) => setEditedText(event.target.value)} /></div></div>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Requirement addressed</p><p className="mt-1 text-sm">{requirement?.text}</p></div>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence used</p><ul className="mt-1 space-y-1 text-sm">{selectedEvidence.filter((item) => currentSuggestion.evidenceIds.includes(item.evidenceId)).map((item) => <li key={item.evidenceId}>[{item.evidenceId}] {evidenceLabel(item)}</li>)}</ul></div>
              <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Why this was suggested</p><p className="mt-1 text-sm text-muted-foreground">{currentSuggestion.rationale}</p></div>
              {(currentSuggestion.unsupportedClaims.length > 0 || currentSuggestion.warnings.length > 0) && <div role="alert" className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm"><p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" />Review required</p><ul className="mt-2 list-disc space-y-1 pl-5">{[...currentSuggestion.unsupportedClaims, ...currentSuggestion.warnings].map((warning) => <li key={warning}>{warning}</li>)}</ul>{!safeToAccept && <p className="mt-2 font-medium">Edit or regenerate this wording before it can be accepted.</p>}</div>}
              <div className="flex flex-wrap gap-2"><Button size="sm" onClick={accept} disabled={!safeToAccept}><Check className="h-4 w-4" />Apply to draft</Button><Button size="sm" variant="outline" onClick={() => setState('rejected')}><X className="h-4 w-4" />Reject</Button><Button size="sm" variant="ghost" onClick={() => void requestSuggestion()} disabled={state === 'pending'}><RotateCcw className="h-4 w-4" />Regenerate</Button></div>
            </section>}
            {state === 'rejected' && <div role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">Suggestion rejected. Your CV was not changed.<Button size="sm" variant="outline" className="mt-2" onClick={() => setState('idle')}>Review again</Button></div>}
            {state === 'accepted' && <div role="status" className="rounded-lg border bg-muted/40 p-3 text-sm">Suggestion applied to your draft, but not saved yet.<Button size="sm" variant="outline" className="mt-2" onClick={() => { onUndo(); setState('idle'); }}><RotateCcw className="h-4 w-4" />Undo AI change</Button></div>}
          </>}
      </CardContent>
    </Card>
    <Card><CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4 text-info" />Tips for {activeSection}</CardTitle></CardHeader><CardContent><ul className="space-y-2">{(tips ?? []).map((tip) => <li key={tip} className="text-sm text-muted-foreground">• {tip}</li>)}</ul></CardContent></Card>
  </div>;
}
