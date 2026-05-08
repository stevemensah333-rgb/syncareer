import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Calendar, XCircle, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Application, PIPELINE_STAGES } from './types';

interface ApplicantListViewProps {
  applications: Application[];
  onUpdateStatus: (appId: string, newStatus: string) => void;
  onScheduleInterview: (app: Application) => void;
}

export function ApplicantListView({ applications, onUpdateStatus, onScheduleInterview }: ApplicantListViewProps) {
  const navigate = useNavigate();

  if (applications.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-10">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No applications yet</p>
            <p className="text-xs text-muted-foreground mt-1">Applications to your job posts will appear here.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="space-y-2">
          {applications.map((app) => {
            const stage = PIPELINE_STAGES.find(s => s.id === app.status);
            return (
              <div
                key={app.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/30 transition-colors cursor-pointer gap-3"
                onClick={() => navigate(`/portfolio/${app.applicant_id}`)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {app.applicant?.full_name?.substring(0, 2).toUpperCase() || 'AP'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{app.applicant?.full_name || 'Applicant'}</p>
                    <p className="text-xs text-muted-foreground truncate">{app.job?.title}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {format(new Date(app.created_at), 'MMM d')}
                  </span>
                  <Badge variant="secondary" className="text-[10px] capitalize">{stage?.label}</Badge>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); navigate(`/portfolio/${app.applicant_id}`); }}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  {app.status !== 'rejected' && app.status !== 'offered' && (
                    <>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); onScheduleInterview(app); }}>
                        <Calendar className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'rejected'); }}>
                        <XCircle className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
