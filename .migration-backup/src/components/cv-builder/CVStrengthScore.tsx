import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertTriangle, TrendingUp, Target } from 'lucide-react';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import type { CVStrengthResult } from '@/hooks/useCVStrengthScore';

interface CVStrengthScoreProps {
  result: CVStrengthResult;
}

const LABEL_CONFIG: Record<CVStrengthResult['label'], { color: string; ring: string }> = {
  Weak: { color: 'text-destructive', ring: 'stroke-destructive' },
  Developing: { color: 'text-orange-500', ring: 'stroke-orange-500' },
  Strong: { color: 'text-primary', ring: 'stroke-primary' },
  Excellent: { color: 'text-green-600', ring: 'stroke-green-600' },
};

const CATEGORY_LABELS: Record<string, string> = {
  completeness: 'Completeness',
  contentQuality: 'Content Quality',
  skillsRelevance: 'Skills Relevance',
  presentation: 'Presentation',
  competitiveness: 'Competitiveness',
};

export const CVStrengthScore: React.FC<CVStrengthScoreProps> = ({ result }) => {
  const { totalScore, label, breakdown, strengths, suggestions } = result;
  const config = LABEL_CONFIG[label];
  const feedbackModal = useFeedbackModal('cv_strength_score');
  const feedbackTriggeredRef = useRef(false);

  // Trigger feedback only once when user has a meaningful score
  useEffect(() => {
    if (totalScore >= 30 && !feedbackTriggeredRef.current) {
      feedbackTriggeredRef.current = true;
      feedbackModal.triggerFeedback();
    }
  }, [totalScore]); // eslint-disable-line react-hooks/exhaustive-deps

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (totalScore / 100) * circumference;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-5 w-5 text-primary" />
          CV Strength Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Circular Progress */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative w-32 h-32">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                className="stroke-muted"
                strokeWidth="8"
              />
              <circle
                cx="60" cy="60" r="54"
                fill="none"
                className={config.ring}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                style={{ transition: 'stroke-dashoffset 0.6s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${config.color}`}>{totalScore}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
          <Badge variant="secondary" className={`${config.color} font-medium`}>
            {label}
          </Badge>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-2">
          {Object.entries(breakdown).map(([key, cat]) => (
            <div key={key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{CATEGORY_LABELS[key]}</span>
              <span className="font-medium">{cat.score}/{cat.max}</span>
            </div>
          ))}
        </div>

        {/* Strengths */}
        {strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Strengths
            </h4>
            <ul className="space-y-1.5">
              {strengths.map((s, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-1 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-green-600">
                  {s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-orange-500" />
              Improve Your Score
            </h4>
            <ul className="space-y-1.5">
              {suggestions.map((s, i) => (
                <li key={i} className="text-xs text-muted-foreground leading-relaxed pl-5 relative before:content-[''] before:absolute before:left-1 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-orange-500">
                  {s}
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
