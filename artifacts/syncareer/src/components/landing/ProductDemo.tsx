import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ArrowUpRight, Bookmark, Check, Circle, FileCheck2, Mic2, TimerReset } from 'lucide-react';

export const DEMO_STEPS = [
  { id: 'opportunity', label: 'Opportunity' },
  { id: 'evidence', label: 'Evidence & CV' },
  { id: 'interview', label: 'Interview' },
  { id: 'application', label: 'Next action' },
] as const;

export type DemoStep = (typeof DEMO_STEPS)[number]['id'];

interface ProductDemoProps {
  activeStep?: DemoStep;
  onStepChange?: (step: DemoStep) => void;
  autoProgress?: boolean;
  showStageControls?: boolean;
  className?: string;
  idPrefix?: string;
}

function OpportunityPanel() {
  return <div className="space-y-5" aria-label="Opportunity details">
    <div className="flex items-start justify-between gap-4">
      <div><p className="eyebrow">External source · original link available</p><h3 className="mt-2 text-xl font-semibold tracking-tight">Graduate Data Analyst</h3><p className="mt-1 text-sm text-muted-foreground">Example organisation · Accra · Entry level</p></div>
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><Bookmark className="h-3.5 w-3.5" aria-hidden="true" /> Saved</span>
    </div>
    <dl className="grid gap-4 border-y py-4 sm:grid-cols-3"><div><dt className="eyebrow">Source</dt><dd className="mt-1 text-sm font-medium">External listing</dd></div><div><dt className="eyebrow">Deadline</dt><dd className="mt-1 text-sm font-medium">Not provided</dd></div><div><dt className="eyebrow">Listed skills</dt><dd className="mt-1 text-sm font-medium">SQL · reporting</dd></div></dl>
    <div className="flex items-center gap-2 text-sm font-medium text-primary"><ArrowUpRight className="h-4 w-4" aria-hidden="true" /> Open original source before applying</div>
  </div>;
}

function EvidencePanel() {
  return <div className="space-y-5" aria-label="Evidence and CV details">
    <div><p className="eyebrow">Same opportunity · evidence check</p><h3 className="mt-2 text-xl font-semibold tracking-tight">Compare the role with what you can prove</h3></div>
    <div className="overflow-hidden rounded-lg border"><div className="grid grid-cols-[1fr_auto] border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><span>Requirement</span><span>Status</span></div><div className="divide-y text-sm"><div className="flex items-center justify-between gap-4 px-4 py-3"><span>SQL</span><span className="inline-flex items-center gap-1.5 font-medium text-success"><Check className="h-4 w-4" aria-hidden="true" /> Project evidence</span></div><div className="flex items-center justify-between gap-4 px-4 py-3"><span>Python</span><span className="inline-flex items-center gap-1.5 font-medium text-success"><Check className="h-4 w-4" aria-hidden="true" /> Coursework</span></div><div className="flex items-center justify-between gap-4 px-4 py-3"><span>AWS</span><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Circle className="h-3 w-3" aria-hidden="true" /> Add evidence</span></div></div></div>
    <p className="text-xs leading-5 text-muted-foreground"><FileCheck2 className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" /> User-provided evidence stays distinct from generated wording.</p>
  </div>;
}

function InterviewPanel() {
  return <div className="space-y-5" aria-label="Interview preparation details">
    <div><p className="eyebrow">Same opportunity · practice context</p><h3 className="mt-2 text-xl font-semibold tracking-tight">Prepare around the role you saved</h3></div>
    <blockquote className="border-l-2 border-primary pl-4 text-base leading-7">Tell me about a time you found and resolved a data-quality problem.</blockquote>
    <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-muted/60 p-4"><p className="eyebrow">Practice rubric</p><p className="mt-2 text-sm font-semibold">Relevance · specificity · evidence</p></div><div className="rounded-lg border p-4"><p className="eyebrow">Context</p><p className="mt-2 text-sm font-semibold">Graduate Data Analyst</p></div></div>
    <p className="text-xs leading-5 text-muted-foreground"><Mic2 className="mr-1 inline h-3.5 w-3.5 text-primary" aria-hidden="true" /> Practice guidance may be incomplete or inaccurate; it is not an employer assessment.</p>
  </div>;
}

