import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowRight, Calendar, XCircle, ExternalLink } from 'lucide-react';
import { Application, PIPELINE_STAGES } from './types';

interface PipelineViewProps {
  applications: Application[];
  onUpdateStatus: (appId: string, newStatus: string) => void;
  onScheduleInterview: (app: Application) => void;
}

export function PipelineView({ applications, onUpdateStatus, onScheduleInterview }: PipelineViewProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {PIPELINE_STAGES.map((stage) => {
        const stageApps = applications.filter(a => a.status === stage.id);
        return (
          <Card key={stage.id} className="min-h-[350px]">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="text-xs font-medium flex items-center justify-between text-muted-foreground uppercase tracking-wide">
                <span>{stage.label}</span>
                <Badge variant="outline" className="text-[10px] h-5">{stageApps.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 space-y-2">
              {stageApps.map((app) => (
                <div
                  key={app.id}
                  className="p-2.5 bg-muted/50 rounded-lg space-y-2 hover:bg-muted transition-colors cursor-pointer"
                  onClick={() => navigate(`/portfolio/${app.applicant_id}`)}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {app.applicant?.full_name?.substring(0, 2).toUpperCase() || 'AP'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {app.applicant?.full_name || 'Applicant'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {app.job?.title}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] flex-1 px-2"
                      onClick={(e) => { e.stopPropagation(); navigate(`/portfolio/${app.applicant_id}`); }}
                    >
                      <ExternalLink className="h-2.5 w-2.5 mr-1" />
                      Portfolio
                    </Button>
                    {stage.id !== 'rejected' && stage.id !== 'offered' && (
                      <div className="flex gap-0.5">
                        <Button
                          size="sm" variant="ghost" className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            const nextIdx = PIPELINE_STAGES.findIndex(s => s.id === stage.id) + 1;
                            if (nextIdx < PIPELINE_STAGES.length) onUpdateStatus(app.id, PIPELINE_STAGES[nextIdx].id);
                          }}
                          title="Move to next stage"
                        >
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                        {['pending', 'reviewing', 'interview'].includes(stage.id) && (
                          <Button
                            size="sm" variant="ghost" className="h-6 w-6 p-0"
                            onClick={(e) => { e.stopPropagation(); onScheduleInterview(app); }}
                            title="Schedule interview"
                          >
                            <Calendar className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost"
                          className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => { e.stopPropagation(); onUpdateStatus(app.id, 'rejected'); }}
                          title="Reject"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {stageApps.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-6">No applicants</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
