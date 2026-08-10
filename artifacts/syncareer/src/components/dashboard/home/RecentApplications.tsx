import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_COLORS } from '@/features/application-tracker/constants';
import { statusLabel, timeAgo } from './utils';

export interface RecentApp {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  job: {
    title: string;
    company_name?: string | null;
    location?: string | null;
  } | null;
}

export function RecentApplications({ items }: { items: RecentApp[] }) {
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-[14px] font-semibold">Recent applications</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border border-dashed p-6 text-center">
            <p className="text-[13px] text-muted-foreground">No applications yet. When you apply, your recent activity will appear here.</p>
            <Button size="sm" className="mt-3" onClick={() => navigate('/opportunities')}>Browse opportunities</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[14px] font-semibold">Recent applications</CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/applications')}>
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/60">
          {items.map(app => (
            <div key={app.id} className="flex items-center justify-between gap-3 py-3.5 group">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-[13px] font-medium truncate">{app.job?.title ?? 'Application'}</p>
                  <span className={`shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[app.status] ?? 'bg-muted text-muted-foreground'}`}>
                    {statusLabel(app.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-[12px] text-muted-foreground">
                  {app.job?.company_name && <span className="truncate">{app.job.company_name}</span>}
                  {app.job?.location && (
                    <span className="inline-flex items-center gap-1 truncate"><MapPin className="h-3 w-3" />{app.job.location}</span>
                  )}
                  <span>· {timeAgo(app.updated_at)}</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity" onClick={() => navigate('/applications')}>
                Open
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