function ApplicationPanel() {
  return <div className="space-y-5" aria-label="Next action details">
    <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Same opportunity · application workspace</p><h3 className="mt-2 text-xl font-semibold tracking-tight">Graduate Data Analyst</h3><p className="mt-1 text-sm text-muted-foreground">Example organisation</p></div><span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Applied</span></div>
    <div className="rounded-lg border border-warning/30 bg-warning/5 p-4"><p className="eyebrow text-warning">Recorded next action</p><p className="mt-2 font-semibold">Follow up on the application</p><p className="mt-1 text-sm text-muted-foreground">Due Friday · recorded by the user</p></div>
    <div className="flex flex-wrap gap-2 text-xs font-medium text-muted-foreground"><span className="rounded-full border px-2.5 py-1">Stage: Interview practice</span><span className="rounded-full border px-2.5 py-1">Outcome: Not recorded</span></div>
    <p className="text-sm leading-6 text-muted-foreground">The CV, interview practice, next action, and eventual outcome remain attached to this application. Syncareer does not infer that an external application was submitted.</p>
  </div>;
}

const PANELS: Record<DemoStep, () => ReactElement> = { opportunity: OpportunityPanel, evidence: EvidencePanel, interview: InterviewPanel, application: ApplicationPanel };

export default function ProductDemo({ activeStep, onStepChange, autoProgress = false, showStageControls = true, className = '', idPrefix = 'demo' }: ProductDemoProps) {
  const [internalStep, setInternalStep] = useState<DemoStep>('opportunity');
  const [isPaused, setIsPaused] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const reducedMotion = useRef(false);
  const active = activeStep ?? internalStep;
  const activeIndex = DEMO_STEPS.findIndex((step) => step.id === active);
  const Panel = PANELS[active];

  useEffect(() => {
    reducedMotion.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }, []);

  useEffect(() => {
    if (!autoProgress || isPaused || reducedMotion.current || document.hidden) return;
    const timer = window.setInterval(() => {
      const next = DEMO_STEPS[(activeIndex + 1) % DEMO_STEPS.length]!.id;
      onStepChange?.(next);
      setInternalStep(next);
    }, 5600);
    const handleVisibility = () => setIsPaused(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [activeIndex, autoProgress, isPaused, onStepChange]);

  const selectStep = (step: DemoStep, userInitiated = false) => {
    if (userInitiated) setIsPaused(true);
    setInternalStep(step);
    onStepChange?.(step);
  };
  const move = (index: number) => {
    const next = DEMO_STEPS[(index + DEMO_STEPS.length) % DEMO_STEPS.length]!.id;
    selectStep(next, true);
    requestAnimationFrame(() => tabRefs.current[(index + DEMO_STEPS.length) % DEMO_STEPS.length]?.focus());
  };

  return <div className={`landing-product-demo w-full overflow-hidden rounded-2xl border bg-card shadow-[0_20px_60px_-32px_hsl(var(--foreground)/0.35)] ${className}`}>
    <div className="flex flex-col gap-3 border-b bg-secondary/70 px-4 py-4 text-secondary-foreground sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><p className="text-sm font-semibold">One application, connected steps</p><p className="mt-0.5 text-xs text-secondary-foreground/70">Illustrative product state — not a live listing or user record</p></div>{autoProgress && <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-secondary-foreground/70"><TimerReset className="h-3.5 w-3.5" aria-hidden="true" /> Slow preview</span>}</div>
    <div className="grid md:grid-cols-[190px_minmax(0,1fr)]">
      {showStageControls && <div id={`${idPrefix}-workflow`} role="tablist" aria-label="Illustrative application journey" aria-orientation="vertical" className="grid grid-cols-2 gap-1 border-b p-2 md:grid-cols-1 md:border-b-0 md:border-r md:p-3">{DEMO_STEPS.map((step, index) => <button key={step.id} ref={(node) => { tabRefs.current[index] = node; }} type="button" role="tab" id={`${idPrefix}-tab-${step.id}`} aria-controls={`${idPrefix}-panel-${step.id}`} aria-selected={active === step.id} tabIndex={active === step.id ? 0 : -1} onClick={() => selectStep(step.id, true)} onKeyDown={(event) => { if (event.key === 'ArrowDown' || event.key === 'ArrowRight') { event.preventDefault(); move(activeIndex + 1); } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') { event.preventDefault(); move(activeIndex - 1); } else if (event.key === 'Home') { event.preventDefault(); move(0); } else if (event.key === 'End') { event.preventDefault(); move(DEMO_STEPS.length - 1); } }} className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none ${active === step.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><span className="mr-2 text-xs opacity-70">0{index + 1}</span>{step.label}</button>)}</div>}
      <div role="tabpanel" id={`${idPrefix}-panel-${active}`} aria-labelledby={`${idPrefix}-tab-${active}`} tabIndex={0} className="min-h-[350px] p-5 transition-[opacity,transform] duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none sm:p-7"><Panel /></div>
    </div>
  </div>;
}
