import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getDaysUntilDeadline, getDeadlineLabel } from './utils';

export interface AttentionItem {
  id: string;
  title: string;
  company?: string | null;
  deadline: string;
  source: 'application' | 'saved';
  href: string;
}

function AttentionRow({ item }: { item: AttentionItem }) {
  const days = getDaysUntilDeadline(item.deadline);
  const info = getDeadlineLabel(days);
  if (!info) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium truncate text-foreground">{item.title}</p>
        <p className="text-[12px] text-muted-foreground truncate">
          {item.company ?? 'Role'} · {item.source === 'application' ? 'Applied' : 'Saved'}
        </p>
      </div>
      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${info.tone === 'urgent' ? 'bg-destructive/10 text-destructive' : info.tone === 'soon' ? 'bg-warning/15 text-warning' : 'bg-muted text-muted-foreground'}`}>
        {info.label}
      </span>
    </div>
  );
}

export function AttentionList({ items }: { items: AttentionItem[] }) {
  const navigate = useNavigate();
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[14px] font-semibold">
            <Clock className="h-4 w-4 text-warning" />
            Needs attention soon
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate('/opportunities')}>
            View all <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="divide-y divide-border/60">
          {items.map(item => <AttentionRow key={item.id} item={item} />)}
        </div>
      </CardContent>
    </Card>
  );
}
