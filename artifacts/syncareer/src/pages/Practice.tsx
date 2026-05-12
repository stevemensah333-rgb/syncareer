import React from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Mic, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    title: 'Career Assessment',
    description: 'Discover your top career fits using the RIASEC model.',
    icon: ClipboardList,
    href: '/assessment',
  },
  {
    title: 'Interview Simulator',
    description: 'Practice role-specific interviews with SynAssist and get scored feedback.',
    icon: Mic,
    href: '/interview-simulator',
  },
  {
    title: 'SynAI Coach',
    description: 'Ask career questions and get context-aware guidance.',
    icon: Sparkles,
    href: '/ai-coach',
  },
];

export default function Practice() {
  const navigate = useNavigate();
  return (
    <StudentLayout title="Practice">
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Sharpen what matters before applying — assessments, interviews, and on-demand coaching.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        {sections.map((s) => (
          <Card key={s.href} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(s.href)}>
            <CardContent className="p-6 space-y-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{s.description}</p>
              </div>
              <Button variant="ghost" size="sm" className="px-0">
                Open <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </StudentLayout>
  );
}
