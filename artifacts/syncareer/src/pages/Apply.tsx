import React from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Briefcase, BarChart3, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    title: 'Opportunities',
    description: 'Browse native and external job postings ranked by AI match rate.',
    icon: TrendingUp,
    href: '/opportunities',
  },
  {
    title: 'Applications',
    description: 'Track every application through a clear visual pipeline.',
    icon: Briefcase,
    href: '/applications',
  },
  {
    title: 'Market Intelligence',
    description: 'See salary, demand and employer signals for your major.',
    icon: BarChart3,
    href: '/analysis',
  },
];

export default function Apply() {
  const navigate = useNavigate();
  return (
    <StudentLayout title="Apply">
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Find roles, send applications, and track everything from one place.
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
