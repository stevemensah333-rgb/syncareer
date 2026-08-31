import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, CheckCircle2, Search, Users } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { mentorshipApi } from '@/features/mentorship/api';
import type { MentorProfile } from '@/features/mentorship/types';
import { filterMentors } from '@/features/mentorship/filtering';

export default function MentorDirectory() {
  const [params, setParams] = useSearchParams();
  const [mentors, setMentors] = useState<MentorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { mentorshipApi.listMentors().then(setMentors).catch(() => setError('Mentors could not be loaded.')).finally(() => setLoading(false)); }, []);
  const search = params.get('q') ?? '';
  const experience = params.get('experience') ?? 'all';
  const availability = params.get('availability') ?? 'all';
  const skill = params.get('skill') ?? 'all';
  const role = params.get('role') ?? 'all';
  const skills = useMemo(() => [...new Set(mentors.flatMap((m) => m.expertise_tags))].sort(), [mentors]);
  const roles = useMemo(() => [...new Set(mentors.map((m) => m.current_role).filter((value): value is string => Boolean(value)))].sort(), [mentors]);
  const filtered = useMemo(() => filterMentors(mentors, { search, experience, availability, skill, role }), [availability, experience, mentors, role, search, skill]);
  const setFilter = (key: string, value: string) => setParams((current) => { const next = new URLSearchParams(current); value === 'all' || !value ? next.delete(key) : next.set(key, value); return next; }, { replace: true });
  return <PageLayout title="Find a mentor" description="Connect with verified professionals for focused, application-relevant guidance.">
    <div className="space-y-5">
      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_170px_170px_170px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search mentors" className="pl-9" placeholder="Name, role, company or skill" value={search} onChange={(e) => setFilter('q', e.target.value)} /></div>
        <Select value={experience} onValueChange={(v) => setFilter('experience', v)}><SelectTrigger aria-label="Experience"><SelectValue placeholder="Experience" /></SelectTrigger><SelectContent><SelectItem value="all">All experience</SelectItem><SelectItem value="0-2">0–2 years</SelectItem><SelectItem value="3-5">3–5 years</SelectItem><SelectItem value="6-10">6–10 years</SelectItem><SelectItem value="10+">10+ years</SelectItem></SelectContent></Select>
        <Select value={role} onValueChange={(v) => setFilter('role', v)}><SelectTrigger aria-label="Current role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Select value={availability} onValueChange={(v) => setFilter('availability', v)}><SelectTrigger aria-label="Availability"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All availability</SelectItem><SelectItem value="accepting">Accepting requests</SelectItem><SelectItem value="limited">Limited availability</SelectItem></SelectContent></Select>
        <Select value={skill} onValueChange={(v) => setFilter('skill', v)}><SelectTrigger aria-label="Expertise"><SelectValue placeholder="Expertise" /></SelectTrigger><SelectContent><SelectItem value="all">All expertise</SelectItem>{skills.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
      </div>
      {loading && <p role="status" className="py-12 text-center text-muted-foreground">Loading verified mentors…</p>}
      {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-destructive">{error}</p>}
      {!loading && !error && filtered.length === 0 && <Card><CardContent className="py-12 text-center"><Users className="mx-auto mb-3 h-9 w-9 text-muted-foreground" /><p className="font-medium">No mentors match these filters</p><p className="text-sm text-muted-foreground">Clear a filter or check again as more mentors are verified.</p></CardContent></Card>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((mentor) => <Card key={mentor.mentor_id}><CardContent className="space-y-4 p-5"><div className="flex gap-3"><Avatar className="h-12 w-12"><AvatarImage src={mentor.avatar_url ?? ''} /><AvatarFallback>{mentor.full_name.charAt(0)}</AvatarFallback></Avatar><div className="min-w-0"><h2 className="truncate font-semibold">{mentor.full_name}</h2><p className="truncate text-sm text-muted-foreground">{mentor.current_role}</p><p className="flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Company email verified · {mentor.company_name}</p></div></div><div className="flex flex-wrap gap-1">{mentor.expertise_tags.slice(0, 4).map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div><div className="flex items-center justify-between text-xs text-muted-foreground"><span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{mentor.years_experience} years</span><span>{mentor.availability_status === 'accepting' ? 'Accepting requests' : 'Limited availability'}</span></div><Button asChild className="w-full"><Link to={`/mentors/${mentor.mentor_id}${params.get('application') ? `?application=${encodeURIComponent(params.get('application')!)}` : ''}`}>View profile</Link></Button></CardContent></Card>)}</div>
    </div>
  </PageLayout>;
}
