import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Briefcase, ChevronDown, ChevronUp, GraduationCap, Lightbulb, Sparkles, TrendingUp, Zap, MapPin, FileText, Mic, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppShareButton } from '@/components/shared/WhatsAppShareButton';
import type { CareerRecommendation } from '@/hooks/useCareerRecommendations';

interface CareerCardProps {
  rec: CareerRecommendation;
  rank: number;
}

const CareerCard = ({ rec, rank }: CareerCardProps) => {
  const [open, setOpen] = useState(false);
  const { career, matchScore, explanation } = rec;

  const matchColor =
    matchScore >= 80 ? 'text-success' :
    matchScore >= 60 ? 'text-warning' :
    'text-muted-foreground';

  return (
    <Card className="card-hover-effect hover:shadow-md transition-shadow">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                  {rank}
                </span>
                <h3 className="font-semibold text-base truncate">{career.title}</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{explanation}</p>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className={`text-lg font-bold ${matchColor}`}>{matchScore}%</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Match</span>
            </div>
          </div>

          <div className="mt-3">
            <Progress value={matchScore} className="h-1.5" />
          </div>

          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1.5 flex-wrap">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {career.industry}
              </Badge>
              {career.salary_range && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {career.salary_range}
                </Badge>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                {open ? <ChevronUp className="h-3.5 w-3.5 mr-1" /> : <ChevronDown className="h-3.5 w-3.5 mr-1" />}
                {open ? 'Less' : 'More'}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardContent>

        <CollapsibleContent>
          <div className="px-6 pb-5 space-y-4 border-t pt-4">
            <p className="text-sm text-muted-foreground">{career.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium">Suggested Majors</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {career.suggested_majors.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{m}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-medium">Skills to Build</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {career.required_skills.map((s, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

interface JobMatch {
  id: string;
  title: string;
  location: string;
  employment_type: string;
  skills: string[] | null;
}

interface CareerRecommendationsProps {
  recommendations: CareerRecommendation[];
  clusterInsight: { title: string; themes: string[] } | null;
  primaryInterest: string | null;
  secondaryInterest: string | null;
  tertiaryInterest: string | null;
  loading: boolean;
}

const CareerRecommendations = ({
  recommendations,
  clusterInsight,
  primaryInterest,
  secondaryInterest,
  tertiaryInterest,
  loading,
}: CareerRecommendationsProps) => {
  const navigate = useNavigate();
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);

  // Fetch matching jobs based on career recommendation industries
  useEffect(() => {
    if (recommendations.length === 0) return;

    const fetchJobs = async () => {
      setJobsLoading(true);
      try {
        const { data } = await supabase
          .from('job_postings')
          .select('id, title, location, employment_type, skills')
          .eq('status', 'active')
          .limit(5);

        setJobMatches(data || []);
      } catch (err) {
        console.error('Failed to fetch job matches:', err);
      } finally {
        setJobsLoading(false);
      }
    };

    fetchJobs();
  }, [recommendations]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">Loading career recommendations...</p>
        </CardContent>
      </Card>
    );
  }

  if (recommendations.length === 0) return null;

  const topCareer = recommendations[0]?.career;

  return (
    <div className="space-y-6">
      {/* Interest Badges + Cluster */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Your Career Profile
            </CardTitle>
            <WhatsAppShareButton
              text={`I just discovered my top career match is ${topCareer?.title || 'amazing'} on Syncareer! Take the free assessment:`}
              url={`${window.location.origin}/assessment`}
            >
              Share Result
            </WhatsAppShareButton>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {primaryInterest && (
              <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">
                🥇 {primaryInterest}
              </Badge>
            )}
            {secondaryInterest && (
              <Badge variant="secondary" className="text-sm px-3 py-1">
                🥈 {secondaryInterest}
              </Badge>
            )}
            {tertiaryInterest && (
              <Badge variant="outline" className="text-sm px-3 py-1">
                🥉 {tertiaryInterest}
              </Badge>
            )}
          </div>

          {clusterInsight && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-warning" />
                <span className="font-semibold text-sm">Cluster Insight: {clusterInsight.title}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {clusterInsight.themes.map((theme, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-background">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Career Cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Briefcase className="h-5 w-5 text-primary" />
            Recommended Careers
            <Badge variant="secondary" className="ml-auto text-xs font-normal">
              {recommendations.length} matches
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {recommendations.map((rec, idx) => (
              <CareerCard key={rec.career.id} rec={rec} rank={idx + 1} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Jobs You Qualify For */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-primary" />
            Jobs You Qualify For
          </CardTitle>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Loading job matches...</p>
          ) : jobMatches.length > 0 ? (
            <div className="space-y-3">
              {jobMatches.map((job) => (
                <div key={job.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location} · {job.employment_type}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate('/markets')} className="shrink-0 text-xs">
                    Prepare & Apply
                  </Button>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-sm" onClick={() => navigate('/markets')}>
                View all opportunities <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-1">No open positions yet matching your profile.</p>
              <p className="text-xs text-muted-foreground">We'll notify you when matching jobs are posted.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actionable Next Steps */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-accent" />
            Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/interview', { state: { prefillRole: topCareer?.title, prefillIndustry: topCareer?.industry } })}
              className="rounded-lg border p-4 space-y-2 text-left hover:border-primary/30 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Practice Interview</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Practice for {topCareer?.industry || 'your top'} industry roles
              </p>
              <span className="text-xs text-primary flex items-center gap-1">
                Start now <ArrowRight className="h-3 w-3" />
              </span>
            </button>
            <button
              onClick={() => navigate('/cv-builder')}
              className="rounded-lg border p-4 space-y-2 text-left hover:border-primary/30 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Build Your CV</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Create an ATS-friendly CV for your target roles
              </p>
              <span className="text-xs text-primary flex items-center gap-1">
                Open builder <ArrowRight className="h-3 w-3" />
              </span>
            </button>
            <button
              onClick={() => navigate('/markets')}
              className="rounded-lg border p-4 space-y-2 text-left hover:border-primary/30 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-secondary" />
                <span className="text-sm font-medium">View Opportunities</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Browse {jobMatches.length > 0 ? `${jobMatches.length}+` : ''} open positions matching your profile
              </p>
              <span className="text-xs text-primary flex items-center gap-1">
                Browse jobs <ArrowRight className="h-3 w-3" />
              </span>
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CareerRecommendations;
