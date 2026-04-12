import React, { useState, useEffect } from 'react';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Mic, Briefcase, MapPin, ArrowRight, TrendingUp, ClipboardList, FolderOpen, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ReadinessOverview from '@/components/learn/ReadinessOverview';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { GuidedJourney } from '@/components/assessment/GuidedJourney';
import { ReferralCard } from '@/components/referral/ReferralCard';
import { UniversityInsightsCard } from '@/components/dashboard/UniversityInsightsCard';

interface QuickStat {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href: string;
}

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

  const readiness = useCareerReadiness(major);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const userId = session.user.id;

      const [studentRes, assessmentRes, appsRes, interviewRes, resumeRes, jobsRes] = await Promise.all([
        supabase.from('student_details').select('major, school').eq('user_id', userId).maybeSingle(),
        supabase.from('assessments').select('primary_interest').eq('user_id', userId).not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(1),
        supabase.from('job_applications').select('id').eq('applicant_id', userId),
        supabase.from('mock_interviews').select('overall_score').eq('user_id', userId).not('overall_score', 'is', null).order('created_at', { ascending: false }).limit(1),
        supabase.from('resumes').select('personal_info, education, experience, skills, projects').eq('user_id', userId).eq('is_primary', true).maybeSingle(),
        supabase.from('job_postings').select('id, title, location, employment_type, created_at').eq('status', 'active').order('created_at', { ascending: false }).limit(5),
      ]);

      if (studentRes.data) {
        setMajor(studentRes.data.major);
        setUniversity(studentRes.data.school || null);
      }

      if (assessmentRes.data?.[0]?.primary_interest) {
        setTopCareer({ title: assessmentRes.data[0].primary_interest, industry: assessmentRes.data[0].primary_interest });
      }

      setJobMatches(jobsRes.data || []);

      // Simple CV score calc
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

  const quickStats: QuickStat[] = [
    { label: 'Applications', value: stats.applications, icon: Briefcase, href: '/applications' },
    { label: 'CV Strength', value: `${stats.cvScore}%`, icon: FileText, href: '/cv-builder' },
    { label: 'Interview Score', value: stats.interviewScore > 0 ? `${stats.interviewScore}%` : '—', icon: Mic, href: '/interview-simulator' },
  ];

  // Determine if user is "new" — no assessment, no CV, no applications
  const isNewUser = !topCareer && stats.cvScore === 0 && stats.applications === 0 && stats.interviewScore === 0;

  const getStartedSteps = [
    { label: 'Take the career assessment', description: 'Discover your ideal career path in 10 minutes', icon: ClipboardList, href: '/assessment', done: !!topCareer },
    { label: 'Build your CV', description: 'Create a professional, ATS-friendly CV', icon: FileText, href: '/cv-builder', done: stats.cvScore > 0 },
    { label: 'Practice an interview', description: 'Simulate a real interview and get AI feedback', icon: Mic, href: '/interview-simulator', done: stats.interviewScore > 0 },
    { label: 'Add a portfolio project', description: 'Showcase your work to stand out', icon: FolderOpen, href: '/portfolio', done: false },
  ];

  return (
    <StudentLayout title="Dashboard">
      <div className="space-y-6">
        {/* Getting Started — shown for new users */}
        {isNewUser && !loading && (
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Welcome to Syncareer 👋</CardTitle>
              <p className="text-sm text-muted-foreground">Complete these steps to unlock your full career potential.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {getStartedSteps.map((step) => (
                <div
                  key={step.label}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-background cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => navigate(step.href)}
                >
                  <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-primary/10' : 'bg-muted'}`}>
                    {step.done ? <CheckCircle className="h-5 w-5 text-primary" /> : <step.icon className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{step.label}</p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Readiness Overview */}
        {!readiness.loading && major && (
          <ReadinessOverview
            score={readiness.overallScore}
            level={readiness.level}
            careerPath={major}
          />
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickStats.map((stat) => (
            <Card
              key={stat.label}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(stat.href)}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <stat.icon className="h-8 w-8 text-muted-foreground/40" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Guided Journey */}
        <GuidedJourney
          topCareerTitle={topCareer?.title}
          topCareerIndustry={topCareer?.industry}
        />

        {/* Two column layout for bottom cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Job Matches */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Recent Job Matches
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/opportunities')} className="text-xs">
                  View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {jobMatches.length > 0 ? (
                <div className="space-y-2">
                  {jobMatches.map((job) => (
                    <div key={job.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{job.title}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {job.location} · {job.employment_type}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">New</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">No job matches yet. Complete your assessment to get matched.</p>
              )}
            </CardContent>
          </Card>

          {/* Referral Card */}
          <ReferralCard />
        </div>

        {/* University Insights */}
        <UniversityInsightsCard university={university} major={major} />
      </div>
    </StudentLayout>
  );
};

export default Dashboard;
