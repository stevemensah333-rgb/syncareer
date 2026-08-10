import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, FileText, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EmptyState() {
  const navigate = useNavigate();
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 md:p-10">
        <div className="max-w-2xl space-y-6">
          <div className="space-y-3">
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Turn real opportunities into stronger applications</h2>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              Syncareer helps you save roles, build a tailored CV, practise interviews with feedback, and track every outcome — all around one continuous journey from opportunity to application.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/opportunities')} className="gap-1.5">
              Find an opportunity <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/assessment')}>
              Take career assessment
            </Button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-2">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="h-8 w-8 rounded-md bg-background border flex items-center justify-center">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[13px] font-medium">1. Save an opportunity</p>
              <p className="text-[12px] text-muted-foreground leading-snug">Browse ranked roles and save those aligned with your skills.</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="h-8 w-8 rounded-md bg-background border flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[13px] font-medium">2. Build & prepare</p>
              <p className="text-[12px] text-muted-foreground leading-snug">Create an ATS-friendly CV and practise interview answers for the role.</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="h-8 w-8 rounded-md bg-background border flex items-center justify-center">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <p className="text-[13px] font-medium">3. Apply & track</p>
              <p className="text-[12px] text-muted-foreground leading-snug">Submit, track status changes, and record outcomes to learn.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
