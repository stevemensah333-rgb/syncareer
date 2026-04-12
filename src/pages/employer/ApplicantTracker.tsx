import { useState, useEffect } from 'react';
import { sendNotification } from '@/utils/notifications';
import { PageLayout } from '@/components/layout/PageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Application, Interview, PIPELINE_STAGES } from '@/components/employer/applicants/types';
import { ApplicantFilters } from '@/components/employer/applicants/ApplicantFilters';
import { PipelineView } from '@/components/employer/applicants/PipelineView';
import { ApplicantListView } from '@/components/employer/applicants/ApplicantListView';
import { InterviewsView } from '@/components/employer/applicants/InterviewsView';
import { ScheduleInterviewDialog } from '@/components/employer/applicants/ScheduleInterviewDialog';

const ApplicantTracker = () => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState('all');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: jobs } = await supabase
        .from('job_postings')
        .select('id, title, location, department')
        .eq('employer_id', session.user.id);

      if (!jobs || jobs.length === 0) { setLoading(false); return; }

      const jobIds = jobs.map(j => j.id);

      const { data: apps } = await supabase
        .from('job_applications')
        .select('*')
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });

      if (apps) {
        const applicantIds = [...new Set(apps.map(a => a.applicant_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', applicantIds);

        setApplications(apps.map(app => ({
          ...app,
          job: jobs.find(j => j.id === app.job_id),
          applicant: profiles?.find(p => p.id === app.applicant_id),
        })));

        const appIds = apps.map(a => a.id);
        if (appIds.length > 0) {
          const { data: ints } = await supabase
            .from('interview_sessions')
            .select('*')
            .in('application_id', appIds);
          if (ints) setInterviews(ints);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      const app = applications.find(a => a.id === appId);
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', appId);
      if (error) throw error;

      if (app) {
        const stageName = PIPELINE_STAGES.find(s => s.id === newStatus)?.label || newStatus;
        sendNotification({
          user_id: app.applicant_id,
          type: 'application',
          title: 'Application Update',
          message: `Your application for "${app.job?.title}" has moved to: ${stageName}`,
          category: 'application',
          link: '/applications',
        });
      }

      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));
      toast.success(`Application moved to ${PIPELINE_STAGES.find(s => s.id === newStatus)?.label || newStatus}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleScheduleInterview = async (data: {
    applicationId: string;
    scheduledAt: Date;
    interviewType: string;
    meetingLink: string;
  }) => {
    const app = applications.find(a => a.id === data.applicationId);
    try {
      const { error } = await supabase.from('interview_sessions').insert({
        application_id: data.applicationId,
        scheduled_at: data.scheduledAt.toISOString(),
        interview_type: data.interviewType,
        meeting_link: data.meetingLink || null,
        duration_minutes: 60,
      });
      if (error) throw error;

      await updateApplicationStatus(data.applicationId, 'interview');

      if (app) {
        sendNotification({
          user_id: app.applicant_id,
          type: 'interview',
          title: 'Interview Scheduled',
          message: `Your interview for "${app.job?.title}" is scheduled for ${format(data.scheduledAt, 'PPp')}. Type: ${data.interviewType}.`,
          category: 'interview',
          link: '/applications',
        });
      }

      toast.success('Interview scheduled!');
      setScheduleDialogOpen(false);
      setSelectedApplication(null);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to schedule interview');
    }
  };

  // Derived data
  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchQuery ||
      (app.applicant?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesJob = selectedJob === 'all' || app.job_id === selectedJob;
    return matchesSearch && matchesJob;
  });

  const stageCounts: Record<string, number> = {};
  applications.forEach(a => { stageCounts[a.status] = (stageCounts[a.status] || 0) + 1; });

  const uniqueJobs = [...new Set(applications.map(a => a.job?.title).filter(Boolean))] as string[];

  if (loading) {
    return (
      <PageLayout title="Applicant Tracker">
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
          <Skeleton className="h-12" />
          <Skeleton className="h-64" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Applicant Tracker">
      <div className="space-y-5">
        <ApplicantFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedJob={selectedJob}
          onJobChange={setSelectedJob}
          uniqueJobs={uniqueJobs}
          stageCounts={stageCounts}
        />

        <Tabs defaultValue="pipeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="list">List</TabsTrigger>
            <TabsTrigger value="interviews">Interviews ({interviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline">
            <PipelineView
              applications={filteredApplications}
              onUpdateStatus={updateApplicationStatus}
              onScheduleInterview={(app) => { setSelectedApplication(app); setScheduleDialogOpen(true); }}
            />
          </TabsContent>

          <TabsContent value="list">
            <ApplicantListView
              applications={filteredApplications}
              onUpdateStatus={updateApplicationStatus}
              onScheduleInterview={(app) => { setSelectedApplication(app); setScheduleDialogOpen(true); }}
            />
          </TabsContent>

          <TabsContent value="interviews">
            <InterviewsView interviews={interviews} />
          </TabsContent>
        </Tabs>

        <ScheduleInterviewDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          application={selectedApplication}
          onSchedule={handleScheduleInterview}
        />
      </div>
    </PageLayout>
  );
};

export default ApplicantTracker;
