import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle } from 'lucide-react';
import { UserProgress, calculateTotalProgress, getMilestones, getNextAction, getMilestoneDetails } from '@/lib/progressCalculations';

interface ProgressDisplayProps {
  progress: UserProgress;
  className?: string;
  compact?: boolean;
}

/**
 * Display user progress with milestones and next actions
 */
export const ProgressDisplay: React.FC<ProgressDisplayProps> = ({
  progress,
  className = '',
  compact = false,
}) => {
  const totalProgress = calculateTotalProgress(progress);
  const milestones = useMemo(() => getMilestones(progress), [progress]);
  const nextAction = useMemo(() => getNextAction(progress), [progress]);

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Career Readiness</span>
              <span className="text-lg font-bold text-primary">{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-2" />
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-foreground/60">Profile</p>
                <p className="font-medium">{progress.profileCompletion}%</p>
              </div>
              <div>
                <p className="text-foreground/60">Assessment</p>
                <p className="font-medium">{progress.assessmentCount > 0 ? '✓' : '○'}</p>
              </div>
              <div>
                <p className="text-foreground/60">Milestones</p>
                <p className="font-medium">{milestones.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Overall progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Career Readiness</span>
            <span className="text-2xl font-bold text-primary">{totalProgress}%</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Profile</label>
              <span className="text-xs text-foreground/60">{progress.profileCompletion}%</span>
            </div>
            <Progress value={progress.profileCompletion} className="h-2" />
          </div>

          {/* Assessment */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Assessments</label>
              <span className="text-xs text-foreground/60">{progress.assessmentCompleted} completed</span>
            </div>
            <Progress value={progress.assessmentCompletion} className="h-2" />
          </div>

          {/* Overall */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Overall Progress</label>
              <span className="text-lg font-bold text-primary">{totalProgress}%</span>
            </div>
            <Progress value={totalProgress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Milestones */}
      {milestones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Achievements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {milestones.map((milestoneId) => {
              const milestone = getMilestoneDetails(milestoneId);
              if (!milestone) return null;
              return (
                <div key={milestoneId} className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg">
                  <span className="text-2xl">{milestone.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{milestone.label}</p>
                    <p className="text-xs text-foreground/60">{milestone.description}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Next action */}
      {nextAction && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {nextAction.action}
                </p>
                <p className="type-meta mt-1">
                  {nextAction.description}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
