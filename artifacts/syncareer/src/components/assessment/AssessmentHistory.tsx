/**
 * Longitudinal view of completed assessments — real persisted rows only.
 *
 * Compares the latest completed assessment with the one before it so the
 * student can see whether their interest themes shifted over time. No
 * historical data is invented: when there is a single assessment the
 * component says so plainly, and anything beyond the latest pair is listed
 * as a dated record.
 */
import { format } from 'date-fns';
import { ArrowDown, ArrowUp, History, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AssessmentResult } from '@/hooks/useAssessment';
import { compareAssessments, type AssessmentComparison } from '@/features/assessment/careerProfile';

interface Props {
  results: AssessmentResult[];
}

export function AssessmentHistory({ results }: Props) {
  if (results.length === 0) return null;
  const latest = results[0]!;
  const previous = results[1] ?? null;
  const comparison: AssessmentComparison | null = previous
    ? compareAssessments(latest, previous)
    : null;
  const older = results.slice(2);

  return (
    <Card>
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold">How your interests have moved</h2>
        </div>

        {!comparison ? (
          <p className="text-sm text-muted-foreground">
            This is your first completed assessment. Take it again after gaining experience and
            you will be able to see whether your interest themes change over time.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">
                Latest · {format(new Date(comparison.latestDate), 'MMM d, yyyy')}
              </Badge>
              <span>compared with</span>
              <Badge variant="outline">
                {format(new Date(comparison.previousDate), 'MMM d, yyyy')}
              </Badge>
            </div>

            {comparison.topThreeStable ? (
              <p className="text-sm">
                Your top three interest themes are the same as last time, in the same order — your
                direction has stayed consistent.
              </p>
            ) : (
              <div className="space-y-3">
                {comparison.emergedThemes.length > 0 && (
                  <ChangeRow
                    icon={<ArrowUp className="h-4 w-4 text-success" aria-hidden="true" />}
                    label="Rose into your top three"
                    themes={comparison.emergedThemes.map((theme) => theme.label)}
                  />
                )}
                {comparison.recededLabels.length > 0 && (
                  <ChangeRow
                    icon={<ArrowDown className="h-4 w-4 text-warning" aria-hidden="true" />}
                    label="Dropped out of your top three"
                    themes={comparison.recededLabels}
                  />
                )}
                {comparison.biggestMoves.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="type-label text-muted-foreground">Largest score movements</p>
                    {comparison.biggestMoves.map((move) => (
                      <div key={move.code} className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2">
                          {move.delta > 0 ? (
                            <ArrowUp className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                          )}
                          {move.label}
                        </span>
                        <span className="text-muted-foreground">
                          {move.delta > 0 ? '+' : ''}
                          {move.delta} points
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <Minus className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
              Interests naturally shift with experience and context. A change in theme order is a
              cue to revisit your directions, not a measure of progress or improvement.
            </p>
          </div>
        )}

        {older.length > 0 && (
          <div className="space-y-2 border-t border-border-subtle pt-4">
            <p className="type-label text-muted-foreground">Earlier assessments</p>
            {older.map((result) => (
              <div key={result.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {format(new Date(result.completed_at), 'MMM d, yyyy')}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[result.primary_interest, result.secondary_interest, result.tertiary_interest]
                    .filter((label): label is string => Boolean(label))
                    .map((label) => (
                      <Badge key={label} variant="outline" className="text-[11px]">
                        {label}
                      </Badge>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChangeRow({
  icon,
  label,
  themes,
}: {
  icon: React.ReactNode;
  label: string;
  themes: string[];
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5">{icon}</span>
      <div>
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{themes.join(', ')}</span>
      </div>
    </div>
  );
}
