import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target } from 'lucide-react';

interface ReadinessOverviewProps {
  score: number;
  level: string;
  careerPath: string;
}

const levelColors: Record<string, string> = {
  'Beginning': 'text-muted-foreground',
  'Developing': 'text-orange-500',
  'Proficient': 'text-primary',
  'Career Ready': 'text-green-600',
};

const ReadinessOverview: React.FC<ReadinessOverviewProps> = ({ score, level, careerPath }) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-5">
          <div className="h-20 w-20 rounded-full border-4 border-primary/20 flex items-center justify-center shrink-0">
            <div className="text-center">
              <p className="text-2xl font-bold">{score}%</p>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <h2 className="text-lg font-semibold truncate">Career Readiness</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-2 truncate">{careerPath}</p>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${levelColors[level] || 'text-muted-foreground'}`}>
                {level}
              </span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-700"
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadinessOverview;
