import { useMemo, useState } from 'react';
import { Bot, Check, Loader2, RotateCcw, Send, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { AssistantRequestError, requestContextualAssistance, type AssistantContextItem, type AssistantProposal, type AssistantTask } from '@/features/contextual-assistant/contract';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import type { AssistantTask as AnalyticsAssistantTask } from '@/services/analyticsEvents';

interface Props {
  task: AssistantTask;
  title?: string;
  description: string;
  context: AssistantContextItem[];
  suggestedPrompt?: string;
  /** Return false when the proposal cannot safely be applied. */
  onAccept?: (text: string) => boolean | void;
  onUndo?: () => void;
  acceptLabel?: string;
}

export function ContextualAssistantDrawer({ task, title = 'Ask Syncareer', description, context, suggestedPrompt = '', onAccept, onUndo, acceptLabel = 'Accept proposal' }: Props) {
  const available = useMemo(() => context.filter((item) => item.content.trim()), [context]);
  const [included, setIncluded] = useState(() => new Set(available.map((item) => item.id)));
  const [instruction, setInstruction] = useState(suggestedPrompt);
  const [proposal, setProposal] = useState<AssistantProposal | null>(null);
  const [rejected, setRejected] = useState<AssistantProposal | null>(null);
  const [accepted, setAccepted] = useState<AssistantProposal | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = available.filter((item) => included.has(item.id));

  const toggleContext = (item: AssistantContextItem) => {
    if (!item.optional) return;
    setIncluded((current) => {
      const next = new Set(current);
      next.has(item.id) ? next.delete(item.id) : next.add(item.id);
      return next;
    });
  };

  const send = async () => {
    if (!instruction.trim() || pending) return;
    setPending(true); setError(null); setProposal(null); setRejected(null); setAccepted(null);
    try { setProposal(await requestContextualAssistance(task, instruction, selected)); }
    catch (cause) { setError(cause instanceof AssistantRequestError ? cause.message : 'The assistant request failed. Nothing was changed.'); }
    finally { setPending(false); }
  };

  const emitDecided = (decision: 'accepted' | 'rejected' | 'undone') => {
    try {
      captureProductEvent(ANALYTICS_EVENTS.CONTEXTUAL_AI_DECIDED, {
        task: task as AnalyticsAssistantTask,
        decision,
      });
    } catch { /* analytics must never break product */ }
  };

  return (
    <Sheet>
      <SheetTrigger asChild><Button variant="outline" size="sm"><Bot className="h-4 w-4" />{title}</Button></SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
        <SheetHeader><SheetTitle>{title}</SheetTitle><SheetDescription>{description}</SheetDescription></SheetHeader>
        <div className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
          <section aria-labelledby="context-heading"><h3 id="context-heading" className="text-sm font-medium">Context being sent</h3><p className="mt-1 text-xs text-muted-foreground">Only the selected items below are included. Optional personal context can be removed before sending.</p><div className="mt-2 flex flex-wrap gap-2">{available.length ? available.map((item) => <button key={item.id} type="button" onClick={() => toggleContext(item)} disabled={!item.optional} aria-pressed={included.has(item.id)} aria-label={`${included.has(item.id) ? 'Remove' : 'Include'} ${item.label} context`}><Badge variant={included.has(item.id) ? 'default' : 'outline'} className="gap-1">[{item.label}]{item.optional && included.has(item.id) && <X className="h-3 w-3" />}</Badge></button>) : <span className="text-sm text-muted-foreground">No context is available.</span>}</div></section>
          <div className="space-y-2"><Label htmlFor={`assistant-${task}`}>What should the assistant help with?</Label><Textarea id={`assistant-${task}`} value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={5} /><Button onClick={() => void send()} disabled={pending || !instruction.trim() || selected.length === 0}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{pending ? 'Preparing proposal…' : 'Request proposal'}</Button></div>
          {error && <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}<div className="mt-2"><Button variant="outline" size="sm" onClick={() => void send()}>Retry</Button></div></div>}
          {proposal && <section className="rounded-lg border bg-card p-4" aria-labelledby="proposal-heading"><h3 id="proposal-heading" className="font-medium">Proposal</h3><p className="mt-2 whitespace-pre-wrap text-sm">{proposal.text}</p><p className="mt-3 text-xs text-muted-foreground">Review this against your source material. Nothing changes automatically.</p><div className="mt-3 flex flex-wrap gap-2">{onAccept && <Button size="sm" onClick={() => { try { if (onAccept(proposal.text) === false) { setError('The proposal could not be applied. Nothing was changed.'); return; } emitDecided('accepted'); setAccepted(proposal); setProposal(null); } catch { setError('The proposal could not be applied. Nothing was changed.'); } }}><Check className="h-4 w-4" />{acceptLabel}</Button>}<Button size="sm" variant="outline" onClick={() => { setRejected(proposal); setProposal(null); emitDecided('rejected'); }}>Reject</Button></div></section>}
          {(rejected || accepted) && <div role="status" className="rounded-lg border bg-muted p-3 text-sm"><p>{accepted ? 'Proposal accepted. You can undo this assistant action.' : 'Proposal rejected. No content was changed.'}</p><Button className="mt-2" variant="outline" size="sm" onClick={() => { if (accepted) onUndo?.(); const previous = accepted ?? rejected; setProposal(previous); setAccepted(null); setRejected(null); emitDecided('undone'); }}><RotateCcw className="h-4 w-4" />Undo</Button></div>}
        </div>
      </SheetContent>
    </Sheet>
  );
}
