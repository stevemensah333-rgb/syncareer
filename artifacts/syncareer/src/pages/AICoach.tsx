import { Link } from 'react-router-dom';
import { Briefcase, FileText, Mic, Search } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const destinations = [
  { title: 'Opportunities', description: 'Explain requirements and identify questions to research.', href: '/opportunities', icon: Search },
  { title: 'CV Builder', description: 'Rewrite a selected bullet using only facts you supplied.', href: '/cv-builder', icon: FileText },
  { title: 'Applications', description: 'Draft follow-ups, clarify next actions and organise notes.', href: '/applications', icon: Briefcase },
  { title: 'Interview practice', description: 'Review feedback and practise another role-specific question.', href: '/interview-simulator', icon: Mic },
];

export default function AICoach() {
  return <PageLayout title="Assistant" description="Syncareer assistance now lives alongside the work it helps you complete.">
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-lg border bg-card p-5"><h2 className="font-semibold">SynAI has moved into your workspace</h2><p className="mt-2 text-sm text-muted-foreground">Choose the object you are working on. You will see exactly which opportunity, CV text, application notes or interview feedback is sent, and optional personal context can be removed before requesting a proposal.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">{destinations.map((item) => <Card key={item.href}><CardContent className="flex h-full flex-col items-start p-5"><item.icon className="h-5 w-5 text-primary" /><h2 className="mt-3 font-semibold">{item.title}</h2><p className="mt-1 flex-1 text-sm text-muted-foreground">{item.description}</p><Button asChild variant="outline" className="mt-4"><Link to={item.href}>Open {item.title}</Link></Button></CardContent></Card>)}</div>
    </div>
  </PageLayout>;
}
