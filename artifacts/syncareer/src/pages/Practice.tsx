import React from 'react';
import { Link } from 'react-router-dom';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Mic, ArrowRight } from 'lucide-react';

const sections = [
  {
    title: 'Career Assessment',
    description: 'Explore interest themes if you are still choosing a direction. This does not measure skill or readiness.',
    icon: ClipboardList,
    href: '/assessment',
  },
  {
    title: 'Interview Simulator',
    description: 'Practice a role-specific interview and review the evidence in your session report.',
    icon: Mic,
    href: '/interview-simulator',
  },
];

export default function Practice() {
  return (
    <StudentLayout title="Practice">
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Sharpen what matters before applying — assessments, interviews, and on-demand coaching.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.href} className="transition-shadow hover:shadow-md">
            <Link
              to={section.href}
              className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <CardContent className="space-y-4 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <section.icon aria-hidden="true" className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{section.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
                </div>
                <span className="inline-flex min-h-11 items-center text-sm font-medium text-primary">
                  Open <ArrowRight aria-hidden="true" className="ml-1 h-4 w-4" />
                </span>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </StudentLayout>
  );
}
