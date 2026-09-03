import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Info, Target, TrendingUp } from 'lucide-react';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import type { CVStrengthResult } from '@/hooks/useCVStrengthScore';
import { LABEL_CONFIG, CATEGORY_LABELS } from '@/features/cv-builder/constants';

interface CVStrengthScoreProps {
  result: CVStrengthResult;
}

export const CVStrengthScore: React.FC<CVStrengthScoreProps> = ({ result }) => {
  const { totalScore, label, completion, breakdown, strengths, suggestions } = result;
  const config = LABEL_CONFIG[label];
  const feedbackModal = useFeedbackModal('cv_strength_score');
  const feedbackTriggeredRef = useRef(false);

  useEffect(() => {
    if (totalScore >= 30 && !feedbackTriggeredRef.current) {
      feedbackTriggeredRef.current = true;
      feedbackModal.triggerFeedback();
    }
  }, [totalScore]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Target className="h-4 w-4 text-primary" aria-hidden="true" />
          CV progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-3" aria-labelledby="cv-completion-heading">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <h3 id="cv-completion-heading" className="text-sm font-semibold text-foreground">Completion</h3>
              <p className="text-xs text-muted-foreground">Meaningful information added</p>
            </div>
            <span className="text-2xl font-bold tabular-nums text-foreground" aria-label={`${completion.percentage}% complete`}>
              {completion.percentage}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="CV completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completion.percentage}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
          <ul className="space-y-2" aria-label="Completion contributions">
            {completion.sections.map((section) => (
              <li key={section.id} className="flex items-start justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-start gap-2">
                  {section.complete ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden="true" />
                  )}
                  <span>
                    <span className="block font-medium text-foreground">{section.label}</span>
                    <span className="block leading-relaxed text-muted-foreground">{section.requirement}</span>
                  </span>
                </span>
                <span className="shrink-0 font-medium tabular-nums text-foreground">
                  {section.score}/{section.max}
                </span>
              </li>
            ))}
          </ul>
          <p className="flex gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            Empty rows, placeholders, generated IDs, template settings and default references do not count.
          </p>
        </section>

        <div className="border-t border-border-subtle" />

        <section className="space-y-3" aria-labelledby="cv-quality-heading">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 id="cv-quality-heading" className="text-sm font-semibold text-foreground">CV quality</h3>
              <p className="text-xs text-muted-foreground">Writing and evidence in completed content</p>
            </div>
            <div className="text-right">
              <span className={`text-xl font-bold tabular-nums ${config.color}`}>{totalScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <Badge variant="secondary" className={`${config.color} rounded-control font-medium`}>
            {totalScore === 0 ? 'Not assessed yet' : label}
          </Badge>
          <div className="space-y-2">
            {Object.entries(breakdown).map(([key, category]) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{CATEGORY_LABELS[key] ?? key}</span>
                <span className="font-medium tabular-nums text-foreground">{category.score}/{category.max}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            This deterministic quality score is guidance, not a prediction or guarantee that an applicant tracking system will accept the CV.
          </p>
        </section>

        {strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              Identified strengths
            </h4>
            <ul className="space-y-1.5">
              {strengths.map((strength) => (
                <li key={strength} className="relative pl-3 text-xs leading-relaxed text-muted-foreground before:absolute before:left-0 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-success">
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5 text-warning" />
              Suggested improvements
            </h4>
            <ul className="space-y-1.5">
              {suggestions.map((suggestion) => (
                <li key={suggestion} className="relative pl-3 text-xs leading-relaxed text-muted-foreground before:absolute before:left-0 before:top-1.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-warning">
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onSubmit={feedbackModal.submitFeedback}
        onDismiss={feedbackModal.dismiss}
      />
    </Card>
  );
};
