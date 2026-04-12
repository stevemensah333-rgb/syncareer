import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Building2, MapPin, Users, Edit, Globe, Mail, Phone, Briefcase, FileText, TrendingUp } from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { EditCompanyDialog } from '@/components/employer/EditCompanyDialog';

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CompanyStats {
  activeJobPosts: number;
  totalApplications: number;
  employees: number;
  applicationsByStatus: Record<string, number>;
}

const MyCompany = () => {
  const { employerDetails, loading, refreshProfile } = useUserProfile();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [stats, setStats] = useState<CompanyStats>({
    activeJobPosts: 0,
    totalApplications: 0,
    employees: 0,
    applicationsByStatus: {},
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchCompanyStats();
  }, []);

  const fetchCompanyStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { count: jobPostsCount } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', session.user.id)
        .eq('status', 'active');

      const { data: jobIds } = await supabase
        .from('job_postings')
        .select('id')
        .eq('employer_id', session.user.id);

      let applicationsCount = 0;
      let applicationsByStatus: Record<string, number> = {};

      if (jobIds && jobIds.length > 0) {
        const { data: apps } = await supabase
          .from('job_applications')
          .select('status')
          .in('job_id', jobIds.map(j => j.id));

        if (apps) {
          applicationsCount = apps.length;
          apps.forEach(a => {
            applicationsByStatus[a.status] = (applicationsByStatus[a.status] || 0) + 1;
          });
        }
      }

      setStats({
        activeJobPosts: jobPostsCount || 0,
        totalApplications: applicationsCount,
        employees: 0,
        applicationsByStatus,
      });
    } catch (error) {
      console.error('Error fetching company stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout title="My Company">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </PageLayout>
    );
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-accent',
    reviewing: 'bg-primary/20',
    shortlisted: 'bg-secondary/20',
    interview: 'bg-primary/30',
    offered: 'bg-primary/40',
    hired: 'bg-primary',
    rejected: 'bg-destructive/20',
  };

  return (
    <PageLayout title="My Company">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Company Info */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Company Profile
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-10 w-10 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold">{employerDetails?.company_name || 'Your Company'}</h2>
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    <span>{employerDetails?.company_location || 'Location not set'}</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="secondary">{employerDetails?.industry || 'Industry'}</Badge>
                    <Badge variant="outline">{employerDetails?.company_size || 'Company Size'}</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{employerDetails?.company_website || 'Website not set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{employerDetails?.company_email || 'Email not set'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{employerDetails?.company_phone || 'Phone not set'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About the Company</CardTitle>
            </CardHeader>
            <CardContent>
              {employerDetails?.company_description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{employerDetails.company_description}</p>
              ) : (
                <p className="text-muted-foreground">
                  Add a description about your company, its mission, values, and what makes it a great place to work.
                </p>
              )}
              <Button variant="outline" className="mt-4" onClick={() => setIsEditDialogOpen(true)}>
                {employerDetails?.company_description ? 'Edit Description' : 'Add Company Description'}
              </Button>
            </CardContent>
          </Card>

        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsLoading ? '–' : stats.activeJobPosts}</p>
                  <p className="text-sm text-muted-foreground">Active Jobs</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsLoading ? '–' : stats.totalApplications}</p>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Application Pipeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5" />
                Hiring Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {statsLoading ? (
                <p className="text-muted-foreground text-center py-4">Loading...</p>
              ) : stats.totalApplications === 0 ? (
                <p className="text-muted-foreground text-center py-4 text-sm">No applications yet. Post a job to start receiving candidates.</p>
              ) : (
                ['pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected'].map(status => {
                  const count = stats.applicationsByStatus[status] || 0;
                  const pct = stats.totalApplications > 0 ? (count / stats.totalApplications) * 100 : 0;
                  return (
                    <div key={status} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-muted-foreground">{status}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
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
