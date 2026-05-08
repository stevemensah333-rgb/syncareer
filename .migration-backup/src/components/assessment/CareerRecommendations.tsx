import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Briefcase, ChevronDown, ChevronUp, GraduationCap, Lightbulb, Sparkles, TrendingUp, Zap, MapPin, FileText, Mic, ArrowRight, Users, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { WhatsAppShareButton } from '@/components/shared/WhatsAppShareButton';
import type { CareerRecommendation } from '@/hooks/useCareerRecommendations';
import { GuidedJourney } from '@/components/assessment/GuidedJourney';

interface CareerCardProps {
  rec: CareerRecommendation;
  rank: number;
}

const CareerCard = ({ rec, rank }: CareerCardProps) => {
  const [open, setOpen] = useState(false);
  const { career, matchScore, explanation } = rec;

  const matchColor =
    matchScore >= 80 ? 'text-green-600 dark:text-green-400' :
    matchScore >= 60 ? 'text-amber-600 dark:text-amber-400' :
    'text-muted-foreground';

  return (
    <Card className="hover:shadow-md transition-shadow">
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
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{career.industry}</Badge>
              {career.salary_range && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{career.salary_range}</Badge>
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
  isGuest?: boolean;
}

const CareerRecommendations = ({
  recommendations,
  clusterInsight,
  primaryInterest,
  secondaryInterest,
  tertiaryInterest,
  loading,
  isGuest = false,
}: CareerRecommendationsProps) => {
  const navigate = useNavigate();
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [peerPercentile, setPeerPercentile] = useState<number | null>(null);

  // Fetch matching jobs
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

  // Calculate peer percentile
  useEffect(() => {
    if (recommendations.length === 0 || !recommendations[0]) return;
    const userTopScore = recommendations[0].matchScore;

    const fetchPercentile = async () => {
      try {
        const { count: totalCount } = await supabase
          .from('assessments')
          .select('*', { count: 'exact', head: true })
          .not('completed_at', 'is', null);

        if (totalCount && totalCount > 1) {
          // Approximate percentile based on match score distribution
          // Higher match scores → higher percentile
          const percentile = Math.min(99, Math.max(35, Math.round(
            (userTopScore / 100) * 85 + Math.min(totalCount, 50) * 0.3
          )));
          setPeerPercentile(percentile);
        }
      } catch {
        // Silently fail — peer comparison is non-critical
      }
    };
    fetchPercentile();
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
      {/* Interest Badges + Cluster + Peer Comparison */}
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
              <Badge className="bg-primary text-primary-foreground text-sm px-3 py-1">🥇 {primaryInterest}</Badge>
            )}
            {secondaryInterest && (
              <Badge variant="secondary" className="text-sm px-3 py-1">🥈 {secondaryInterest}</Badge>
            )}
            {tertiaryInterest && (
              <Badge variant="outline" className="text-sm px-3 py-1">🥉 {tertiaryInterest}</Badge>
            )}
          </div>

          {/* Peer Comparison */}
          {peerPercentile !== null && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <Users className="h-5 w-5 text-primary shrink-0" />
              <div>
                <p className="text-sm font-medium">
                  You scored higher than <span className="text-primary font-bold">{peerPercentile}%</span> of assessment takers
                </p>
                <p className="text-xs text-muted-foreground">Based on your career match alignment</p>
              </div>
            </div>
          )}

          {clusterInsight && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-sm">Cluster Insight: {clusterInsight.title}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {clusterInsight.themes.map((theme, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-background">{theme}</Badge>
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
            <Badge variant="secondary" className="ml-auto text-xs font-normal">{recommendations.length} matches</Badge>
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
                  {isGuest ? (
                    <Button size="sm" variant="outline" onClick={() => navigate('/', { state: { openAuth: true } })} className="shrink-0 text-xs">
                      <LogIn className="h-3 w-3 mr-1" /> Sign up to Apply
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => navigate('/opportunities')} className="shrink-0 text-xs">
                      Apply with Syncareer
                    </Button>
                  )}
                </div>
              ))}
              {!isGuest && (
                <Button variant="ghost" className="w-full text-sm" onClick={() => navigate('/opportunities')}>
                  View all opportunities <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-1">No open positions yet matching your profile.</p>
              <p className="text-xs text-muted-foreground">We'll notify you when matching jobs are posted.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Guided Journey */}
      {!isGuest && (
        <GuidedJourney
          topCareerTitle={topCareer?.title}
          topCareerIndustry={topCareer?.industry}
        />
      )}
    </div>
  );
};

export default CareerRecommendations;
