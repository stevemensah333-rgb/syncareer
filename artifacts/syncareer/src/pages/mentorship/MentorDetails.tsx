import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { mentorshipApi } from '@/features/mentorship/api';
import { MENTORSHIP_REQUEST_TYPES, type MentorProfile, type MentorshipRequestType } from '@/features/mentorship/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Resource = { id: string; label: string };

export default function MentorDetails() {
  const { mentorId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mentor, setMentor] = useState<MentorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<{ applications: Resource[]; resumes: Resource[] }>({ applications: [], resumes: [] });
  const [requestType, setRequestType] = useState<MentorshipRequestType>('career_path_conversation');
  const [goal, setGoal] = useState('');
  const [context, setContext] = useState('');
  const [deadline, setDeadline] = useState('');
  const [url, setUrl] = useState('');
  const [applicationId, setApplicationId] = useState(params.get('application') ?? 'none');
  const [resumeId, setResumeId] = useState('none');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      mentorshipApi.listMentors(),
      supabase.from('job_applications').select('id, job:job_postings(title, company_name)').order('created_at', { ascending: false }),
      supabase.from('resumes').select('id, title').order('updated_at', { ascending: false }),
    ]).then(([mentors, apps, resumes]) => {
      setMentor(mentors.find((item) => item.mentor_id === mentorId) ?? null);
      setResources({
        applications: (apps.data ?? []).map((item) => { const job = item.job as unknown as { title?: string; company_name?: string } | null; return { id: item.id, label: `${job?.title ?? 'Application'}${job?.company_name ? ` · ${job.company_name}` : ''}` }; }),
        resumes: (resumes.data ?? []).map((item) => ({ id: item.id, label: item.title || 'Untitled CV' })),
      });
    }).catch(() => setMentor(null)).finally(() => setLoading(false));
  }, [mentorId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!mentor || !consent) return;
    if (goal.trim().length < 10 || context.trim().length < 20) { toast.error('Add a clear goal and enough context for the mentor.'); return; }
    setSubmitting(true);
    try {
      await mentorshipApi.createRequest({ mentorId: mentor.mentor_id, requestType, goal, context, deadline, supportingUrl: url, applicationId: applicationId === 'none' ? undefined : applicationId, resumeId: resumeId === 'none' ? undefined : resumeId });
      toast.success('Mentorship request sent');
      navigate('/mentorship/requests');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Request could not be sent.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <PageLayout title="Mentor profile"><p role="status" className="py-16 text-center text-muted-foreground">Loading mentor…</p></PageLayout>;
  if (!mentor) return <PageLayout title="Mentor unavailable"><Card><CardContent className="py-12 text-center"><p>This mentor is not currently accepting requests.</p><Button asChild className="mt-4"><Link to="/mentors">Browse mentors</Link></Button></CardContent></Card></PageLayout>;

  return <PageLayout title={mentor.full_name} description={`${mentor.current_role ?? 'Career mentor'} · ${mentor.company_name}`}>
    <Button variant="ghost" asChild className="mb-4"><Link to="/mentors"><ArrowLeft className="h-4 w-4" />All mentors</Link></Button>
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Card><CardContent className="space-y-6 p-6"><div className="flex gap-4"><Avatar className="h-20 w-20"><AvatarImage src={mentor.avatar_url ?? ''} /><AvatarFallback className="text-xl">{mentor.full_name.charAt(0)}</AvatarFallback></Avatar><div><h1 className="text-2xl font-semibold">{mentor.full_name}</h1><p className="text-muted-foreground">{mentor.current_role}</p><p className="mt-1 flex items-center gap-1 text-sm text-primary"><CheckCircle2 className="h-4 w-4" />Company email verified · {mentor.company_name}</p></div></div><div><h2 className="font-semibold">About</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{mentor.bio}</p></div><div><h2 className="font-semibold">Expertise</h2><div className="mt-2 flex flex-wrap gap-2">{mentor.expertise_tags.map((tag) => <Badge key={tag} variant="secondary">{tag}</Badge>)}</div></div><p className="text-sm text-muted-foreground">{mentor.years_experience} years of experience · {mentor.availability_status === 'accepting' ? 'Accepting requests' : 'Limited availability'}</p></CardContent></Card>
      <Card><CardHeader><CardTitle>Request mentorship</CardTitle></CardHeader><CardContent><form className="space-y-4" onSubmit={submit}><div className="space-y-2"><Label>Request type</Label><Select value={requestType} onValueChange={(v) => setRequestType(v as MentorshipRequestType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(MENTORSHIP_REQUEST_TYPES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="request-goal">What outcome do you want?</Label><Input id="request-goal" maxLength={240} value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. Identify the strongest improvements to my CV" /></div><div className="space-y-2"><Label htmlFor="request-context">Context</Label><Textarea id="request-context" rows={5} maxLength={2000} value={context} onChange={(e) => setContext(e.target.value)} placeholder="Explain the role, challenge and guidance you need." /></div><div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="request-deadline">Deadline</Label><Input id="request-deadline" type="date" min={new Date().toISOString().slice(0,10)} value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="request-url">Supporting URL</Label><Input id="request-url" type="url" maxLength={500} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /></div></div><div className="space-y-2"><Label>Application context</Label><Select value={applicationId} onValueChange={setApplicationId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No application</SelectItem>{resources.applications.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>CV</Label><Select value={resumeId} onValueChange={setResumeId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">No CV</SelectItem>{resources.resumes.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select><p className="text-xs text-muted-foreground">The mentor sees only the CV title until accepting.</p></div><label className="flex items-start gap-2 rounded-md border p-3 text-sm"><Checkbox checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} /><span>I agree that our account emails will be exchanged if this request is accepted. A selected CV becomes readable by this mentor only after acceptance.</span></label><Button type="submit" className="w-full" disabled={!consent || submitting}>{submitting && <Loader2 className="h-4 w-4 animate-spin" />}Send request</Button></form></CardContent></Card>
    </div>
  </PageLayout>;
}
