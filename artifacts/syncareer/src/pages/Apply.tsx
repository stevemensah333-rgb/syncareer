import React from 'react';
import { Link } from 'react-router-dom';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, Briefcase, BarChart3, ArrowRight } from 'lucide-react';

const sections = [
  {
    title: 'Opportunities',
    description: 'Browse current opportunities and keep their source information in view.',
    icon: TrendingUp,
    href: '/opportunities',
  },
  {
    title: 'Applications',
    description: 'Track each application through a clear, deliberate workflow.',
    icon: Briefcase,
    href: '/applications',
  },
  {
    title: 'Market Intelligence',
    description: 'Review market signals and methodology for your field.',
    icon: BarChart3,
    href: '/analysis',
  },
];

export default function Apply() {
  return (
    <StudentLayout title="Apply">
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Find roles, send applications, and track everything from one place.
      </p>
      <div className="grid gap-4 md:grid-cols-3">
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
