import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, FileText, Mic, Briefcase, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface NextAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: 'cv' | 'interview' | 'opportunities' | 'outcome';
}

const ICON_MAP = {
  cv: FileText,
  interview: Mic,
  opportunities: Briefcase,
  outcome: CheckCircle2,
};

export function NextActionsList({ actions }: { actions: NextAction[] }) {
  const navigate = useNavigate();
  if (actions.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-[14px] font-semibold">Next actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {actions.map(action => {
          const Icon = ICON_MAP[action.icon];
          return (
            <button
              key={action.id}
              onClick={() => navigate(action.href)}
              className="w-full text-left rounded-lg border bg-card p-3 flex items-start gap-3 hover:border-primary/30 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-150"
            >
              <span className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-medium text-foreground">{action.title}</span>
                <span className="block text-[12px] text-muted-foreground mt-0.5 leading-snug">{action.description}</span>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
