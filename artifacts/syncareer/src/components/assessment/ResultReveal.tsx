/**
 * Result transition between the last answer and the Career Profile.
 *
 * A short, staged "preparing your Career Profile" moment (progress through
 * the real steps the result page performs), then the profile fades in. The
 * progress is a genuine transition, not a score animation: no numbers count
 * up, no bars grow. Auto-advances on a timer, with an instant skip so the
 * user is never blocked; collapses to instant under reduced motion.
 */
import { useEffect, useState } from 'react';
import { Compass, Lightbulb, Briefcase, LineChart } from 'lucide-react';

const STAGES = [
  { icon: Compass, label: 'Reading your interest themes' },
  { icon: Lightbulb, label: 'Interpreting your work preferences' },
  { icon: Briefcase, label: 'Matching broad career directions' },
  { icon: LineChart, label: 'Connecting current market signals' },
];

export function ResultReveal({ onDone }: { onDone: () => void }) {
  const [stage, setStage] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mql.matches) {
      setReducedMotion(true);
      onDone();
      return;
    }
    if (stage >= STAGES.length - 1) {
      const timer = window.setTimeout(onDone, 350);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setStage((s) => s + 1), 420);
    return () => window.clearTimeout(timer);
  }, [stage, onDone]);

  if (reducedMotion) return null;

  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center space-y-8 text-center"
      role="status"
      aria-live="polite"
    >
      <h2 className="text-2xl font-semibold tracking-tight">Preparing your Career Profile</h2>
      <div className="w-full space-y-3">
        {STAGES.map((item, index) => {
          const Icon = item.icon;
          const done = index < stage;
          const active = index === stage;
          return (
            <div
              key={item.label}
              className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors duration-150 ease-standard ${
                active ? 'border-primary/40 bg-primary/5' : done ? 'border-border bg-card' : 'border-transparent opacity-40'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 ${active || done ? 'text-primary' : 'text-muted-foreground'}`}
                aria-hidden="true"
              />
              <span className={`text-sm ${active ? 'font-medium' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onDone}
        className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Skip to results
      </button>
    </div>
  );
}
