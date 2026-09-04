import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Target, Briefcase, TrendingUp } from 'lucide-react';
import type { AnalysisResult } from '@/hooks/useCVAnalysis';

interface CVSkillGapPanelProps {
  result: AnalysisResult;
}

export const CVSkillGapPanel: React.FC<CVSkillGapPanelProps> = ({ result }) => {
  const roles = (result.suggestedRoles || []).slice(0, 5);
  const missing = (result.missingSkills || []).slice(0, 6);

  return (
    <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Skill Gap Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {roles.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Briefcase className="h-3 w-3 text-muted-foreground" />
              <p className="type-label">
                Matched target roles
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {roles.map(role => (
                <Badge key={role} variant="secondary" className="rounded-control text-xs font-medium">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <p className="type-label">
                High-priority skills to build
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missing.map(skill => (
                <Badge key={skill} variant="outline" className="rounded-control border-border text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {missing.length === 0 && roles.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No specific gaps detected. Continue developing domain evidence and leadership experience.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default CVSkillGapPanel;
