import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Mic, Briefcase, MapPin, ArrowRight, TrendingUp, ClipboardList, FolderOpen, CheckCircle, Target, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { GuidedJourney } from '@/components/assessment/GuidedJourney';
import { ReferralCard } from '@/components/referral/ReferralCard';
import { UniversityInsightsCard } from '@/components/dashboard/UniversityInsightsCard';
import AnimatedSection from '@/components/landing/AnimatedSection';
import { useNextBestAction } from '@/hooks/useNextBestAction';

interface JobMatch {
  id: string;
  title: string;
  location: string;
  employment_type: string;
  created_at: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [major, setMajor] = useState<string | null>(null);
  const [university, setUniversity] = useState<string | null>(null);
  const [topCareer, setTopCareer] = useState<{ title: string; industry: string } | null>(null);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [stats, setStats] = useState({ applications: 0, interviewScore: 0, cvScore: 0 });
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState<string>('');

  const readiness = useCareerReadiness(major);
  const nextAction = useNextBestAction({
    hasAssessment: !!topCareer,
    cvScore: stats.cvScore,
    interviewScore: stats.interviewScore,
    applications: stats.applications,
  });

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      const [studentRes, assessmentRes, appsRes, interviewRes, resumeRes, jobsRes, profileRes] = await Promise.all([
        supabase.from('student_details').select('major, school').eq('user_id', userId).maybeSingle(),
        supabase.from('assessments').select('primary_interest').eq('user_id', userId).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1),
        supabase.from('job_applications').select('id').eq('applicant_id', userId),
        supabase.from('mock_interviews').select('overall_score').eq('user_id', userId).not('overall_score', 'is', null).order('created_at', { ascending: false }).limit(1),
        supabase.from('resumes').select('personal_info, education, experience, skills, projects').eq('user_id', userId).eq('is_primary', true).maybeSingle(),
        supabase.from('job_postings').select('id, title, location, employment_type, created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
        supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      ]);

      if (profileRes.data?.full_name) {
        setFullName(profileRes.data.full_name.split(' ')[0]);
      }

      if (studentRes.data) {
        setMajor(studentRes.data.major);
        setUniversity(studentRes.data.school || null);
      }

      if (assessmentRes.data?.[0]?.primary_interest) {
        setTopCareer({ title: assessmentRes.data[0].primary_interest, industry: assessmentRes.data[0].primary_interest });
      }

      setJobMatches(jobsRes.data || []);

      let cvScore = 0;
      if (resumeRes.data) {
        const r = resumeRes.data as any;
        if (r.personal_info?.fullName || r.personal_info?.full_name) cvScore += 15;
        if (r.personal_info?.email) cvScore += 10;
        if (Array.isArray(r.education) && r.education.length > 0) cvScore += 20;
        if (Array.isArray(r.experience) && r.experience.length > 0) cvScore += 20;
        if (Array.isArray(r.skills) && r.skills.length > 0) cvScore += 15;
        if (Array.isArray(r.projects) && r.projects.length > 0) cvScore += 15;
        cvScore = Math.min(100, cvScore);
      }

