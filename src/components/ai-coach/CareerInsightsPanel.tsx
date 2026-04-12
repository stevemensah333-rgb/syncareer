import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Target, Zap, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface IntelligenceProfile {
  maturity_level: string;
  learning_momentum: number;
  exploration_score: number;
  success_rate: number;
  career_clusters: Array<{ cluster: string; weight: number }>;
  skill_mastery_json: Record<string, { level: number; sources: string[] }>;
}

export function CareerInsightsPanel() {
  const [profile, setProfile] = useState<IntelligenceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setLoading(false); return; }

      const { data } = await supabase
        .from("user_intelligence_profiles")
        .select("maturity_level, learning_momentum, exploration_score, success_rate, career_clusters, skill_mastery_json")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) {
        setProfile({
          ...data,
          career_clusters: (data.career_clusters as any) || [],
          skill_mastery_json: (data.skill_mastery_json as any) || {},
        });
      }
      setLoading(false);
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
            <div className="h-3 bg-muted rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card className="border-border">
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          <Brain className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
          <p>Complete your assessment and explore features to build your career intelligence profile.</p>
        </CardContent>
      </Card>
    );
  }

  const topSkills = Object.entries(profile.skill_mastery_json)
    .map(([name, data]) => [name, { ...data, level: Number(data.level) || 0 }] as const)
    .sort(([, a], [, b]) => b.level - a.level)
    .slice(0, 4);

  const topClusters = profile.career_clusters
    .filter((c) => c.cluster)
    .slice(0, 3);

  return (
    <div className="space-y-3">
      {/* Maturity & Momentum */}
      <Card className="border-border">
        <CardHeader className="p-3 pb-1">
          <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Brain className="w-3.5 h-3.5" /> Career Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Maturity</span>
            <Badge variant="secondary" className="text-[10px] capitalize">
              {profile.maturity_level}
            </Badge>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" /> Momentum
              </span>
              <span className="text-xs font-medium">{Math.round(profile.learning_momentum * 100)}%</span>
            </div>
            <Progress value={profile.learning_momentum * 100} className="h-1.5" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Success Rate
              </span>
              <span className="text-xs font-medium">{Math.round(profile.success_rate * 100)}%</span>
            </div>
            <Progress value={profile.success_rate * 100} className="h-1.5" />
          </div>
        </CardContent>
      </Card>

      {/* Career Clusters */}
      {topClusters.length > 0 && (
        <Card className="border-border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" /> Top Career Clusters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {topClusters.map((c, i) => (
                <Badge key={`${c.cluster}-${i}`} variant="outline" className="text-[10px]">
                  {c.cluster}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Skills */}
      {topSkills.length > 0 && (
        <Card className="border-border">
          <CardHeader className="p-3 pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Top Skills</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-1 space-y-1.5">
            {topSkills.map(([name, data]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs capitalize">{name}</span>
                  <span className="text-[10px] text-muted-foreground">{Math.round(data.level * 100)}%</span>
                </div>
                <Progress value={data.level * 100} className="h-1" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
