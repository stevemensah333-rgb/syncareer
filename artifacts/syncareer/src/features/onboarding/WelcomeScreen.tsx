import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { OnboardingShell } from './OnboardingShell';

interface WelcomeScreenProps {
  firstName: string;
  userType: string;
  onContinue: () => void;
}

export function WelcomeScreen({
  firstName,
  userType,
  onContinue,
}: WelcomeScreenProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const greetingName = firstName ? `, ${firstName}` : '';
  const benefits =
    userType === 'career_counsellor'
      ? [
          'Set up your practice and accept bookings',
          'Run sessions with built-in scheduling',
          'Build your reputation through ratings',
        ]
      : [
          'A 5-minute assessment to surface careers that fit',
          'An ATS-ready CV and an AI interview coach',
          'Real jobs, mentors, and a community to grow with',
        ];

  useEffect(() => {
    buttonRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        const target = e.target as HTMLElement | null;
        const tag = target?.tagName;
        if (
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT' ||
          target?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onContinue]);

  return (
    <OnboardingShell
      eyebrow="Welcome to Syncareer"
      title={`Glad you're here${greetingName}`}
      italicWord="here"
      subtitle="Take a moment — here's what's waiting for you on the other side of setup."
    >
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-[0_20px_60px_-30px_rgba(20,20,20,0.25)] ring-1 ring-black/[0.04] p-6 sm:p-10">
        <ul className="space-y-5">
          {benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-4">
              <span className="mt-1 flex h-7 w-7 flex-none items-center justify-center rounded-full bg-primary/10 font-serif text-sm text-primary">
                {i + 1}
              </span>
              <span className="text-foreground/80 leading-relaxed text-base">
                {b}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4 pt-8">
          <span className="text-xs text-foreground/50 hidden sm:inline">
            Tip: press Enter to continue
          </span>
          <Button
            ref={buttonRef}
            onClick={onContinue}
            className="rounded-full px-8 h-12 bg-foreground text-background hover:bg-foreground/90 ml-auto"
          >
            Let's go
          </Button>
        </div>
      </div>
    </OnboardingShell>
  );
}
