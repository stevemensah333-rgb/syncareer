import { useEffect, useRef } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { OnboardingShell } from './OnboardingShell';
import type { OnboardingRole } from './constants';

interface WelcomeScreenProps {
  firstName: string;
  userType: OnboardingRole;
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
          'Create the contact profile students see when they book',
          'Manage your mentor profile, request capacity and introductions',
          'Keep client and session information in one workspace',
        ]
      : [
          'Save real opportunities and continue each application',
          'Build and maintain your primary CV',
          'Prepare for interviews and record application progress',
        ];

  useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <OnboardingShell
      eyebrow="Welcome to Syncareer"
      title={`Let’s set up your workspace${greetingName}`}
      subtitle="Add the essentials now so your next screen is useful from the start."
      currentStep={1}
      totalSteps={2}
    >
      <Card>
        <CardContent className="p-5 sm:p-6">
          <h2 className="text-base font-semibold">What you can do in Syncareer</h2>
          <ul className="mt-4 divide-y" aria-label="Syncareer workspace features">
            {benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-md bg-success/10 text-success">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="text-sm leading-6 text-foreground">{benefit}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end border-t pt-5">
            <Button ref={buttonRef} onClick={onContinue} className="gap-2">
              Continue to profile
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </OnboardingShell>
  );
}
