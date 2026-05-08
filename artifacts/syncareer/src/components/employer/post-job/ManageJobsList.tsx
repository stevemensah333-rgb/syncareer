import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Briefcase, DollarSign, Clock, Trash2, FileText } from 'lucide-react';

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
  status: string;
  created_at: string;
}

interface ManageJobsListProps {
  jobs: JobPosting[];
  loading: boolean;
  onToggleStatus: (jobId: string, currentStatus: string) => void;
  onDelete: (jobId: string) => void;
}

const formatTimeAgo = (dateString: string) => {
  const diffDays = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return `${Math.floor(diffDays / 7)} weeks ago`;
};

export function ManageJobsList({ jobs, loading, onToggleStatus, onDelete }: ManageJobsListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="font-serif text-2xl font-normal tracking-[-0.02em]">Your job <em className="italic font-normal">posts</em></CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-2xl font-normal tracking-[-0.02em]">Your job <em className="italic font-normal">posts</em></CardTitle>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No job posts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first job posting using the form above.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="p-4 border rounded-lg hover:border-primary/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="font-semibold truncate">{job.title}</h3>
                      <Badge
                        variant={job.status === 'active' ? 'default' : 'secondary'}
                        className="text-[10px] shrink-0"
                      >
                        {job.status}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        <span className="capitalize">{job.employment_type}</span>
                      </span>
                      {(job.salary_min || job.salary_max) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {job.salary_min && job.salary_max
                            ? `${job.salary_min.toLocaleString()} – ${job.salary_max.toLocaleString()}`
                            : job.salary_min
                              ? `${job.salary_min.toLocaleString()}+`
                              : `Up to ${job.salary_max?.toLocaleString()}`
                          }
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(job.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-8 rounded-full px-3"
                      onClick={() => onToggleStatus(job.id, job.status)}
                    >
                      {job.status === 'active' ? 'Close' : 'Reopen'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive h-8 w-8"
                      onClick={() => onDelete(job.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
