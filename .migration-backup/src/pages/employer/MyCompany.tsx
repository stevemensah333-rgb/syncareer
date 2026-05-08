import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, MapPin, Edit, Globe, Mail, Phone,
  Briefcase, FileText, TrendingUp, Users, Plus,
  ArrowRight, Clock, Sparkles
} from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { EditCompanyDialog } from '@/components/employer/EditCompanyDialog';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface DashboardStats {
  activeJobPosts: number;
  totalApplications: number;
  shortlisted: number;
  interviewsScheduled: number;
  applicationsByStatus: Record<string, number>;
}

interface RecentApplication {
  id: string;
  status: string;
  created_at: string;
  job_title: string;
}

const MyCompany = () => {
  const { employerDetails, profile, loading, refreshProfile } = useUserProfile();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    activeJobPosts: 0,
    totalApplications: 0,
    shortlisted: 0,
    interviewsScheduled: 0,
    applicationsByStatus: {},
  });
  const [recentApps, setRecentApps] = useState<RecentApplication[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch jobs
      const { data: jobs } = await supabase
        .from('job_postings')
        .select('id, title, status')
        .eq('employer_id', session.user.id);

      const activeJobs = jobs?.filter(j => j.status === 'active') || [];
      const jobIds = jobs?.map(j => j.id) || [];

      let applicationsCount = 0;
      let shortlistedCount = 0;
      let interviewCount = 0;
      let applicationsByStatus: Record<string, number> = {};
      let recentApplications: RecentApplication[] = [];

      if (jobIds.length > 0) {
        const { data: apps } = await supabase
          .from('job_applications')
          .select('id, status, created_at, job_id')
          .in('job_id', jobIds)
          .order('created_at', { ascending: false });

        if (apps) {
          applicationsCount = apps.length;
          apps.forEach(a => {
            applicationsByStatus[a.status] = (applicationsByStatus[a.status] || 0) + 1;
            if (a.status === 'shortlisted') shortlistedCount++;
            if (a.status === 'interview') interviewCount++;
          });

          // Map recent apps with job titles
          const jobMap = new Map(jobs?.map(j => [j.id, j.title]) || []);
          recentApplications = apps.slice(0, 5).map(a => ({
            id: a.id,
            status: a.status,
            created_at: a.created_at,
            job_title: jobMap.get(a.job_id) || 'Unknown Position',
          }));
        }
      }

      setStats({
        activeJobPosts: activeJobs.length,
        totalApplications: applicationsCount,
        shortlisted: shortlistedCount,
        interviewsScheduled: interviewCount,
        applicationsByStatus,
      });
      setRecentApps(recentApplications);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const statusBadgeVariant = (status: string) => {
    switch (status) {
      case 'shortlisted': return 'default';
      case 'interview': return 'default';
      case 'hired': return 'default';
      case 'rejected': return 'destructive';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <PageLayout title="Dashboard">
        <div className="space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        </div>
      </PageLayout>
    );
  }

  const profileComplete = !!(
    employerDetails?.company_name &&
    employerDetails?.company_location &&
    employerDetails?.industry &&
    employerDetails?.company_description
  );

  return (
    <PageLayout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">
              {greeting()}, {profile?.full_name?.split(' ')[0] || 'there'}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {employerDetails?.company_name || 'Set up your company profile to get started'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Company
            </Button>
            <Button size="sm" asChild>
              <Link to="/post-job">
                <Plus className="h-4 w-4 mr-2" />
                Post Job
              </Link>
            </Button>
          </div>
        </div>

        {/* Profile Completion Nudge */}
        {!profileComplete && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Complete your company profile</p>
                  <p className="text-xs text-muted-foreground">A complete profile helps attract better candidates.</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                Complete
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Jobs', value: stats.activeJobPosts, icon: Briefcase, href: '/post-job' },
            { label: 'Applications', value: stats.totalApplications, icon: FileText, href: '/applicants' },
            { label: 'Shortlisted', value: stats.shortlisted, icon: Users, href: '/applicants' },
            { label: 'Interviews', value: stats.interviewsScheduled, icon: Clock, href: '/applicants' },
          ].map((metric) => (
            <Link key={metric.label} to={metric.href}>
              <Card className="hover:border-primary/30 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <metric.icon className="h-4 w-4 text-muted-foreground" />
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-bold">
                    {statsLoading ? '–' : metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{metric.label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Applications */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-semibold">Recent Applications</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/applicants" className="text-xs">
                    View all <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : recentApps.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No applications yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Post a job to start receiving candidates.</p>
                    <Button size="sm" className="mt-4" asChild>
                      <Link to="/post-job">
                        <Plus className="h-4 w-4 mr-1" />
                        Post a Job
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentApps.map((app) => (
                      <Link
                        key={app.id}
                        to="/applicants"
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{app.job_title}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(app.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <Badge variant={statusBadgeVariant(app.status)} className="capitalize text-[10px] ml-2">
                          {app.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar: Pipeline + Quick Actions */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                <Button variant="outline" className="justify-start h-auto py-2.5" asChild>
                  <Link to="/post-job">
                    <Plus className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm">Post a new job</span>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2.5" asChild>
                  <Link to="/applicants">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm">Review applicants</span>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-2.5" asChild>
                  <Link to="/hire-ai">
                    <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    <span className="text-sm">Find talent with AI</span>
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Hiring Pipeline */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <TrendingUp className="h-4 w-4" />
                  Hiring Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {statsLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-6" />)}
                  </div>
                ) : stats.totalApplications === 0 ? (
                  <p className="text-muted-foreground text-center py-4 text-xs">
                    No data yet. Pipeline metrics will appear once you receive applications.
                  </p>
                ) : (
                  ['pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'].map(status => {
                    const count = stats.applicationsByStatus[status] || 0;
                    if (count === 0) return null;
                    const pct = (count / stats.totalApplications) * 100;
                    return (
                      <div key={status} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="capitalize text-muted-foreground">{status}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Company Snapshot */}
            {employerDetails?.company_name && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{employerDetails.company_name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{employerDetails.company_location || 'Location not set'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {employerDetails.industry && <Badge variant="secondary" className="text-[10px]">{employerDetails.industry}</Badge>}
                    {employerDetails.company_size && <Badge variant="outline" className="text-[10px]">{employerDetails.company_size}</Badge>}
                  </div>
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {employerDetails.company_website && (
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3" />
                        <span className="truncate">{employerDetails.company_website}</span>
                      </div>
                    )}
                    {employerDetails.company_email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{employerDetails.company_email}</span>
                      </div>
                    )}
                    {employerDetails.company_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="h-3 w-3" />
                        <span>{employerDetails.company_phone}</span>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Edit Profile
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <EditCompanyDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        companyData={employerDetails}
        onSave={refreshProfile}
      />
    </PageLayout>
  );
};

export default MyCompany;