      setStats({
        applications: appsRes.data?.length || 0,
        interviewScore: interviewRes.data?.[0]?.overall_score || 0,
        cvScore,
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  const isNewUser = !topCareer && stats.cvScore === 0 && stats.applications === 0 && stats.interviewScore === 0;

  const getStartedSteps = [
    { label: 'Take the career assessment', description: 'Discover your ideal career path in 10 minutes', icon: ClipboardList, href: '/assessment', done: !!topCareer },
    { label: 'Build your CV', description: 'Create a professional, ATS-friendly CV', icon: FileText, href: '/cv-builder', done: stats.cvScore > 0 },
    { label: 'Practice an interview', description: 'Simulate a real interview and get AI feedback', icon: Mic, href: '/interview-simulator', done: stats.interviewScore > 0 },
    { label: 'Add a portfolio project', description: 'Showcase your work to stand out', icon: FolderOpen, href: '/portfolio', done: false },
  ];

  const statCards = [
    {
      label: 'Applications',
      value: stats.applications,
      icon: Briefcase,
      href: '/applications',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'CV Strength',
      value: `${stats.cvScore}%`,
      icon: FileText,
      href: '/cv-builder',
      color: stats.cvScore >= 60 ? 'text-green-600' : stats.cvScore > 0 ? 'text-amber-600' : 'text-muted-foreground',
      bgColor: stats.cvScore >= 60 ? 'bg-green-50 dark:bg-green-950/30' : stats.cvScore > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted',
      progress: stats.cvScore,
    },
    {
      label: 'Interview Score',
      value: stats.interviewScore > 0 ? `${stats.interviewScore}%` : '—',
      icon: Mic,
      href: '/interview-simulator',
      color: stats.interviewScore >= 70 ? 'text-green-600' : stats.interviewScore > 0 ? 'text-amber-600' : 'text-muted-foreground',
      bgColor: stats.interviewScore >= 70 ? 'bg-green-50 dark:bg-green-950/30' : stats.interviewScore > 0 ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-muted',
      progress: stats.interviewScore > 0 ? stats.interviewScore : undefined,
    },
  ];

  return (
    <StudentLayout title="">
      <div className="space-y-8">
        {/* Slim Greeting */}
        <AnimatedSection y={16}>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h1 className="font-serif text-2xl md:text-3xl font-normal tracking-[-0.02em] text-foreground">
              {fullName ? <>Welcome back, <span className="italic text-primary">{fullName}</span></> : <>Welcome <span className="italic text-primary">back</span></>}
            </h1>
            {major && (
              <p className="text-xs text-muted-foreground">
                {major}{university ? ` · ${university}` : ''}
              </p>
            )}
          </div>
        </AnimatedSection>

        {/* HERO: Next Best Action — the single thing that matters right now */}
        {!loading && (
          <AnimatedSection delay={0.05} y={20}>
            <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
              <CardContent className="p-8 md:p-10">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Your next move</p>
                    <h2 className="font-serif text-3xl md:text-4xl font-normal leading-tight tracking-[-0.02em] text-foreground">
                      {nextAction.title}
                    </h2>
                    <p className="text-base text-muted-foreground max-w-xl">{nextAction.description}</p>
                  </div>
                  <Button
                    size="lg"
                    onClick={() => navigate(nextAction.href)}
                    className="shrink-0 h-12 px-6 text-base"
                  >
                    {nextAction.ctaLabel} <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Below the fold — supporting context */}

        {/* Career Readiness — compact */}
        {!readiness.loading && major && (
          <AnimatedSection delay={0.1} y={20}>
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className="flex items-center justify-center px-5 py-4 bg-primary/5 border-r border-border">
                    <div className="relative h-16 w-16">
                      <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--muted))" strokeWidth="2.5" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeDasharray={`${readiness.overallScore}, 100`} strokeLinecap="round" className="transition-all duration-1000" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-base font-bold">{readiness.overallScore}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-4 flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Career Readiness</h2>
                      </div>
                      <Progress value={readiness.overallScore} className="h-1.5" />
                    </div>
                    <Badge variant="outline" className={
                      readiness.level === 'Career Ready' ? 'border-green-500 text-green-600' :
                      readiness.level === 'Proficient' ? 'border-primary text-primary' :
                      readiness.level === 'Developing' ? 'border-amber-500 text-amber-600' :
                      'border-muted-foreground text-muted-foreground'
                    }>
                      {readiness.level}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        )}

        {/* Getting Started — shown for new users only */}
        {isNewUser && !loading && (
          <AnimatedSection delay={0.12} y={20}>
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Get Started</CardTitle>
                  <p className="text-xs text-muted-foreground">Complete these steps to unlock your career potential</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {getStartedSteps.map((step) => (
                <div
                  key={step.label}
                  data-tour={
                    step.href === '/assessment'
                      ? 'student-assessment'
                      : step.href === '/cv-builder'
                      ? 'student-cv'
                      : step.href === '/interview-simulator'
                      ? 'student-interview'
                      : undefined
                  }
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all group"
                  onClick={() => navigate(step.href)}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${step.done ? 'bg-green-100 dark:bg-green-950/30' : 'bg-muted group-hover:bg-primary/10'}`}>
                    {step.done ? <CheckCircle className="h-4 w-4 text-green-600" /> : <step.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                </div>
              ))}
            </CardContent>
          </Card>
          </AnimatedSection>
        )}

        {/* Stat Cards */}
        <AnimatedSection delay={0.16} y={20}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {statCards.map((stat) => (
            <Card
              key={stat.label}
              className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all group"
              onClick={() => navigate(stat.href)}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                  </div>
                  <div className={`h-10 w-10 rounded-xl ${stat.bgColor} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
                {stat.progress !== undefined && (
                  <Progress value={stat.progress} className="h-1.5" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        </AnimatedSection>

        {/* Guided Journey */}
        <AnimatedSection delay={0.2} y={20}>
          <GuidedJourney
            topCareerTitle={topCareer?.title}
            topCareerIndustry={topCareer?.industry}
          />
        </AnimatedSection>

        {/* Two column layout for bottom cards */}
        <AnimatedSection delay={0.24} y={20}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Job Matches */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Recent Job Matches
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/opportunities')} className="text-xs h-8 rounded-full">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {jobMatches.length > 0 ? (
                <div className="space-y-2">
                  {jobMatches.map((job) => (
                    <div key={job.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:border-primary/20 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {job.location} · {job.employment_type}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px] shrink-0">New</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Briefcase className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No job matches yet.</p>
                  <p className="text-xs text-muted-foreground">Complete your assessment to get matched.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Card */}
          <ReferralCard />
        </div>
        </AnimatedSection>

        {/* University Insights */}
        <AnimatedSection delay={0.28} y={20}>
          <UniversityInsightsCard university={university} major={major} />
        </AnimatedSection>
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
