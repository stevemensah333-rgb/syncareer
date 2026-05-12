import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export function PortfolioAnalyticsCard({ userId }: { userId: string }) {
  const [total, setTotal] = useState<number | null>(null);
  const [last7, setLast7] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
      const [{ count: t }, { count: w }] = await Promise.all([
        supabase.from('portfolio_views' as any).select('id', { count: 'exact', head: true }).eq('owner_user_id', userId),
        supabase.from('portfolio_views' as any).select('id', { count: 'exact', head: true }).eq('owner_user_id', userId).gte('viewed_at', sevenAgo),
      ]);
      setTotal(t ?? 0);
      setLast7(w ?? 0);
    })();
  }, [userId]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Eye className="h-4 w-4" /> Portfolio Views
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-4">
          <div>
            <p className="text-2xl font-bold">{total ?? '—'}</p>
            <p className="text-xs text-muted-foreground">All time</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{last7}</p>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
