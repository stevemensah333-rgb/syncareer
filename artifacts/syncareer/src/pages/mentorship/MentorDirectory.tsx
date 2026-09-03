import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RecordList, RecordRow, RecordState } from '@/components/dossier';
import { mentorshipApi } from '@/features/mentorship/api';
import type { MentorProfile } from '@/features/mentorship/types';
import { filterMentors } from '@/features/mentorship/filtering';

/**
 * Mentor directory. Compact professional record rows with URL-backed filters.
 * The verification statement is the mentor badge ("Company email verified");
 * it never claims Syncareer validated skills or outcomes.
 */
export default function MentorDirectory() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
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
  const applicationParam = params.get('application');

  return <PageLayout title="Find a mentor" description="Connect with verified professionals for focused, application-relevant guidance.">
    <div className="space-y-5">
      <div className="surface-content grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[minmax(220px,1fr)_170px_170px_170px_170px]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Search mentors" className="pl-9" placeholder="Name, role, company or skill" value={search} onChange={(e) => setFilter('q', e.target.value)} /></div>
        <Select value={experience} onValueChange={(v) => setFilter('experience', v)}><SelectTrigger aria-label="Experience"><SelectValue placeholder="Experience" /></SelectTrigger><SelectContent><SelectItem value="all">All experience</SelectItem><SelectItem value="0-2">0–2 years</SelectItem><SelectItem value="3-5">3–5 years</SelectItem><SelectItem value="6-10">6–10 years</SelectItem><SelectItem value="10+">10+ years</SelectItem></SelectContent></Select>
        <Select value={role} onValueChange={(v) => setFilter('role', v)}><SelectTrigger aria-label="Current role"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All roles</SelectItem>{roles.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Select value={availability} onValueChange={(v) => setFilter('availability', v)}><SelectTrigger aria-label="Availability"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All availability</SelectItem><SelectItem value="accepting">Accepting requests</SelectItem><SelectItem value="limited">Limited availability</SelectItem></SelectContent></Select>
        <Select value={skill} onValueChange={(v) => setFilter('skill', v)}><SelectTrigger aria-label="Expertise"><SelectValue placeholder="Expertise" /></SelectTrigger><SelectContent><SelectItem value="all">All expertise</SelectItem>{skills.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
      </div>
      {loading && <div className="space-y-2" aria-busy="true" role="status">{[1, 2, 3].map((n) => <div key={n} className="h-16 animate-pulse border border-border bg-muted/40 motion-reduce:animate-none" />)}</div>}
      {error && <RecordState tone="error" title="Mentors could not be loaded" description={error} />}
      {!loading && !error && filtered.length === 0 && (
        <RecordState
          tone="empty"
          title="No mentors match these filters"
          description="Clear a filter or check again as more mentors are verified."
          action={<Button size="sm" variant="outline" onClick={() => { for (const key of ['q', 'experience', 'role', 'availability', 'skill']) setFilter(key, 'all'); }}>Clear filters</Button>}
        />
      )}
      {!loading && !error && filtered.length > 0 && (
        <RecordList label="Verified mentors">
          {filtered.map((mentor) => (
            <RecordRow
              key={mentor.mentor_id}
              title={mentor.full_name}
              eyebrow={mentor.current_role ?? 'Career mentor'}
              detail={[
                mentor.company_name ? `Company email verified · ${mentor.company_name}` : 'Company email verified',
                `${mentor.years_experience} years`,
                mentor.availability_status === 'accepting' ? 'Accepting requests' : 'Limited availability',
              ].filter(Boolean).join(' · ')}
              meta={mentor.expertise_tags.length > 0 ? <span className="flex flex-wrap gap-1.5">{mentor.expertise_tags.slice(0, 4).map((tag) => <span key={tag} className="border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">{tag}</span>)}</span> : undefined}
              onClick={() => navigate(`/mentors/${mentor.mentor_id}${applicationParam ? `?application=${encodeURIComponent(applicationParam)}` : ''}`)}
            />
          ))}
        </RecordList>
      )}
      <p className="text-xs text-muted-foreground">
        <Users aria-hidden="true" className="mr-1 inline h-3.5 w-3.5" />
        Records list only mentors whose company email has been verified; availability is self-reported.
      </p>
    </div>
  </PageLayout>;
}
