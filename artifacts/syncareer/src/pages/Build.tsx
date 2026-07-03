import React from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Star, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    title: 'CV Builder',
    description: 'Create an ATS-friendly CV with AI suggestions and a Strength Score.',
    icon: FileText,
    href: '/cv-builder',
  },
  {
    title: 'Portfolio',
    description: 'Showcase projects, skills and links employers can verify.',
    icon: Star,
    href: '/portfolio',
  },
];

export default function Build() {
  const navigate = useNavigate();
  return (
    <StudentLayout title="Build">
      <p className="text-muted-foreground mb-6 max-w-2xl">
        Everything you need to build a credible professional profile — your CV and portfolio.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
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
