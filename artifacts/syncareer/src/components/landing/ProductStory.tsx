import { useEffect, useRef, useState } from 'react';
import { Check, ChevronRight, Circle, ShieldCheck } from 'lucide-react';
import ProductDemo, { DEMO_STEPS, type DemoStep } from './ProductDemo';

const storySteps: Array<{ id: DemoStep; eyebrow: string; title: string; copy: string }> = [
  { id: 'opportunity', eyebrow: '01 · Start with a real opportunity', title: 'Keep the source, role, and requirements in view.', copy: 'Inspect the original listing, organisation, location, level, and known deadline before you decide whether the role is worth pursuing.' },
  { id: 'evidence', eyebrow: '02 · Compare it with what you can prove', title: 'Build evidence without filling gaps with fiction.', copy: 'Match requirements to project evidence or coursework, see what still needs support, and keep generated wording separate from facts you supplied.' },
  { id: 'interview', eyebrow: '03 · Prepare around that role', title: 'Use the same opportunity context when you practise.', copy: 'Interview preparation stays connected to the saved role, so your practice has a reason and a reference point.' },
  { id: 'application', eyebrow: '04 · Know what to do next', title: 'Record the next action, then the outcome.', copy: 'Track the stage, follow-up, and eventual outcome deliberately. The application record remembers what you chose to record.' },
];

export default function ProductStory() {
  const [activeStep, setActiveStep] = useState<DemoStep>('opportunity');
  const stepRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    if (!('IntersectionObserver' in window)) return undefined;
    const observers = stepRefs.current.map((element) => {
      if (!element) return null;
      const observer = new IntersectionObserver(([entry]) => { if (entry?.isIntersecting) setActiveStep(entry.target.getAttribute('data-step') as DemoStep); }, { rootMargin: '-35% 0px -45% 0px', threshold: 0 });
      observer.observe(element);
      return observer;
    });
    return () => observers.forEach((observer) => observer?.disconnect());
  }, []);

  return <>
    <section id="product" className="scroll-mt-24 border-b bg-background" aria-labelledby="journey-title">
      <div className="mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="mb-12 max-w-2xl lg:mb-16"><p className="eyebrow text-primary">The application journey</p><h2 id="journey-title" className="mt-3 text-balance text-3xl font-semibold tracking-[-0.045em] sm:text-4xl lg:text-5xl">The role stays connected from first look to next action.</h2><p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">One working record carries the opportunity context through evidence, preparation, and the decisions you make after applying.</p></div>
        <div className="grid gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
          <div className="relative"><div className="absolute left-[11px] top-3 hidden h-[calc(100%-24px)] w-px bg-border lg:block" aria-hidden="true" /><div className="space-y-8 lg:space-y-12">{storySteps.map((step, index) => <article key={step.id} data-step={step.id} ref={(node) => { stepRefs.current[index] = node; }} className={`relative pl-9 transition-opacity duration-300 motion-reduce:transition-none ${activeStep === step.id ? 'opacity-100' : 'opacity-55 hover:opacity-90'}`}><button type="button" onClick={() => setActiveStep(step.id)} className="group block text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"><span className={`absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background text-[10px] font-bold ${activeStep === step.id ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`} aria-hidden="true">{activeStep === step.id ? <Check className="h-3 w-3" /> : String(index + 1).padStart(2, '0')}</span><p className="eyebrow text-primary">{step.eyebrow}</p><h3 className="mt-2 max-w-md text-xl font-semibold tracking-tight group-hover:text-primary sm:text-2xl">{step.title}</h3><p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground sm:text-base">{step.copy}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">View this application state <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" /></span></button></article>)}</div></div>
          <div className="lg:sticky lg:top-24 lg:self-start"><ProductDemo activeStep={activeStep} onStepChange={setActiveStep} autoProgress={false} idPrefix="journey-demo" /><p className="mt-3 text-center text-xs text-muted-foreground">Illustrative product state. The source, evidence, and next action are examples, not a live record.</p></div>
        </div>
      </div>
    </section>

    <section id="method" className="scroll-mt-24 border-b bg-secondary/25" aria-labelledby="method-title"><div className="mx-auto w-full max-w-[1400px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24"><div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20"><div><div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" /><p className="eyebrow text-primary">A product contract</p></div><h2 id="method-title" className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">We tell you what&apos;s real and what&apos;s a suggestion.</h2><p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">Syncareer supports your judgement; it does not replace it. The interface keeps provenance, guidance, and user decisions distinct.</p></div><div className="divide-y border-y"><LedgerRow label="External opportunity source" status="Recorded" tone="recorded" /><LedgerRow label="Your supplied CV evidence" status="Recorded" tone="recorded" /><LedgerRow label="Application stage and outcome" status="User controlled" tone="controlled" /><LedgerRow label="Job-fit and interview suggestions" status="Guidance" tone="guidance" /><LedgerRow label="Independent verification, ATS success, or guaranteed outcome" status="Not claimed" tone="not-claimed" /></div></div></div></section>
  </>;
}

function LedgerRow({ label, status, tone }: { label: string; status: string; tone: 'recorded' | 'controlled' | 'guidance' | 'not-claimed' }) {
  const toneClass = { recorded: 'text-success', controlled: 'text-primary', guidance: 'text-foreground', 'not-claimed': 'text-muted-foreground' }[tone];
  return <div className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-6"><div className="flex items-center gap-2 text-sm font-medium"><Circle className={`h-2.5 w-2.5 fill-current ${toneClass}`} aria-hidden="true" />{label}</div><span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${toneClass}`}><span aria-hidden="true">{tone === 'not-claimed' ? '—' : '✓'}</span>{status}</span></div>;
}

export { DEMO_STEPS };
