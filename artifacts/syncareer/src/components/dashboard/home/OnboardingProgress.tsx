import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  done: boolean;
  href: string;
}

export function OnboardingProgress({ steps }: { steps: OnboardingStep[] }) {
  const navigate = useNavigate();
  const doneCount = steps.filter(s => s.done).length;
  const total = steps.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;

  const shouldShow = doneCount < total;
  if (!shouldShow) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px] font-semibold">Setup progress</CardTitle>
          <span className="text-[12px] text-muted-foreground">{doneCount}/{total} complete</span>
        </div>
        <Progress value={percent} className="h-1.5 mt-2" aria-label={`Setup progress: ${doneCount} of ${total} steps complete`} />
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {steps.map(step => (
          <button
            key={step.id}
            onClick={() => navigate(step.href)}
            className="w-full text-left flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            {step.done ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" /> : <Circle className="h-4 w-4 text-muted-foreground shrink-0" />}
            <span className="flex-1 min-w-0">
              <span className={`block text-[13px] ${step.done ? 'text-muted-foreground line-through' : 'font-medium text-foreground'}`}>{step.label}</span>
              <span className="block text-[11px] text-muted-foreground mt-0.5">{step.description}</span>
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
