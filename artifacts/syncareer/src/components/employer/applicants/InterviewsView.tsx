import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video } from 'lucide-react';
import { format } from 'date-fns';
import { Interview } from './types';

interface InterviewsViewProps {
  interviews: Interview[];
}

export function InterviewsView({ interviews }: InterviewsViewProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-serif text-2xl font-normal tracking-[-0.02em]">
          <Calendar className="h-5 w-5" />
          Scheduled <em className="italic font-normal">interviews</em>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {interviews.length === 0 ? (
          <div className="text-center py-10">
            <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No interviews scheduled</p>
            <p className="text-xs text-muted-foreground mt-1">Schedule interviews from the pipeline or list view.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {interviews.map((interview) => (
              <div key={interview.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Video className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(interview.scheduled_at), 'PPp')}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {interview.interview_type} • {interview.duration_minutes} min
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={interview.status === 'scheduled' ? 'default' : 'secondary'} className="text-[10px]">
                    {interview.status}
                  </Badge>
                  {interview.meeting_link && (
                    <Button size="sm" variant="outline" className="h-7 text-xs rounded-full px-3" asChild>
                      <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                        <Video className="h-3 w-3 mr-1" />
                        Join
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
