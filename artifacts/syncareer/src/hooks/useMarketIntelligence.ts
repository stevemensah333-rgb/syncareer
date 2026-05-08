import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface HardSkill {
  skill: string;
  demand_score: number;
  growth_percent: string;
  trend: "rising" | "stable" | "declining";
  avg_entry_salary_usd: number;
  job_posting_volume: string;
}

export interface SoftSkill {
  skill: string;
  demand_score: number;
  context: string;
  trend: "rising" | "stable";
}

export interface SalaryData {
  role: string;
  entry_level_usd: number;
  mid_level_usd: number;
  senior_level_usd: number;
  yoe_to_senior: number;
}

export interface DemandForecast {
  month: string;
  demand_index: number;
  hiring_activity: number;
}

export interface CareerOutlook {
  career: string;
  growth_rate: string;
  time_horizon: string;
  annual_openings: string;
  confidence: "high" | "medium" | "low";
  bls_projection: string;
}

export interface MarketInsight {
  title: string;
  description: string;
  category: "Hot" | "Growing" | "Trend" | "Alert" | "Emerging";
  impact: "high" | "medium" | "low";
}

export interface MarketIntelligence {
  major: string;
  region: string;
  hard_skills: HardSkill[];
  soft_skills: SoftSkill[];
  salary_data: SalaryData[];
  demand_forecast: DemandForecast[];
  career_outlook: CareerOutlook[];
  market_insights: MarketInsight[];
  region_summary: string;
  data_confidence: string;
  generated_at: string;
  from_cache: boolean;
}

export function useMarketIntelligence(major: string | undefined, region = "global") {
  const [data, setData] = useState<MarketIntelligence | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIntelligence = useCallback(async (forceRefresh = false) => {
    if (!major) return;

    setLoading(true);
    setError(null);

    try {
      // Check local cache first if not forcing refresh
      if (!forceRefresh) {
        const cacheKey = `market_intel_${major.toLowerCase()}_${region}`;
        const localCache = sessionStorage.getItem(cacheKey);
        if (localCache) {
          const parsed = JSON.parse(localCache);
          setData(parsed);
          setLoading(false);
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Authentication required");
        return;
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/market-intelligence`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ major, region }),
        }
      );

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to fetch market intelligence");
      }

      const result: MarketIntelligence = await resp.json();
      setData(result);

      // Cache in sessionStorage for this browser session
      const cacheKey = `market_intel_${major.toLowerCase()}_${region}`;
      sessionStorage.setItem(cacheKey, JSON.stringify(result));
    } catch (err) {
      console.error("Market intelligence error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [major, region]);

  useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  return { data, loading, error, refresh: () => fetchIntelligence(true) };
}
