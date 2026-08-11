import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EmptyState({ hasApplicationHistory = false, showAssessment = false }: { hasApplicationHistory?: boolean; showAssessment?: boolean }) {
  const navigate = useNavigate();
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 md:p-10">
        <div className="max-w-2xl space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your next piece of work</p>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">{hasApplicationHistory ? 'Choose the next opportunity to pursue' : 'Start with a real opportunity'}</h2>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {hasApplicationHistory ? 'Your current applications are complete or no longer active. Review a current listing and start a new application when you find one worth pursuing.' : 'Review a current listing, save it if it is worth investigating, then continue into an application workspace.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/opportunities')} className="gap-1.5">
              Find an opportunity <ArrowRight className="h-4 w-4" />
            </Button>
            {showAssessment && <Button variant="outline" onClick={() => navigate('/assessment')}>Still choosing a direction?</Button>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
