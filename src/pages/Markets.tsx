import React, { useState, useEffect, useCallback } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Briefcase, MapPin, Clock, DollarSign, TrendingUp, Building2, CheckCircle2, XCircle, ExternalLink, Globe, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOutcomeTracking } from '@/hooks/useOutcomeTracking';

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
  employer_id: string;
  source: string;
  source_url: string | null;
  is_external: boolean;
}

interface JobWithMatch extends JobPosting {
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
}

interface EmployerInfo {
  company_name: string;
  industry: string | null;
  company_location: string | null;
  company_size: string | null;
  company_website: string | null;
  company_description: string | null;
}

const Opportunities = () => {
  const { studentDetails, loading: profileLoading } = useUserProfile();
  const { trackAction, triggerIntelligenceRefresh } = useOutcomeTracking();
  const [jobs, setJobs] = useState<JobWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobWithMatch | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [employerInfo, setEmployerInfo] = useState<EmployerInfo | null>(null);
  const [loadingEmployer, setLoadingEmployer] = useState(false);

  const [userDbSkills, setUserDbSkills] = useState<string[] | null>(null);

  // Fetch real skills from user_skills table
  useEffect(() => {
    const fetchUserSkills = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_skills')
        .select('skill_name')
        .eq('user_id', user.id);
      if (data && data.length > 0) {
        setUserDbSkills(data.map(s => s.skill_name));
      }
    };
    fetchUserSkills();
  }, []);

  // User's skills - prefer DB skills, fall back to major-based
  const getUserSkills = useCallback((): string[] => {
    if (userDbSkills && userDbSkills.length > 0) return userDbSkills;

    // Fallback to major-based skills
    const major = studentDetails?.major?.toLowerCase() || '';
    
    if (major.includes('computer') || major.includes('software') || major.includes('data')) {
      return ['JavaScript', 'React', 'Python', 'SQL', 'Git', 'TypeScript', 'Node.js', 'HTML', 'CSS'];
    } else if (major.includes('business') || major.includes('finance') || major.includes('marketing')) {
      return ['Excel', 'Financial Analysis', 'Marketing', 'Communication', 'Project Management', 'Data Analysis'];
    } else if (major.includes('design') || major.includes('graphic')) {
      return ['Figma', 'Adobe Creative Suite', 'UI/UX', 'Prototyping', 'Visual Design'];
    } else if (major.includes('engineering')) {
      return ['CAD', 'Project Management', 'Technical Writing', 'Problem Solving', 'Mathematics'];
    }
    return ['Communication', 'Problem Solving', 'Teamwork', 'Microsoft Office'];
  }, [studentDetails?.major, userDbSkills]);

  const calculateMatchPercentage = useCallback((jobSkills: string[] | null, userSkills: string[]): { percentage: number; matched: string[]; missing: string[] } => {
    if (!jobSkills || jobSkills.length === 0) {
      return { percentage: 75, matched: [], missing: [] }; // Default match if no skills specified
    }

    const normalizedUserSkills = userSkills.map(s => s.toLowerCase());
    const matched: string[] = [];
    const missing: string[] = [];

    jobSkills.forEach(skill => {
      const normalizedSkill = skill.toLowerCase();
      if (normalizedUserSkills.some(us => us.includes(normalizedSkill) || normalizedSkill.includes(us))) {
        matched.push(skill);
      } else {
        missing.push(skill);
      }
    });

    const percentage = jobSkills.length > 0 
      ? Math.round((matched.length / jobSkills.length) * 100)
      : 75;

    return { percentage: Math.max(percentage, 20), matched, missing };
  }, []);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userSkills = getUserSkills();
      
      const jobsWithMatch: JobWithMatch[] = (data || []).map(job => {
        const { percentage, matched, missing } = calculateMatchPercentage(job.skills, userSkills);
        return {
          ...job,
          matchPercentage: percentage,
          matchedSkills: matched,
          missingSkills: missing,
        };
      });

      // Sort by match percentage
      jobsWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage);
      
      setJobs(jobsWithMatch);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load opportunities');
    } finally {
      setLoading(false);
    }
  }, [getUserSkills, calculateMatchPercentage]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleApply = async (job: JobWithMatch) => {
    setApplying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('Please log in to apply');
        return;
      }

      // Check if already applied
      const { data: existing } = await supabase
        .from('job_applications')
        .select('id')
        .eq('job_id', job.id)
        .eq('applicant_id', session.user.id)
        .single();

      if (existing) {
        toast.info('You have already applied for this position');
        return;
      }

      const { error } = await supabase
        .from('job_applications')
        .insert({
          job_id: job.id,
          applicant_id: session.user.id,
          status: 'pending',
        });

      if (error) throw error;

      toast.success('Application submitted successfully!');
      setIsDialogOpen(false);

      // Track outcome and refresh intelligence
      trackAction({
        itemTitle: job.title,
        itemId: job.id,
        type: 'job',
        action: 'applied',
        confidence: job.matchPercentage / 100,
      });
      triggerIntelligenceRefresh();
    } catch (error) {
      console.error('Error applying:', error);
      toast.error('Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const formatSalary = (min: number | null, max: number | null, currency: string | null) => {
    if (!min && !max) return 'Competitive';
    const curr = currency || 'USD';
    if (min && max) return `${curr} ${min.toLocaleString()} - ${max.toLocaleString()}`;
    if (min) return `${curr} ${min.toLocaleString()}+`;
    return `Up to ${curr} ${max?.toLocaleString()}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const getJobsByType = (type: string) => {
    return jobs.filter(job => job.employment_type === type);
  };

  const renderJobCard = (job: JobWithMatch) => (
    <Card key={job.id} className="hover:border-primary/50 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{job.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <Building2 className="h-3 w-3" />
              <span>{job.department || 'General'}</span>
              <span>•</span>
              <MapPin className="h-3 w-3" />
              <span>{job.location}</span>
              {job.is_external && (
                <Badge variant="outline" className="text-xs capitalize">
                  via {job.source}
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${
              job.matchPercentage >= 80 ? 'text-green-600' :
              job.matchPercentage >= 60 ? 'text-yellow-600' :
              'text-muted-foreground'
            }`}>
              {job.matchPercentage}% Match
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {job.skills && job.skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {job.skills.slice(0, 5).map((skill) => (
                <span 
                  key={skill} 
                  className={`text-xs px-2 py-1 rounded-full ${
                    job.matchedSkills.includes(skill) 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="text-xs text-muted-foreground">+{job.skills.length - 5} more</span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {formatSalary(job.salary_min, job.salary_max, job.salary_currency)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTimeAgo(job.created_at)}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            {job.is_external && job.source_url ? (
              <Button 
                className="flex-1 gap-2"
                onClick={() => window.open(job.source_url!, '_blank')}
              >
                <ExternalLink className="h-4 w-4" />
                Apply on {job.source.charAt(0).toUpperCase() + job.source.slice(1)}
              </Button>
            ) : (
              <Button 
                className="flex-1 gap-2"
                onClick={() => handleApply(job)}
                disabled={applying}
              >
                <Briefcase className="h-4 w-4" />
                Apply with Syncareer
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={async () => {
                setSelectedJob(job);
                setIsDialogOpen(true);
                setEmployerInfo(null);
                if (!job.is_external) {
                  setLoadingEmployer(true);
                  const { data } = await supabase
                    .from('employer_details')
                    .select('company_name, industry, company_location, company_size, company_website, company_description')
                    .eq('user_id', job.employer_id)
                    .single();
                  setEmployerInfo(data as EmployerInfo | null);
                  setLoadingEmployer(false);
                }
              }}
            >
              Learn More
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderJobList = (type: string) => {
    const filteredJobs = getJobsByType(type);
    
    if (filteredJobs.length === 0) {
      return (
        <Card className="p-8 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No {type} opportunities available at the moment.</p>
          <p className="text-sm text-muted-foreground mt-2">Check back later for new postings!</p>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {filteredJobs.map(renderJobCard)}
      </div>
    );
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

  return (
    <PageLayout title="Opportunities">
      <Tabs defaultValue="full-time" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="full-time">
            Full-time ({getJobsByType('full-time').length})
          </TabsTrigger>
          <TabsTrigger value="part-time">
            Part-time ({getJobsByType('part-time').length})
          </TabsTrigger>
          <TabsTrigger value="internship">
            Internships ({getJobsByType('internship').length})
          </TabsTrigger>
          <TabsTrigger value="remote">
            Remote ({getJobsByType('remote').length})
          </TabsTrigger>
        </TabsList>

        {/* Header Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <TrendingUp className="h-12 w-12 text-primary" />
              <div>
                <h3 className="text-xl font-bold">
                  {studentDetails?.major ? `${studentDetails.major} Opportunities` : 'Career Opportunities'}
                </h3>
                <p className="text-muted-foreground">
                  We found <span className="font-bold text-primary">{jobs.length} opportunities</span> matching your profile
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value="full-time" className="space-y-4">
          {renderJobList('full-time')}
        </TabsContent>

        <TabsContent value="part-time" className="space-y-4">
          {renderJobList('part-time')}
        </TabsContent>

        <TabsContent value="internship" className="space-y-4">
          {renderJobList('internship')}
        </TabsContent>

        <TabsContent value="remote" className="space-y-4">
          {renderJobList('remote')}
        </TabsContent>
      </Tabs>

      {/* Job Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedJob && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedJob.title}</DialogTitle>
                <DialogDescription>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedJob.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" />
                      {selectedJob.employment_type}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {formatSalary(selectedJob.salary_min, selectedJob.salary_max, selectedJob.salary_currency)}
                    </span>
                  </div>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* About the Company */}
                {!selectedJob.is_external && (
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> About the Company
                    </h4>
                    {loadingEmployer ? (
                      <p className="text-sm text-muted-foreground">Loading company info...</p>
                    ) : employerInfo ? (
                      <div className="space-y-2 text-sm">
                        <p className="font-medium">{employerInfo.company_name}</p>
                        <div className="flex flex-wrap gap-3 text-muted-foreground">
                          {employerInfo.industry && (
                            <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{employerInfo.industry}</span>
                          )}
                          {employerInfo.company_location && (
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{employerInfo.company_location}</span>
                          )}
                          {employerInfo.company_size && (
                            <span className="flex items-center gap-1"><Users className="h-3 w-3" />{employerInfo.company_size}</span>
                          )}
                        </div>
                        {employerInfo.company_description && (
                          <p className="text-muted-foreground mt-2">{employerInfo.company_description}</p>
                        )}
                        {employerInfo.company_website && (
                          <Button
                            variant="link"
                            size="sm"
                            className="p-0 h-auto gap-1"
                            onClick={() => window.open(employerInfo.company_website!, '_blank')}
                          >
                            <Globe className="h-3 w-3" /> Visit Website
                          </Button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Company information not available.</p>
                    )}
                  </div>
                )}
                {/* Match Score */}
                <div className="p-4 rounded-lg bg-muted">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold">Your Match Score</span>
                    <span className={`text-2xl font-bold ${
                      selectedJob.matchPercentage >= 80 ? 'text-green-600' :
                      selectedJob.matchPercentage >= 60 ? 'text-yellow-600' :
                      'text-muted-foreground'
                    }`}>
                      {selectedJob.matchPercentage}%
                    </span>
                  </div>
                  
                  {selectedJob.matchedSkills.length > 0 && (
                    <div className="mb-3">
                      <p className="text-sm font-medium text-green-700 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Skills you have
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.matchedSkills.map(skill => (
                          <span key={skill} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedJob.missingSkills.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-orange-700 mb-2 flex items-center gap-1">
                        <XCircle className="h-4 w-4" /> Skills to develop
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedJob.missingSkills.map(skill => (
                          <span key={skill} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-semibold mb-2">Job Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedJob.description}
                  </p>
                </div>

                {/* Requirements */}
                {selectedJob.requirements && (
                  <div>
                    <h4 className="font-semibold mb-2">Requirements</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedJob.requirements}
                    </p>
                  </div>
                )}

                {/* Apply Button */}
                {selectedJob.is_external && selectedJob.source_url ? (
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={() => window.open(selectedJob.source_url!, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Apply on {selectedJob.source.charAt(0).toUpperCase() + selectedJob.source.slice(1)}
                  </Button>
                ) : (
                  <Button 
                    className="w-full gap-2" 
                    size="lg"
                    onClick={() => handleApply(selectedJob)}
                    disabled={applying}
                  >
                    <Briefcase className="h-4 w-4" />
                    {applying ? 'Submitting...' : 'Apply with Syncareer'}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default Opportunities;