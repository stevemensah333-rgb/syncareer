import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Mic, Briefcase, Clock } from 'lucide-react';
import { timeAgo } from './utils';

export interface CompletedItem {
  id: string;
  type: 'application' | 'interview' | 'cv';
  title: string;
  date: string;
}

const TYPE_META = {
  application: { label: 'Application', icon: Briefcase },
  interview: { label: 'Interview', icon: Mic },
  cv: { label: 'CV', icon: FileText },
};

export function RecentCompleted({ items }: { items: CompletedItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-[14px] font-semibold">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Recently completed
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {items.map(item => {
            const meta = TYPE_META[item.type];
            return (
              <div key={item.id} className="flex items-start gap-3">
                <span className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <meta.icon className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium truncate">{item.title}</p>
                  <p className="text-[11px] text-muted-foreground">{meta.label} · {timeAgo(item.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
