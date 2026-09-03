import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Lightbulb, Loader2, RotateCcw, Send, X, Sparkles } from 'lucide-react';
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
  targetFieldPath?: string;
  onClose?: () => void;
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
  targetFieldPath,
  onClose,
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

  const [selectedPath, setSelectedPath] = useState(targetFieldPath || '');
  useEffect(() => {
    if (targetFieldPath) setSelectedPath(targetFieldPath);
  }, [targetFieldPath]);

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

  return (
    <div className="space-y-4">
      <Card className="border-border bg-card shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Job-specific bullet suggestion
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 rounded-control text-muted-foreground">
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {opportunityLoading ? (
            <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Loading the selected opportunity…
            </p>
          ) : opportunityError ? (
            <div role="alert" className="rounded-surface border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
              {opportunityError}
            </div>
          ) : !opportunity ? (
            <div className="rounded-surface border border-border bg-muted/40 p-3 text-xs space-y-2">
              <p className="font-medium text-foreground">Choose an opportunity before requesting AI wording.</p>
              <p className="text-muted-foreground leading-relaxed">
                Job-specific guidance needs a real role and candidate evidence; generic CV prompts are disabled here.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-1 rounded-control text-xs">
                <Link to="/opportunities">Choose an opportunity</Link>
              </Button>
            </div>
          ) : requirements.length === 0 ? (
            <div role="status" className="rounded-surface border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              No meaningful candidate requirement could be extracted from this posting. Confirm the original source before tailoring your CV.
            </div>
          ) : !bullets.length ? (
            <p className="text-xs text-muted-foreground">
              Open Experience, Projects or Activities and enter a bullet before requesting a rewrite.
            </p>
          ) : (
            <>
              <div className="rounded-surface border border-primary/20 bg-primary/5 p-3 text-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">Active context</p>
                <p className="mt-0.5 font-medium text-foreground">{opportunity.title}{opportunity.organisation ? ` · ${opportunity.organisation}` : ''}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">Only the selected requirement and evidence below will be sent.</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assistant-cv-bullet" className="text-xs font-medium">Original bullet</Label>
                <Select value={selected?.path ?? ''} onValueChange={setSelectedPath}>
                  <SelectTrigger id="assistant-cv-bullet" className="rounded-input text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-overlay">
                    {bullets.map((bullet) => (
                      <SelectItem key={bullet.path} value={bullet.path} className="text-xs">
                        {bullet.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selected && (
                  <p className="rounded-surface border border-border bg-secondary/40 p-2.5 text-xs text-foreground">
                    {selected.value}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assistant-requirement" className="text-xs font-medium">Requirement to address</Label>
                <Select value={requirement?.requirementId ?? ''} onValueChange={setRequirementId}>
                  <SelectTrigger id="assistant-requirement" className="rounded-input text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-overlay">
                    {requirements.map((item) => (
                      <SelectItem key={item.requirementId} value={item.requirementId} className="text-xs">
                        {item.text}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {match && (
                  <div className="flex items-start gap-2 rounded-surface border border-border bg-card p-2.5 text-xs">
                    <Badge variant="outline" className="shrink-0 rounded-control capitalize text-[11px]">
                      {match.status.replace('_', ' ')}
                    </Badge>
                    <span className="text-muted-foreground leading-relaxed">{match.explanation}</span>
                  </div>
                )}
              </div>

              <fieldset className="space-y-2">
                <legend className="text-xs font-medium text-foreground">Candidate evidence allowed for this rewrite</legend>
                <p className="text-[11px] text-muted-foreground">
                  Select only items that genuinely support the wording without introducing ungrounded claims.
                </p>
                <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-surface border border-border p-2">
                  {evidence.length ? (
                    evidence.map((item) => (
                      <label key={item.evidenceId} className="flex cursor-pointer items-start gap-2.5 rounded-control p-1.5 hover:bg-secondary/60 transition-colors">
                        <Checkbox
                          checked={selectedEvidenceIds.has(item.evidenceId)}
                          onCheckedChange={() => toggleEvidence(item.evidenceId)}
                          aria-label={`Use ${evidenceLabel(item)} as evidence`}
                          className="mt-0.5"
                        />
                        <span className="min-w-0 text-xs">
                          <span className="block font-medium text-foreground">{evidenceLabel(item)}</span>
                          <span className="block line-clamp-1 text-[11px] text-muted-foreground">{item.category} · {item.description}</span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="p-2 text-xs text-muted-foreground">Add truthful CV experience, project, education, activity or skills evidence first.</p>
                  )}
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="assistant-bullet-instruction" className="text-xs font-medium">Additional instruction</Label>
                <Textarea
                  id="assistant-bullet-instruction"
                  value={instruction}
                  onChange={(event) => setInstruction(event.target.value)}
                  rows={2}
                  maxLength={2_000}
                  className="rounded-input text-xs"
                />
              </div>

              <Button
                onClick={() => void requestSuggestion()}
                disabled={state === 'pending' || !instruction.trim() || selectedEvidence.length === 0}
                className="w-full rounded-control"
              >
                {state === 'pending' ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Preparing suggestion…
                  </>
                ) : (
                  <>
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    {suggestion ? 'Regenerate suggestion' : 'Request suggestion'}
                  </>
                )}
              </Button>

              {error && (
                <div role="alert" className="rounded-surface border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive space-y-2">
                  <p>{error}</p>
                  <Button size="sm" variant="outline" className="rounded-control" onClick={() => void requestSuggestion()}>
                    Retry
                  </Button>
                </div>
              )}

              {currentSuggestion && state !== 'rejected' && (
                <section aria-labelledby="cv-suggestion-heading" className="space-y-3.5 rounded-surface border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 id="cv-suggestion-heading" className="text-xs font-semibold uppercase tracking-wider text-foreground">
                      Suggested for review
                    </h3>
                    <Badge variant="secondary" className="rounded-control capitalize text-[11px]">
                      {currentSuggestion.confidence} confidence
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Original</p>
                      <p className="mt-1 whitespace-pre-wrap rounded-surface bg-secondary/50 p-2.5 text-xs text-foreground">
                        {currentSuggestion.originalText}
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="assistant-edited-proposal" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Proposed — editable
                      </Label>
                      <Textarea
                        id="assistant-edited-proposal"
                        className="mt-1 min-h-[70px] rounded-input text-xs"
                        value={editedText}
                        onChange={(event) => setEditedText(event.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Requirement addressed</p>
                    <p className="mt-0.5 text-xs text-foreground">{requirement?.text}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Evidence used</p>
                    <ul className="mt-0.5 space-y-0.5 text-xs text-foreground">
                      {selectedEvidence.filter((item) => currentSuggestion.evidenceIds.includes(item.evidenceId)).map((item) => (
                        <li key={item.evidenceId}>[{item.evidenceId}] {evidenceLabel(item)}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Why this was suggested</p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{currentSuggestion.rationale}</p>
                  </div>
                  {(currentSuggestion.unsupportedClaims.length > 0 || currentSuggestion.warnings.length > 0) && (
                    <div role="alert" className="rounded-surface border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground space-y-1.5">
                      <p className="flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                        Review required
                      </p>
                      <ul className="list-disc space-y-0.5 pl-4 text-[11px]">
                        {[...currentSuggestion.unsupportedClaims, ...currentSuggestion.warnings].map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                      {!safeToAccept && <p className="font-medium">Edit or regenerate this wording before it can be accepted.</p>}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={accept} disabled={!safeToAccept} className="rounded-control text-xs">
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Apply to draft
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setState('rejected')} className="rounded-control text-xs">
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Reject
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void requestSuggestion()} disabled={state === 'pending'} className="rounded-control text-xs">
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Regenerate
                    </Button>
                  </div>
                </section>
              )}

              {state === 'rejected' && (
                <div role="status" className="rounded-surface border border-border bg-muted/40 p-3 text-xs text-muted-foreground space-y-2">
                  <p>Suggestion rejected. Your CV was not changed.</p>
                  <Button size="sm" variant="outline" className="rounded-control text-xs" onClick={() => setState('idle')}>
                    Review again
                  </Button>
                </div>
              )}
              {state === 'accepted' && (
                <div role="status" className="rounded-surface border border-success/30 bg-success/10 p-3 text-xs text-foreground space-y-2">
                  <p className="font-medium text-success flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" />
                    Suggestion applied to your draft. Remember to save changes.
                  </p>
                  <Button size="sm" variant="outline" className="rounded-control text-xs" onClick={() => { onUndo(); setState('idle'); }}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Undo AI change
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-none">
        <CardHeader className="pb-2.5">
          <CardTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Lightbulb className="h-3.5 w-3.5 text-info" />
            Tips for {activeSection}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            {(tips ?? []).map((tip) => (
              <li key={tip} className="text-xs text-muted-foreground leading-relaxed flex items-start gap-1.5">
                <span className="text-primary mt-0.5">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
