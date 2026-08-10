import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
  Briefcase, MapPin, DollarSign, CheckCircle2, XCircle,
  ExternalLink, Search, Bookmark, BookmarkCheck, MessageSquare, FileText, X, AlertCircle, BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOutcomeTracking } from '@/hooks/useOutcomeTracking';
import { useNavigate } from 'react-router-dom';

interface JobPosting {
  id: string;
  title: string;
  department: string | null;
  location: string;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  description: string;
  requirements: string | null;
  skills: string[] | null;
  created_at: string;
  employer_id: string | null;
  source: string;
  source_url: string | null;
  is_external: boolean;
  application_deadline?: string | null;
  company_name?: string | null;
  company_domain?: string | null;
  experience_level?: string | null;
}

interface JobWithMatch extends JobPosting {
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
}

const EMPLOYMENT_TYPES = ['all', 'full-time', 'part-time', 'internship', 'contract', 'remote'];
const EXPERIENCE_LEVELS = ['all', 'entry', 'mid', 'senior'];
const DEADLINE_FILTERS = [
  { value: 'all', label: 'Any deadline' },
  { value: '7', label: 'Closing in 7 days' },
  { value: '30', label: 'Closing in 30 days' },
];

function getCompanyInitials(name: string | null | undefined, fallback: string): string {
  const source = (name || fallback || '?').trim();
  return source.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';
}

function CompanyLogo({ job, size = 40 }: { job: JobPosting; size?: number }) {
  const [errored, setErrored] = useState(false);
  const domain = job.company_domain;
  const showImg = domain && !errored;
  return (
    <div
      className="rounded-md bg-muted flex items-center justify-center font-semibold text-muted-foreground overflow-hidden shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {showImg ? (
        <img
          src={`https://logo.clearbit.com/${domain}`}
          alt={job.company_name || job.department || 'Company'}
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span>{getCompanyInitials(job.company_name, job.department || job.title)}</span>
      )}
    </div>
  );
}

