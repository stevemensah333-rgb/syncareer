import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ArrowRight, ClipboardList, FileText, Mic, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface JourneyStep {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  state?: Record<string, any>;
  completed: boolean;
}

interface GuidedJourneyProps {
  topCareerTitle?: string;
  topCareerIndustry?: string;
  isGuest?: boolean;
}

export const GuidedJourney: React.FC<GuidedJourneyProps> = ({
  topCareerTitle,
  topCareerIndustry,
  isGuest = false,
}) => {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<JourneyStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkCompletion = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setSteps(getSteps(false, false, false, false));
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      const [assessmentRes, resumeRes, interviewRes, applicationRes] = await Promise.all([
        supabase.from('assessments').select('id').eq('user_id', userId).not('completed_at', 'is', null).limit(1),
        supabase.from('resumes').select('id').eq('user_id', userId).limit(1),
        supabase.from('mock_interviews').select('id').eq('user_id', userId).not('completed_at', 'is', null).limit(1),
        supabase.from('job_applications').select('id').eq('applicant_id', userId).limit(1),
      ]);

      setSteps(getSteps(
        (assessmentRes.data?.length || 0) > 0,
        (resumeRes.data?.length || 0) > 0,
        (interviewRes.data?.length || 0) > 0,
        (applicationRes.data?.length || 0) > 0,
      ));
      setLoading(false);
    };

    const getSteps = (assessment: boolean, cv: boolean, interview: boolean, applied: boolean): JourneyStep[] => [
      {
        id: 'assessment',
        title: 'Complete Assessment',
        description: 'Discover your career interests and strengths',
        icon: ClipboardList,
        href: '/assessment',
        completed: assessment,
      },
      {
        id: 'cv',
        title: 'Build Your CV',
        description: 'Create an ATS-friendly CV for your target roles',
        icon: FileText,
        href: '/cv-builder',
        completed: cv,
      },
      {
        id: 'interview',
        title: 'Practice Interview',
        description: `Prepare for ${topCareerIndustry || 'your target'} industry roles`,
        icon: Mic,
        href: '/interview-simulator',
        state: { prefillRole: topCareerTitle, prefillIndustry: topCareerIndustry },
        completed: interview,
      },
      {
        id: 'apply',
        title: 'Apply to Jobs',
        description: 'Find and apply to matching opportunities',
        icon: Briefcase,
        href: '/opportunities',
        completed: applied,
      },
    ];

    checkCompletion();
  }, [topCareerTitle, topCareerIndustry]);

  if (loading) return null;

  const completedCount = steps.filter(s => s.completed).length;
  const nextStep = steps.find(s => !s.completed);
  const progressPercent = (completedCount / steps.length) * 100;

  if (isGuest) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Your Career Journey</CardTitle>
          <span className="text-sm text-muted-foreground">{completedCount}/{steps.length} complete</span>
        </div>
        <Progress value={progressPercent} className="h-2 mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {steps.map((step, _idx) => {
            const isNext = step.id === nextStep?.id;
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                  step.completed && "bg-muted/30 border-muted",
                  isNext && "border-primary/40 bg-primary/5",
                  !step.completed && !isNext && "opacity-60"
                )}
              >
                {step.completed ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Circle className={cn("h-5 w-5 shrink-0", isNext ? "text-primary" : "text-muted-foreground")} />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", step.completed && "line-through text-muted-foreground")}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                </div>
                {isNext && (
                  <Button
                    size="sm"
                    onClick={() => navigate(step.href, { state: step.state })}
                    className="shrink-0"
                  >
                    Start <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
                {step.completed && (
                  <span className="text-xs text-green-600 font-medium shrink-0">Done</span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
