import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GraduationCap, ExternalLink, Building2, RefreshCw } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

import { supabase } from '@/integrations/supabase/client';

interface Props {
  university: string | null;
  major: string | null;
  region: string;
}

interface Employer { name: string; role_examples: string[]; evidence_url: string | null; }
interface Role { title: string; frequency: string; }
interface Source { label: string; url: string; }

export const AlumniOutcomesCard: React.FC<Props> = ({ university, major, region }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOutcomes = async () => {
    if (!university || !major) return;
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke('alumni-outcomes', {
        body: { university, major, region },
      });
      if (err) throw err;
      setData(res);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load alumni outcomes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOutcomes(); /* eslint-disable-next-line */ }, [university, major, region]);

  if (!university || !major) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <GraduationCap className="h-6 w-6 mx-auto mb-2 opacity-40" />
          Add your university in onboarding to see where graduates from your school actually end up.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
              Where {university} {major} grads actually end up
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Synthesised from public alumni signals + Syncareer applicant data.
              {data?.from_cache && ' · Cached'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchOutcomes} disabled={loading} className="gap-1.5">
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin motion-reduce:animate-none' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
            <Spinner className="size-4" />
            Researching alumni outcomes…
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {data && !loading && (
          <>
            {data.paths_summary && (
              <p className="text-sm leading-relaxed text-foreground">{data.paths_summary}</p>
            )}

            {data.top_employers?.length > 0 && (
              <div>
                <p className="type-label mb-2">Top employers</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {data.top_employers.slice(0, 8).map((e: Employer, i: number) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{e.name}</p>
                          {e.role_examples?.length > 0 && (
                            <p className="text-xs text-muted-foreground truncate">
                              {e.role_examples.slice(0, 3).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.common_roles?.length > 0 && (
              <div>
                <p className="type-label mb-2">Common first jobs</p>
                <div className="flex flex-wrap gap-1.5">
                  {data.common_roles.map((r: Role, i: number) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={r.frequency === 'very common' ? 'border-primary/40 text-primary' : ''}
                    >
                      {r.title}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {data.salary_observations && (
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="type-label mb-1">Salary signal</p>
                <p className="text-sm">{data.salary_observations}</p>
              </div>
            )}

            {data.sources?.length > 0 && (
              <div>
                <p className="type-label mb-2">Sources</p>
                <div className="flex flex-col gap-1">
                  {data.sources.slice(0, 5).map((s: Source, i: number) => (
                    <a
                      key={i}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 truncate"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{s.label || s.url}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
