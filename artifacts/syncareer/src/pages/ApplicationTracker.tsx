import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Briefcase, MapPin, Calendar, Clock, ExternalLink, Trash2, Search, Video, User, Star } from 'lucide-react';
import { RateCounsellorDialog } from '@/components/counsellor/RateCounsellorDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOutcomeTracking } from '@/hooks/useOutcomeTracking';
import { format } from 'date-fns';
import AnimatedSection from '@/components/landing/AnimatedSection';

interface InterviewSession {
  id: string;
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  interview_type: string;
  meeting_link: string | null;
  status: string;
}

interface Application {
  id: string;
  job_id: string;
  status: string;
  cover_letter: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  job?: {
    title: string;
    location: string;
    employment_type: string;
    salary_min: number | null;
    salary_max: number | null;
  };
  interview?: InterviewSession;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning/15 text-warning',
  reviewing: 'bg-primary/15 text-primary',
  shortlisted: 'bg-secondary/15 text-secondary',
  interview: 'bg-primary/20 text-primary',
  offered: 'bg-success/15 text-success',
  hired: 'bg-success text-success-foreground',
  rejected: 'bg-destructive/15 text-destructive',
  withdrawn: 'bg-muted text-muted-foreground',
};

const ApplicationTracker = () => {
  const { updateOutcome, triggerIntelligenceRefresh } = useOutcomeTracking();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Counsellor bookings
  interface CounsellorBooking {
    id: string;
    counsellor_id: string;
    status: string;
    scheduled_date: string | null;
    scheduled_time: string | null;
    created_at: string;
    counsellor?: { full_name: string | null; meeting_link: string | null };
  }
  const [counsellorBookings, setCounsellorBookings] = useState<CounsellorBooking[]>([]);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedBookingForRating, setSelectedBookingForRating] = useState<CounsellorBooking | null>(null);

  useEffect(() => {
    fetchApplications();
    fetchCounsellorBookings();
  }, []);

  const fetchCounsellorBookings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('counsellor_bookings')
        .select('id, counsellor_id, status, scheduled_date, scheduled_time, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        // Fetch counsellor details (name + meeting link) for each booking
        const enriched = await Promise.all(data.map(async (b) => {
          const { data: cd } = await (supabase
            .from('counsellor_booking_view' as any)
            .select('full_name, meeting_link')
            .eq('id', b.counsellor_id)
            .single() as any) as { data: { full_name: string; meeting_link: string | null } | null };
          return { ...b, counsellor: cd };
        }));
        setCounsellorBookings(enriched as any);
      }
    } catch (err) {
      console.error('Error fetching counsellor bookings:', err);
    }
  };

  const fetchApplications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('job_applications')
        .select(`
          *,
          job:job_postings(title, location, employment_type, salary_min, salary_max)
        `)
        .eq('applicant_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Interview sessions are no longer tracked separately.
      const interviewMap: Record<string, InterviewSession> = {};

      setApplications((data || []).map(app => ({
        ...app,
        interview: interviewMap[app.id] || undefined,
      })));
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setIsLoading(false);
    }
  };

  const updateApplicationStatus = async (appId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .update({ status: newStatus })
        .eq('id', appId);

      if (error) throw error;
      
      const app = applications.find(a => a.id === appId);
      setApplications(apps => 
        apps.map(a => a.id === appId ? { ...a, status: newStatus } : a)
      );
      toast.success('Status updated');

      // Map application status to outcome for the feedback loop
      if (app?.job?.title) {
        const outcomeMap: Record<string, string> = {
          hired: 'success',
          offered: 'success',
          rejected: 'rejected',
          withdrawn: 'withdrawn',
        };
        const outcome = outcomeMap[newStatus];
        if (outcome) {
          updateOutcome({
            itemTitle: app.job.title,
            outcome: outcome as 'success' | 'rejected' | 'withdrawn',
            details: { status: newStatus, updated_at: new Date().toISOString() },
          });
          triggerIntelligenceRefresh();
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const deleteApplication = async (appId: string) => {
    try {
      const { error } = await supabase
        .from('job_applications')
        .delete()
        .eq('id', appId);

      if (error) throw error;
      
      setApplications(apps => apps.filter(app => app.id !== appId));
      toast.success('Application removed');
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Failed to delete application');
    }
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.job?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.notes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusCounts = () => {
    const counts: Record<string, number> = {
      all: applications.length,
      pending: 0,
      reviewing: 0,
      shortlisted: 0,
      interview: 0,
      offered: 0,
      hired: 0,
      rejected: 0,
      withdrawn: 0,
    };
    applications.forEach(app => {
      if (counts[app.status] !== undefined) {
        counts[app.status]++;
      }
    });
    return counts;
  };

  const statusCounts = getStatusCounts();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysAgo = (dateString: string) => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  return (
    <PageLayout title="Application Tracker">
      <div className="space-y-6">
        {/* Stats Overview */}
        <AnimatedSection y={20}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {['all', 'pending', 'reviewing', 'interview', 'offered', 'hired', 'rejected'].map(status => (
            <Card 
              key={status} 
              className={`cursor-pointer transition-all ${filterStatus === status ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterStatus(status)}
            >
              <CardContent className="p-3 text-center">
                <div className="text-2xl font-bold">{statusCounts[status]}</div>
                <div className="text-xs text-muted-foreground capitalize">{status}</div>
              </CardContent>
            </Card>
          ))}
        </div>
        </AnimatedSection>

        {/* Search */}
        <AnimatedSection delay={0.08} y={20}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search applications..."
            className="pl-10"
          />
        </div>
        </AnimatedSection>

        {/* Applications List */}
        <AnimatedSection delay={0.12} y={20}>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Your Applications</CardTitle>
                <CardDescription>
                  Track the status of your job applications
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading applications...
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium mb-2">No applications yet</h3>
                <p className="text-muted-foreground mb-4">
                  {applications.length === 0 
                    ? "Start applying to jobs from the Opportunities page"
                    : "No applications match your search criteria"}
                </p>
                <Button onClick={() => window.location.href = '/opportunities'}>
                  Browse Opportunities
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {app.job?.title || 'Unknown Position'}
                          </h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[app.status] || 'bg-muted text-muted-foreground'}`}>
                            {app.status}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-2">
                          {app.job?.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {app.job.location}
                            </span>
                          )}
                          {app.job?.employment_type && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-4 w-4" />
                              {app.job.employment_type}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            Applied {formatDate(app.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getDaysAgo(app.updated_at)}
                          </span>
                        </div>

                        {app.notes && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {app.notes}
                          </p>
                        )}

                        {/* Interview Details */}
                        {app.interview && (
                          <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Video className="h-4 w-4 text-primary" />
                              <span className="text-sm font-medium text-primary">
                                Interview Scheduled
                              </span>
                              <Badge variant="outline" className="text-xs capitalize">
                                {app.interview.interview_type}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(new Date(app.interview.scheduled_at), 'PPP')}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {format(new Date(app.interview.scheduled_at), 'p')} • {app.interview.duration_minutes} min
                              </span>
                            </div>
                            {app.interview.meeting_link && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                asChild
                              >
                                <a href={app.interview.meeting_link} target="_blank" rel="noopener noreferrer">
                                  <Video className="h-3.5 w-3.5 mr-1" />
                                  Join Meeting
                                </a>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {app.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-muted-foreground"
                            onClick={() => updateApplicationStatus(app.id, 'withdrawn')}
                          >
                            Withdraw
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteApplication(app.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </AnimatedSection>
        {/* Counsellor Sessions */}
        <AnimatedSection delay={0.16} y={20}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Counsellor Sessions
            </CardTitle>
            <CardDescription>Your booked career counselling sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {counsellorBookings.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No counsellor sessions booked yet.
              </p>
            ) : (
              <div className="space-y-3">
                {counsellorBookings.map((b) => (
                  <div key={b.id} className="p-4 border rounded-lg flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium">{b.counsellor?.full_name || 'Counsellor'}</p>
                      {b.scheduled_date && b.scheduled_time && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(b.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {b.scheduled_time.toString().slice(0, 5)}
                        </p>
                      )}
                      <Badge
                        variant={b.status === 'confirmed' ? 'default' : b.status === 'cancelled' ? 'destructive' : 'outline'}
                        className="text-xs"
                      >
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                    {b.status === 'confirmed' && b.counsellor?.meeting_link && (
                      <Button size="sm" asChild>
                        <a href={b.counsellor.meeting_link} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-1" />
                          Join Session
                        </a>
                      </Button>
                    )}
                    {b.status === 'confirmed' && !b.counsellor?.meeting_link && (
                      <span className="text-xs text-muted-foreground">Link pending</span>
                    )}
                    {(b.status === 'confirmed' || b.status === 'cancelled') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBookingForRating(b);
                          setRatingDialogOpen(true);
                        }}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Rate
                      </Button>
                    )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive ml-2"
                      onClick={async () => {
                        try {
                          const { error } = await supabase
                            .from('counsellor_bookings')
                            .delete()
                            .eq('id', b.id);
                          if (error) throw error;
                          setCounsellorBookings(prev => prev.filter(x => x.id !== b.id));
                          toast.success('Session removed');
                        } catch (err) {
                          console.error(err);
                          toast.error('Failed to remove session');
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </AnimatedSection>
      </div>

      {selectedBookingForRating && (
        <RateCounsellorDialog
          open={ratingDialogOpen}
          onOpenChange={setRatingDialogOpen}
          counsellorId={selectedBookingForRating.counsellor_id}
          counsellorName={selectedBookingForRating.counsellor?.full_name || 'Counsellor'}
          onRatingSubmitted={() => setSelectedBookingForRating(null)}
        />
      )}
    </PageLayout>
  );
};

export default ApplicationTracker;