const Opportunities = () => {
  const { studentDetails, loading: profileLoading } = useUserProfile();
  const { trackAction, triggerIntelligenceRefresh } = useOutcomeTracking();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<JobWithMatch[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [userDbSkills, setUserDbSkills] = useState<string[] | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [experienceFilter, setExperienceFilter] = useState('all');
  const [deadlineFilter, setDeadlineFilter] = useState('all');
  const [tab, setTab] = useState<'all' | 'saved'>('all');

  useEffect(() => {
    const fetchUserSkills = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_skills')
        .select('skill_name')
        .eq('user_id', user.id);
      if (data && data.length > 0) setUserDbSkills(data.map(s => s.skill_name));

      const { data: saved } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('user_id', user.id);
      if (saved) setSavedIds(new Set(saved.map(s => s.job_id)));
    };
    fetchUserSkills();
  }, []);

  const getUserSkills = useCallback((): string[] => {
    if (userDbSkills && userDbSkills.length > 0) return userDbSkills;
    const major = studentDetails?.major?.toLowerCase() || '';
    if (major.includes('computer') || major.includes('software') || major.includes('data'))
      return ['JavaScript', 'React', 'Python', 'SQL', 'Git', 'TypeScript', 'Node.js', 'HTML', 'CSS'];
    if (major.includes('business') || major.includes('finance') || major.includes('marketing'))
      return ['Excel', 'Financial Analysis', 'Marketing', 'Communication', 'Project Management', 'Data Analysis'];
    if (major.includes('design') || major.includes('graphic'))
      return ['Figma', 'Adobe Creative Suite', 'UI/UX', 'Prototyping', 'Visual Design'];
    if (major.includes('engineering'))
      return ['CAD', 'Project Management', 'Technical Writing', 'Problem Solving', 'Mathematics'];
    return ['Communication', 'Problem Solving', 'Teamwork', 'Microsoft Office'];
  }, [studentDetails?.major, userDbSkills]);

  const calculateMatch = useCallback((jobSkills: string[] | null, userSkills: string[]) => {
    if (!jobSkills || jobSkills.length === 0) return { percentage: 75, matched: [] as string[], missing: [] as string[] };
    const norm = userSkills.map(s => s.toLowerCase());
    const matched: string[] = [];
    const missing: string[] = [];
    jobSkills.forEach(skill => {
      const ns = skill.toLowerCase();
      if (norm.some(us => us.includes(ns) || ns.includes(us))) matched.push(skill);
      else missing.push(skill);
    });
    const percentage = Math.max(Math.round((matched.length / jobSkills.length) * 100), 20);
    return { percentage, matched, missing };
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'active')
        .eq('is_external', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const userSkills = getUserSkills();
      const enriched: JobWithMatch[] = (data || []).map(j => {
        const m = calculateMatch(j.skills, userSkills);
        return { ...j, matchPercentage: m.percentage, matchedSkills: m.matched, missingSkills: m.missing };
      });
      enriched.sort((a, b) => b.matchPercentage - a.matchPercentage);
      setJobs(enriched);
      if (enriched.length && !selectedId) setSelectedId(enriched[0]!.id);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, [getUserSkills, calculateMatch, selectedId]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const toggleSave = async (jobId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Please log in'); return; }
    if (savedIds.has(jobId)) {
      await supabase.from('saved_jobs').delete().eq('user_id', user.id).eq('job_id', jobId);
      const next = new Set(savedIds); next.delete(jobId); setSavedIds(next);
    } else {
      await supabase.from('saved_jobs').insert({ user_id: user.id, job_id: jobId });
      const next = new Set(savedIds); next.add(jobId); setSavedIds(next);
      toast.success('Saved');
    }
  };

  const handleApply = async (job: JobWithMatch) => {
    setApplying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error('Please log in to apply'); return; }
      const { data: existing } = await supabase
        .from('job_applications').select('id')
        .eq('job_id', job.id).eq('applicant_id', session.user.id).maybeSingle();
      if (existing) { toast.info('Already applied'); return; }
      const { error } = await supabase.from('job_applications').insert({
        job_id: job.id, applicant_id: session.user.id, status: 'pending',
      });
      if (error) throw error;
      toast.success('Application submitted');
      trackAction({ itemTitle: job.title, itemId: job.id, type: 'job', action: 'applied', confidence: job.matchPercentage / 100 });
      triggerIntelligenceRefresh();
    } catch (e) {
      console.error(e); toast.error('Failed to submit');
    } finally { setApplying(false); }
  };

  // Filtered list
  const filtered = useMemo(() => {
    const now = Date.now();
    return jobs.filter(j => {
      if (tab === 'saved' && !savedIds.has(j.id)) return false;
      if (search) {
        const q = search.toLowerCase();
        const blob = `${j.title} ${j.company_name || ''} ${j.department || ''} ${(j.skills || []).join(' ')}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      if (locationFilter) {
        if (!j.location?.toLowerCase().includes(locationFilter.toLowerCase())) return false;
      }
      if (typeFilter !== 'all' && j.employment_type !== typeFilter) return false;
      if (experienceFilter !== 'all' && j.experience_level !== experienceFilter) return false;
      if (deadlineFilter !== 'all' && j.application_deadline) {
        const days = Math.ceil((new Date(j.application_deadline).getTime() - now) / 86400000);
        if (days > Number(deadlineFilter) || days < 0) return false;
      }
      return true;
    });
  }, [jobs, tab, savedIds, search, locationFilter, typeFilter, experienceFilter, deadlineFilter]);

  const selected = filtered.find(j => j.id === selectedId) || filtered[0];

  useEffect(() => {
    if (filtered.length && !filtered.find(j => j.id === selectedId)) {
      setSelectedId(filtered[0]!.id);
    }
  }, [filtered, selectedId]);

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return 'Competitive';
    const c = currency || 'USD';
    if (min && max) return `${c} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    return min ? `${c} ${min.toLocaleString()}+` : `Up to ${c} ${max?.toLocaleString()}`;
  };

  const formatTimeAgo = (s: string) => {
    const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 7) return `${d}d ago`;
    if (d < 30) return `${Math.floor(d / 7)}w ago`;
    return `${Math.floor(d / 30)}mo ago`;
  };

  const deadlineUrgency = (deadline: string | null | undefined) => {
    if (!deadline) return null;
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
    if (days < 0) return null;
    if (days <= 7) return { label: `Closes in ${days}d`, urgent: true };
    return { label: `Deadline ${new Date(deadline).toLocaleDateString()}`, urgent: false };
  };

  const activeFilterCount =
    (search ? 1 : 0) + (locationFilter ? 1 : 0) +
    (typeFilter !== 'all' ? 1 : 0) + (experienceFilter !== 'all' ? 1 : 0) +
    (deadlineFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setSearch(''); setLocationFilter(''); setTypeFilter('all');
    setExperienceFilter('all'); setDeadlineFilter('all');
  };

  if (profileLoading || loading) {
    return (
      <PageLayout title="Opportunities">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading opportunities...</p>
        </div>
      </PageLayout>
    );
  }

  const renderJobRow = (job: JobWithMatch) => {
    const urgency = deadlineUrgency(job.application_deadline);
    const isSelected = selected?.id === job.id;
    return (
      <button
        key={job.id}
        onClick={() => { setSelectedId(job.id); if (window.innerWidth < 1024) setMobileDetailOpen(true); }}
        className={`w-full text-left p-4 border-l-4 transition-colors ${
          isSelected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
        }`}
      >
        <div className="flex items-start gap-3">
          <CompanyLogo job={job} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight truncate">{job.title}</h3>
              <span className={`text-xs font-bold shrink-0 ${
                job.matchPercentage >= 80 ? 'text-green-600' :
                job.matchPercentage >= 60 ? 'text-yellow-600' : 'text-muted-foreground'
              }`}>{job.matchPercentage}%</span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {job.company_name || job.department || 'Company'}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
              <span>•</span>
              <span className="capitalize">{job.employment_type}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {urgency && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  urgency.urgent ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                }`}>
                  {urgency.urgent && <AlertCircle className="h-3 w-3 inline mr-1" />}
                  {urgency.label}
                </span>
              )}
              {job.is_external && (
                <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">via {job.source}</Badge>
              )}
            </div>
          </div>
        </div>
      </button>
    );
  };

  const renderDetail = (job: JobWithMatch | undefined) => {
    if (!job) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
          <Briefcase className="h-12 w-12 mb-4 opacity-50" />
          <p>Select a job to see the details</p>
        </div>
      );
    }
    const urgency = deadlineUrgency(job.application_deadline);
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-start gap-4">
          <CompanyLogo job={job} size={56} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold leading-tight">{job.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {job.company_name || job.department || 'Company'} • {formatTimeAgo(job.created_at)}
            </p>
            <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{job.location}</span>
              <span className="flex items-center gap-1 capitalize"><Briefcase className="h-4 w-4" />{job.employment_type}</span>
              <span className="flex items-center gap-1"><DollarSign className="h-4 w-4" />{formatSalary(job.salary_min, job.salary_max, job.salary_currency)}</span>
            </div>
            {urgency && (
              <div className={`inline-flex items-center gap-1 mt-3 text-xs px-2 py-1 rounded-full ${
                urgency.urgent ? 'bg-destructive/10 text-destructive font-medium' : 'bg-muted text-muted-foreground'
              }`}>
                {urgency.urgent && <AlertCircle className="h-3 w-3" />}
                {urgency.label}
              </div>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={() => toggleSave(job.id)}>
            {savedIds.has(job.id)
              ? <BookmarkCheck className="h-5 w-5 text-primary" />
              : <Bookmark className="h-5 w-5" />}
          </Button>
        </div>

        {/* Primary actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {job.is_external && job.source_url ? (
            <Button className="gap-2 sm:col-span-3" onClick={() => window.open(job.source_url!, '_blank')}>
              <ExternalLink className="h-4 w-4" />Apply on {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
            </Button>
          ) : (
            <Button className="gap-2 sm:col-span-3" onClick={() => handleApply(job)} disabled={applying}>
              <Briefcase className="h-4 w-4" />{applying ? 'Submitting...' : 'Apply with Syncareer'}
            </Button>
          )}
        </div>

        {/* Syncareer moat: Practice + Tailor CV */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate(`/interview-simulator?role=${encodeURIComponent(job.title)}&skills=${encodeURIComponent((job.skills || []).join(','))}`)}>
            <MessageSquare className="h-4 w-4" />Practice interview
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate(`/cv-builder?targetRole=${encodeURIComponent(job.title)}&skills=${encodeURIComponent((job.skills || []).join(','))}`)}>
            <FileText className="h-4 w-4" />Tailor my CV
          </Button>
        </div>

        {/* Match */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Match Score</span>
              <span className={`text-xl font-bold ${
                job.matchPercentage >= 80 ? 'text-green-600' :
                job.matchPercentage >= 60 ? 'text-yellow-600' : 'text-muted-foreground'
              }`}>{job.matchPercentage}%</span>
            </div>
            {job.matchedSkills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-green-700 mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />Skills you have
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {job.matchedSkills.map(s => (
                    <span key={s} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {job.missingSkills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-orange-700 mb-1.5 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />Skills to develop
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {job.missingSkills.map(s => (
                    <span key={s} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                      {s}
                    </span>
                  ))}
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <h4 className="font-semibold text-sm mb-2">Description</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.description}</p>
        </div>
        {job.requirements && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Requirements</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <PageLayout title="Opportunities">
      {/* Search + filter bar */}
      <div className="space-y-3 mb-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search jobs, companies, or skills..." className="pl-9" />
          </div>
          <div className="relative w-48 hidden sm:block">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={locationFilter} onChange={e => setLocationFilter(e.target.value)}
              placeholder="Location" className="pl-9" />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/analysis')}
            className="h-10 shrink-0 gap-1.5 text-muted-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            Market Intelligence
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-auto min-w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t === 'all' ? 'All types' : t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={experienceFilter} onValueChange={setExperienceFilter}>
            <SelectTrigger className="w-auto min-w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map(l => <SelectItem key={l} value={l} className="capitalize">{l === 'all' ? 'Any experience' : l}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
            <SelectTrigger className="w-auto min-w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEADLINE_FILTERS.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="gap-1">
              <X className="h-3 w-3" />Reset ({activeFilterCount})
            </Button>
          )}
          <div className="ml-auto text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? 'job' : 'jobs'}
          </div>
        </div>
        <Tabs value={tab} onValueChange={v => setTab(v as 'all' | 'saved')}>
          <TabsList>
            <TabsTrigger value="all">All Jobs</TabsTrigger>
            <TabsTrigger value="saved" className="gap-1.5">
              <Bookmark className="h-3.5 w-3.5" />Saved ({savedIds.size})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Two-pane layout */}
      <div className="grid lg:grid-cols-[minmax(340px,420px)_1fr] gap-4 h-[calc(100vh-280px)] min-h-[500px]">
        <Card className="overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto divide-y">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{tab === 'saved' ? 'No saved jobs yet.' : 'No jobs match your filters.'}</p>
              </div>
            ) : filtered.map(renderJobRow)}
          </div>
        </Card>
        <Card className="hidden lg:block overflow-hidden">
          <div className="h-full overflow-y-auto">{renderDetail(selected)}</div>
        </Card>
      </div>

      {/* Mobile detail dialog */}
      <Dialog open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 lg:hidden">
          {renderDetail(selected)}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Opportunities;
