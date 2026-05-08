import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { TrendingUp, TrendingDown, Minus, Briefcase, DollarSign, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { MarketIntelligence } from "@/hooks/useMarketIntelligence";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  data: MarketIntelligence;
}

const trendIcon = (trend: string) => {
  if (trend === "rising") return <TrendingUp className="h-3.5 w-3.5 text-primary" />;
  if (trend === "declining") return <TrendingDown className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const categoryColor: Record<string, string> = {
  Hot: "bg-primary/10 text-primary border-primary/20",
  Growing: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  Trend: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Alert: "bg-destructive/10 text-destructive border-destructive/20",
  Emerging: "bg-violet-500/10 text-violet-600 border-violet-500/20",
};

const formatUSD = (val: number) =>
  val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`;

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function MarketOverviewTab({ data }: Props) {
  const [userSkills, setUserSkills] = useState<string[]>([]);

  useEffect(() => {
    async function fetchUserSkills() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch from resumes (skills field) as primary source
      const { data: resumes } = await supabase
        .from("resumes")
        .select("skills")
        .eq("user_id", user.id)
        .limit(1);

      const skills: string[] = [];
      if (resumes && resumes.length > 0) {
        const resumeSkills = resumes[0].skills;
        if (Array.isArray(resumeSkills)) {
          resumeSkills.forEach((s: unknown) => {
            if (typeof s === "string") skills.push(s.toLowerCase());
            else if (s && typeof s === "object" && "name" in (s as Record<string, unknown>)) {
              skills.push(String((s as Record<string, string>).name).toLowerCase());
            }
          });
        }
      }

      // Also fetch from user_skill_map via skills_taxonomy
      const { data: skillMap } = await supabase
        .from("user_skill_map")
        .select("skill_id, skills_taxonomy(canonical_name)")
        .eq("user_id", user.id);

      if (skillMap) {
        skillMap.forEach((row: Record<string, unknown>) => {
          const taxonomy = row.skills_taxonomy as { canonical_name: string } | null;
          if (taxonomy?.canonical_name) {
            skills.push(taxonomy.canonical_name.toLowerCase());
          }
        });
      }

      setUserSkills([...new Set(skills)]);
    }

    fetchUserSkills();
  }, []);

  const hasSkill = (skillName: string) =>
    userSkills.some(
      (s) =>
        s === skillName.toLowerCase() ||
        skillName.toLowerCase().includes(s) ||
        s.includes(skillName.toLowerCase())
    );

  const salaryChartData = data.salary_data.map((s) => ({
    role: s.role.length > 18 ? s.role.substring(0, 16) + "…" : s.role,
    Entry: Math.round(s.entry_level_usd / 1000),
    Mid: Math.round(s.mid_level_usd / 1000),
    Senior: Math.round(s.senior_level_usd / 1000),
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Hard Skills in Demand */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hard Skills in Demand</CardTitle>
            <p className="text-xs text-muted-foreground">Ranked by current job posting frequency</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.hard_skills.length === 0 ? (
              <EmptyState message="No skill demand data available for this major yet." />
            ) : (
              data.hard_skills.map((item) => {
                const matched = hasSkill(item.skill);
                return (
                  <div key={item.skill} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {trendIcon(item.trend)}
                        <span className="text-sm font-medium">{item.skill}</span>
                        {matched && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5 border-primary/30 text-primary">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            You have this
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          · {item.job_posting_volume}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatUSD(item.avg_entry_salary_usd)}/yr</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${
                            item.trend === "rising"
                              ? "border-primary/30 text-primary"
                              : item.trend === "declining"
                              ? "border-destructive/30 text-destructive"
                              : "border-border"
                          }`}
                        >
                          {item.growth_percent}
                        </Badge>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${
                          matched
                            ? "bg-primary"
                            : item.demand_score >= 80
                            ? "bg-primary/60"
                            : item.demand_score >= 60
                            ? "bg-accent"
                            : "bg-muted-foreground/40"
                        }`}
                        style={{ width: `${item.demand_score}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Soft Skills */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Critical Soft Skills</CardTitle>
          <p className="text-xs text-muted-foreground">Field-specific interpersonal competencies</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.soft_skills.length === 0 ? (
            <EmptyState message="No soft skill data available for this major yet." />
          ) : (
            data.soft_skills.map((skill) => (
              <div key={skill.skill} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{skill.skill}</span>
                  {trendIcon(skill.trend)}
                </div>
                <div className="w-full bg-muted rounded-full h-1">
                  <div
                    className="h-1 rounded-full bg-accent"
                    style={{ width: `${skill.demand_score}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug">{skill.context}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Salary Chart */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Salary Progression by Role (USD Thousands)
            </CardTitle>
            <p className="text-xs text-muted-foreground">Entry → Mid → Senior level across top roles in your field</p>
          </CardHeader>
          <CardContent>
            {data.salary_data.length === 0 ? (
              <EmptyState message="No salary data available for this major yet." />
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salaryChartData} margin={{ top: 4, right: 16, left: 0, bottom: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                    <XAxis
                      dataKey="role"
                      tick={{ fontSize: 10 }}
                      angle={-20}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}k`} />
                    <Tooltip formatter={(val) => [`$${val}k`, undefined]} />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                    <Bar dataKey="Entry" name="Entry Level" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.7} />
                    <Bar dataKey="Mid" name="Mid Level" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Senior" name="Senior Level" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Market Insights */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Market Signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.market_insights.length === 0 ? (
              <EmptyState message="No market insights available for this major yet." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.market_insights.map((insight) => (
                  <div
                    key={insight.title}
                    className="border rounded-lg p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-semibold leading-snug">{insight.title}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${categoryColor[insight.category] ?? ""}`}
                      >
                        {insight.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
