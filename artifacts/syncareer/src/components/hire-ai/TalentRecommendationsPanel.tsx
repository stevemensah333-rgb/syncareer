import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Lightbulb, RefreshCw, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Candidate {
  name: string;
  match_reason: string;
  skills: string[];
  major: string;
  fit_score: number;
}

interface MarketInsights {
  talent_availability: string;
  skill_gaps: string[];
  salary_suggestion: string;
  hiring_tips: string[];
}

interface PoolStats {
  total_candidates: number;
  top_skills: { skill: string; count: number }[];
  top_majors: { major: string; count: number }[];
}

interface TalentData {
  recommended_candidates: Candidate[];
  market_insights: MarketInsights | null;
  pool_stats: PoolStats;
  summary: string;
}

export function TalentRecommendationsPanel() {
  const [data, setData] = useState<TalentData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { toast } = useToast();

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/talent-recommend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ limit: 5 }),
        }
      );

      if (!resp.ok) throw new Error("Failed to fetch recommendations");
      const result = await resp.json();
      setData(result);
      setHasLoaded(true);
    } catch (error) {
      console.error("Talent recommend error:", error);
      toast({ title: "Error", description: "Failed to load talent recommendations.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, []);

  if (!hasLoaded && loading) {
    return (
      <div className="space-y-3">
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="space-y-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-3 bg-muted rounded w-1/3" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-border">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>Post a job to get AI-powered talent recommendations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pool Stats */}
      <Card className="border-border">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Talent Pool
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={fetchRecommendations}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1">
          <p className="text-lg font-bold">{data.pool_stats.total_candidates}</p>
          <p className="text-[10px] text-muted-foreground">candidates available</p>
          {data.pool_stats.top_skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {data.pool_stats.top_skills.slice(0, 5).map(s => (
                <Badge key={s.skill} variant="outline" className="text-[10px]">
                  {s.skill} ({s.count})
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Candidates */}
      {data.recommended_candidates.length > 0 && (
        <Card className="border-border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5" /> Top Matches
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-2.5">
            {data.recommended_candidates.slice(0, 4).map((c, idx) => (
              <div key={idx} className="border border-border rounded-md p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium truncate">{c.name}</span>
                  <span className="text-[10px] text-primary font-medium">{Math.round(c.fit_score * 100)}%</span>
                </div>
                <Progress value={c.fit_score * 100} className="h-1 mb-1" />
                <p className="text-[10px] text-muted-foreground line-clamp-2">{c.match_reason}</p>
                {c.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.skills.slice(0, 3).map(s => (
                      <Badge key={s} variant="secondary" className="text-[9px] px-1 py-0">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Market Insights */}
      {data.market_insights && (
        <Card className="border-border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5" /> Market Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-2">
            <div>
              <p className="text-[10px] text-muted-foreground">Availability</p>
              <p className="text-xs">{data.market_insights.talent_availability}</p>
            </div>
            {data.market_insights.skill_gaps.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground">Skill Gaps</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {data.market_insights.skill_gaps.map(g => (
                    <Badge key={g} variant="destructive" className="text-[9px] px-1 py-0">{g}</Badge>
                  ))}
                </div>
              </div>
            )}
            {data.market_insights.hiring_tips.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground mb-0.5">Tips</p>
                <ul className="space-y-0.5">
                  {data.market_insights.hiring_tips.slice(0, 3).map((t, i) => (
                    <li key={i} className="text-[10px] text-foreground flex gap-1">
                      <TrendingUp className="w-2.5 h-2.5 text-primary shrink-0 mt-0.5" />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
