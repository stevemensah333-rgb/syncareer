import { useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, Briefcase, Check, EyeOff, Lightbulb } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { CareerRecommendation } from '@/hooks/useCareerRecommendations';
import { opportunitySearchForRoleFamily, orderRoleFamilies, type RoleFamilyPreference } from '@/features/assessment/roleFamilies';

interface Props {
  recommendations: CareerRecommendation[];
  clusterInsight: { title: string; themes: string[] } | null;
  primaryInterest: string | null;
  secondaryInterest: string | null;
  tertiaryInterest: string | null;
  loading: boolean;
  isGuest?: boolean;
  userMajor?: string | null;
}

const WORK_ENVIRONMENTS: Record<string, string> = {
  Realistic: 'Practical settings with tangible tools, systems or outputs',
  Investigative: 'Analytical settings with time to explore questions and evidence',
  Artistic: 'Flexible settings that value originality and expression',
  Social: 'Collaborative settings centred on helping, teaching or supporting people',
  Enterprising: 'Goal-oriented settings involving influence, initiative or coordination',
  Conventional: 'Structured settings with clear processes, records and organisation',
};

export default function CareerRecommendations({ recommendations, clusterInsight, primaryInterest, secondaryInterest, tertiaryInterest, loading, isGuest = false }: Props) {
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<Record<string, RoleFamilyPreference>>({});
  const visible = useMemo(() => orderRoleFamilies(recommendations, preferences).slice(0, 8), [recommendations, preferences]);
  const interests = [primaryInterest, secondaryInterest, tertiaryInterest].filter((item): item is string => Boolean(item));

  if (loading) return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Loading broad role families…</CardContent></Card>;

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle className="text-lg">How to read these results</CardTitle></CardHeader><CardContent className="space-y-3 text-sm text-muted-foreground"><p>RIASEC describes interest themes. It does not measure skill level, job readiness, employability, guaranteed fit or hiring probability.</p><p>Closely scored themes can change order with a few different answers. Treat the role families below as prompts to investigate, then compare them with your actual skills, evidence, constraints and preferences.</p></CardContent></Card>

    <Card><CardHeader><CardTitle className="text-lg">Interest themes and work environments</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-wrap gap-2">{interests.map((interest, index) => <Badge key={interest} variant={index === 0 ? 'default' : 'secondary'}>{interest}</Badge>)}</div><div className="grid gap-3 sm:grid-cols-2">{interests.map((interest) => <div key={interest} className="rounded-lg border p-3"><p className="font-medium">{interest}</p><p className="mt-1 text-sm text-muted-foreground">{WORK_ENVIRONMENTS[interest] ?? 'Explore environments that support this interest theme.'}</p></div>)}</div>{clusterInsight && <div className="rounded-lg border bg-muted/40 p-3"><p className="flex items-center gap-2 text-sm font-medium"><Lightbulb className="h-4 w-4 text-warning" />Possible combination: {clusterInsight.title}</p><p className="mt-1 text-xs text-muted-foreground">One interpretation of overlapping themes, not a diagnosis or fixed identity.</p></div>}</CardContent></Card>

    <Card><CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5 text-primary" />Broad role families to investigate</CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">These families are ordered from your interest pattern and the repository’s existing career profiles. They are not job recommendations or proof that you qualify.</p>{visible.length ? visible.map(({ career }) => <article key={career.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{career.title}</h3><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{career.description}</p></div>{preferences[career.id] === 'prioritised' && <Badge><Check className="h-3 w-3" />Interested</Badge>}{preferences[career.id] === 'deprioritised' && <Badge variant="outline">Show later</Badge>}</div><div className="mt-3"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Evidence to investigate or build</p><div className="mt-2 flex flex-wrap gap-1.5">{career.required_skills.slice(0, 5).map((skill) => <Badge key={skill} variant="secondary">{skill}</Badge>)}</div></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" onClick={() => isGuest ? navigate('/sign-up?returnTo=%2Fopportunities') : navigate(opportunitySearchForRoleFamily(career.title))}>Explore real opportunities <ArrowRight className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => setPreferences((current) => ({ ...current, [career.id]: 'prioritised' }))}><Check className="h-4 w-4" />This interests me</Button><Button size="sm" variant="ghost" onClick={() => setPreferences((current) => ({ ...current, [career.id]: 'deprioritised' }))}><ArrowDown className="h-4 w-4" />Show later</Button><Button size="sm" variant="ghost" onClick={() => setPreferences((current) => ({ ...current, [career.id]: 'dismissed' }))}><EyeOff className="h-4 w-4" />Not for me</Button></div></article>) : <p className="text-sm text-muted-foreground">No role-family profiles are available. You can still explore the latest external opportunities directly.</p>}<Button variant="outline" onClick={() => navigate('/opportunities')}>Browse latest opportunities</Button><p className="text-xs text-muted-foreground">Corrections on this screen affect only this view. They do not rewrite your assessment scores or silently change saved job or industry preferences.</p></CardContent></Card>
  </div>;
}
