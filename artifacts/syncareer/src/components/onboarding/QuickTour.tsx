import { useEffect, useLayoutEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export type TourStep = {
  selector: string;
  title: string;
  body: string;
};

interface QuickTourProps {
  userId: string;
  steps: TourStep[];
  /**
   * Source of truth from the user's profile row. When `true`, the tour will
   * never show. When `false` (or `null` if the column hasn't been migrated
   * yet), the tour is eligible to show. Falls back to a localStorage flag for
   * resilience while the migration is rolling out.
   */
  profileTourCompleted: boolean | null | undefined;
  onCompleted?: () => void;
}

const PADDING = 8;
const TOOLTIP_WIDTH = 340;

export const tourCompletedKey = (uid: string) => `syncareer:tour-completed:${uid}`;

async function persistTourCompleted(userId: string) {
  try {
    localStorage.setItem(tourCompletedKey(userId), '1');
  } catch {
    // ignore (private mode, quota)
  }
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ tour_completed: true })
      .eq('id', userId);
    if (error) {
      // If the column hasn't been migrated yet the localStorage fallback
      // above still prevents the tour from re-appearing in this browser.
      console.warn('Failed to persist tour_completed to profile:', error);
    }
  } catch (err) {
    console.warn('Unexpected error persisting tour_completed:', err);
  }
}

export function QuickTour({
  userId,
  steps,
  profileTourCompleted,
  onCompleted,
}: QuickTourProps) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // Decide whether to show: profile is the source of truth; localStorage is a
  // best-effort fallback while the migration rolls out.
  useEffect(() => {
    if (profileTourCompleted === true) {
      setActive(false);
      return;
    }
    let localCompleted = false;
    try {
      localCompleted = !!localStorage.getItem(tourCompletedKey(userId));
    } catch {
      // ignore
    }
    setActive(!localCompleted);
  }, [profileTourCompleted, userId]);

  const step = steps[stepIndex];

  useLayoutEffect(() => {
    if (!active || !step) return;
    let cancelled = false;
    let attempts = 0;

    const measure = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
        if (r.top < 100 || r.bottom > window.innerHeight - 100) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => {
            if (!cancelled) setRect(el.getBoundingClientRect());
          }, 350);
        }
      } else if (attempts < 20) {
        attempts++;
        setTimeout(() => {
          if (!cancelled) measure();
        }, 100);
      } else {
        setRect(null);
      }
    };

    measure();
    const onChange = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) setRect(el.getBoundingClientRect());
    };
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [active, stepIndex, step]);

  const finish = async () => {
    setActive(false);
    await persistTourCompleted(userId);
    onCompleted?.();
  };

  const next = () => {
    if (stepIndex < steps.length - 1) setStepIndex((i) => i + 1);
    else void finish();
  };

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        void finish();
      } else if (e.key === 'Enter') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;
        e.preventDefault();
        next();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex]);

  if (!active || !step) return null;

  let tooltipStyle: React.CSSProperties;
  if (rect) {
    const spaceBelow = window.innerHeight - rect.bottom;
    const showBelow = spaceBelow > 220 || rect.top < 220;
    const top = showBelow ? rect.bottom + 14 : rect.top - 14;
    let left = rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - TOOLTIP_WIDTH - 12));
    tooltipStyle = {
      position: 'fixed',
      top,
      left,
      width: TOOLTIP_WIDTH,
      transform: showBelow ? 'none' : 'translateY(-100%)',
      zIndex: 1001,
    };
  } else {
    tooltipStyle = {
      position: 'fixed',
      top: '50%',
      left: '50%',
      width: TOOLTIP_WIDTH,
      transform: 'translate(-50%, -50%)',
      zIndex: 1001,
    };
  }

  return (
    <div className="fixed inset-0 z-[1000]" aria-live="polite">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-primary/70 transition-all"
          style={{
            top: rect.top - PADDING,
            left: rect.left - PADDING,
            width: rect.width + PADDING * 2,
            height: rect.height + PADDING * 2,
            boxShadow: '0 0 0 9999px rgba(20, 20, 20, 0.55)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/55" />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick tour"
        style={tooltipStyle}
        className="bg-[#FAF6EE] text-foreground rounded-2xl shadow-[0_30px_60px_-20px_rgba(20,20,20,0.45)] ring-1 ring-black/[0.06] p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="text-[11px] uppercase tracking-[0.2em] text-foreground/50">
            Quick tour · {stepIndex + 1} of {steps.length}
          </div>
          <button
            type="button"
            onClick={() => void finish()}
            aria-label="Skip tour"
            className="text-foreground/40 hover:text-foreground/80 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 className="font-serif text-2xl leading-tight tracking-[-0.01em] mb-2">
          {step.title}
        </h3>
        <p className="text-sm text-foreground/70 leading-relaxed">{step.body}</p>
        <div className="flex items-center justify-between gap-3 pt-5">
          <button
            type="button"
            onClick={() => void finish()}
            className="text-xs text-foreground/50 hover:text-foreground/80 transition"
          >
            Skip tour
          </button>
          <Button
            onClick={next}
            className="rounded-full px-5 h-9 bg-foreground text-background hover:bg-foreground/90 text-sm"
          >
            {stepIndex < steps.length - 1 ? 'Next' : 'Got it'}
          </Button>
        </div>
      </div>
    </div>
  );
}

const STUDENT_STEPS: TourStep[] = [
  {
    selector: '[data-tour="student-assessment"]',
    title: 'Start with the assessment',
    body: 'A quick 5-minute quiz surfaces career paths that genuinely fit your strengths and interests.',
  },
  {
    selector: '[data-tour="student-cv"]',
    title: 'Build an ATS-ready CV',
    body: 'Drop in your details and we’ll shape a CV recruiters and applicant tracking systems both love.',
  },
  {
    selector: '[data-tour="student-interview"]',
    title: 'Practice your interview',
    body: 'Run a mock interview with our AI coach and get specific, kind feedback before the real thing.',
  },
];

const COUNSELLOR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="counsellor-edit"]',
    title: 'Polish your profile',
    body: 'Open your profile to add a bio, specialism, and session price — clients read these before booking.',
  },
  {
    selector: '[data-tour="counsellor-bio"]',
    title: 'Tell your story',
    body: 'A short, warm bio and a clear specialism help the right students choose you.',
  },
  {
    selector: '[data-tour="counsellor-price"]',
    title: 'Set your session price',
    body: 'Pick a price per session. You can revisit this whenever you like as your practice grows.',
  },
];

export function getStepsForRole(role: string | null | undefined): TourStep[] {
  if (role === 'career_counsellor') return COUNSELLOR_STEPS;
  return STUDENT_STEPS;
}
