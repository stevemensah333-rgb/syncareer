import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecordList, RecordRow, RecordState } from '@/components/dossier';
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
      <section className="dossier-document" aria-labelledby="recent-applications-title">
        <header className="border-b border-border px-4 py-4">
          <h2 id="recent-applications-title" className="text-sm font-semibold">Recent applications</h2>
        </header>
        <div className="p-4">
          <RecordState
            tone="empty"
            title="No applications yet"
            description="When you apply, your recent activity will appear here."
            action={<Button size="sm" onClick={() => navigate('/opportunities')}>Browse opportunities</Button>}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="dossier-document" aria-labelledby="recent-applications-title">
      <header className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-applications-title" className="text-sm font-semibold">Recent applications</h2>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/applications')}>
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </header>
      <RecordList className="border-y-0" label="Recent application dossiers">
          {items.map(app => (
            <RecordRow
              key={app.id}
              eyebrow={app.job?.company_name ?? 'Organization not recorded'}
              title={app.job?.title ?? 'Application'}
              detail={app.job?.location ?? undefined}
              meta={<span>Updated {timeAgo(app.updated_at)}</span>}
              status={<span className="border border-border bg-muted/50 px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.06em]">{statusLabel(app.status)}</span>}
              onClick={() => navigate(`/applications?application=${encodeURIComponent(app.id)}`)}
            />
          ))}
      </RecordList>
    </section>
  );
}
