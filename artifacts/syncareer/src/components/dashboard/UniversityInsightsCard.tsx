import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, TrendingUp } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

import { supabase } from '@/integrations/supabase/client';

interface UniversityInsightsCardProps {
  university: string | null;
  major: string | null;
}

interface CareerInsight {
  title: string;
  match_percentage: number;
  description: string;
}

export const UniversityInsightsCard: React.FC<UniversityInsightsCardProps> = ({ university, major }) => {
  const [insights, setInsights] = useState<CareerInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [outcomes, setOutcomes] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!university || !major) return;

    const fetchInsights = async () => {
      setLoading(true);
      try {
        // Check cache first
        const { data: cached } = await supabase
          .from('university_insights')
          .select('top_careers, graduate_outcomes')
          .eq('university_name', university)
          .eq('major', major)
          .maybeSingle();

        if (cached) {
          setInsights(Array.isArray(cached.top_careers) ? cached.top_careers as unknown as CareerInsight[] : []);
          setOutcomes(typeof cached.graduate_outcomes === 'object' && cached.graduate_outcomes !== null ? cached.graduate_outcomes as Record<string, any> : {});
          setLoading(false);
          return;
        }

        // Generate via edge function
        const { data, error } = await supabase.functions.invoke('compute-university-insights', {
          body: { university, major },
        });

        if (!error && data?.top_careers) {
          setInsights(data.top_careers);
          setOutcomes(data.graduate_outcomes || {});
        }
      } catch (err) {
        console.error('Failed to fetch university insights:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [university, major]);

  if (!university || !major) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-primary" />
          {university} Insights
        </CardTitle>
        <p className="text-sm text-muted-foreground">Top careers for {major} students</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
            <Spinner className="size-4" />
            <span className="text-sm">Generating insights...</span>
          </div>
        ) : insights.length > 0 ? (
          <div className="space-y-3">
            {insights.slice(0, 5).map((career, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary bg-primary/10 rounded-full w-5 h-5 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <p className="text-sm font-medium truncate">{career.title}</p>
                  </div>
                  {career.description && (
                    <p className="text-xs text-muted-foreground mt-1 ml-7 line-clamp-1">{career.description}</p>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {career.match_percentage}%
                </Badge>
              </div>
            ))}

            {outcomes && Object.keys(outcomes).length > 0 && (
              <div className="rounded-lg bg-muted/30 p-3 mt-3">
                <p className="text-xs font-medium mb-2">What {university} graduates are doing</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(outcomes).slice(0, 5).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-[10px]">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No insights available yet for {major} at {university}.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
