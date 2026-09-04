import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Calendar, Users, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { } from "@/components/ui/badge";
import type { MarketIntelligence } from "@/hooks/useMarketIntelligence";

interface Props {
  data: MarketIntelligence;
}

const confidenceConfig = {
  high: { label: "High Confidence", icon: CheckCircle, color: "text-primary" },
  medium: { label: "Medium Confidence", icon: Info, color: "text-accent-foreground" },
  low: { label: "Low Confidence", icon: AlertTriangle, color: "text-destructive" },
};

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <AlertCircle className="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export function CareerOutlookTab({ data }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 12-Month Demand Forecast */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              12-Month Hiring Demand Forecast
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Demand index and hiring activity projections for your career cluster
            </p>
          </CardHeader>
          <CardContent>
            {data.demand_forecast.length === 0 ? (
              <EmptyState message="No demand forecast data available yet." />
            ) : (
              <div
                className="h-72"
                role="img"
                aria-label={`Twelve-month demand forecast. ${data.demand_forecast.map((item) => `${item.month}: demand index ${item.demand_index}, hiring activity ${item.hiring_activity}`).join('. ')}`}
              >
                <div aria-hidden="true" className="h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.demand_forecast} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(val, name) => [`${val}/100`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Line
                      type="monotone"
                      dataKey="demand_index"
                      name="Demand Index"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "hsl(var(--primary))" }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="hiring_activity"
                      name="Hiring Activity"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      strokeDasharray="5 3"
                      dot={{ r: 3, fill: "hsl(var(--accent))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Career Growth Projections */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Career Growth Projections
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              BLS-informed long-term outlook for your field
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.career_outlook.length === 0 ? (
              <EmptyState message="No career outlook data available yet." />
            ) : (
              data.career_outlook.map((career) => {
                const conf = confidenceConfig[career.confidence];
                const ConfIcon = conf.icon;
                return (
                  <div key={career.career} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-sm">{career.career}</h4>
                        <p className="text-xs text-muted-foreground">{career.time_horizon}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-primary font-bold text-sm">{career.growth_rate}</span>
                        <p className="text-[10px] text-muted-foreground">projected growth</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {career.annual_openings} annual openings
                      </div>
                      <div className={`flex items-center gap-1 text-xs ${conf.color}`}>
                        <ConfIcon className="h-3 w-3" />
                        {conf.label}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed border-t pt-2">
                      {career.bls_projection}
                    </p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Region Summary + Data Confidence */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Market Landscape</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {data.region_summary || "No regional summary available."}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-muted/30">
          <CardContent className="pt-4 space-y-1">
            <p className="type-label">
              Data Methodology
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {data.data_confidence || "Data confidence information unavailable."}
            </p>
            <p className="text-[10px] text-muted-foreground/60 pt-1">
              Last updated: {new Date(data.generated_at).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
              {data.from_cache ? " · Cached" : " · Fresh"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
