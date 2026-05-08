import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, ArrowRight, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AnalysisResult } from '@/hooks/useCVAnalysis';

interface CVSkillGapPanelProps {
  result: AnalysisResult;
}

export const CVSkillGapPanel: React.FC<CVSkillGapPanelProps> = ({ result }) => {
  const navigate = useNavigate();
  const roles = (result.suggestedRoles || []).slice(0, 5);
  const missing = (result.missingSkills || []).slice(0, 6);

  const handleCloseGaps = () => {
    if (missing.length === 0) {
      navigate('/learn');
      return;
    }
    const focus = missing.map(s => encodeURIComponent(s)).join(',');
    navigate(`/learn?focus=${focus}`);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Roles you fit
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {roles.map(role => (
                <Badge key={role} variant="secondary" className="text-xs">
                  {role}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Skills to develop
            </p>
            <div className="flex flex-wrap gap-1.5">
              {missing.map(skill => (
                <Badge
                  key={skill}
                  variant="outline"
                  className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                  onClick={() => navigate(`/learn?focus=${encodeURIComponent(skill)}`)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {missing.length === 0 && roles.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No specific gaps detected. Keep building your portfolio and CV.
          </p>
        )}

        <Button onClick={handleCloseGaps} size="sm" className="w-full gap-1.5">
          Close these gaps in Learn
          <ArrowRight className="h-3 w-3" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default CVSkillGapPanel;
