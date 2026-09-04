import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  GraduationCap,
  RefreshCw,
  AlertCircle,
  BarChart3,
  TrendingUp,
  Download,
  ArrowRight,
  Briefcase,
  FileText,
  Mic,
} from 'lucide-react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { MarketOverviewTab } from '@/components/analysis/MarketOverviewTab';
import { CareerOutlookTab } from '@/components/analysis/CareerOutlookTab';
import AnimatedSection from '@/components/landing/AnimatedSection';

import { PrescriptiveActionPlan } from '@/components/analysis/PrescriptiveActionPlan';
import { AlumniOutcomesCard } from '@/components/analysis/AlumniOutcomesCard';

const REGIONS = [
  { value: 'accra_ghana',     label: 'Accra, Ghana' },
  { value: 'lagos_nigeria',   label: 'Lagos, Nigeria' },
  { value: 'nairobi_kenya',   label: 'Nairobi, Kenya' },
  { value: 'cape_town_sa',    label: 'Cape Town, SA' },
  { value: 'remote_africa',   label: 'Remote (Africa-friendly)' },
  { value: 'remote_global',   label: 'Remote (Global)' },
  { value: 'global',          label: 'Global benchmark' },
];

const Analysis = () => {
  const navigate = useNavigate();
  const { studentDetails, loading: profileLoading } = useUserProfile();
  const major = studentDetails?.major;
  const university = (studentDetails as any)?.school ?? null;
  const [region, setRegion] = useState('accra_ghana');

  const { data, loading, error, refresh } = useMarketIntelligence(major, region);

  const handleExport = () => {
    window.print();
  };

  if (profileLoading) {
    return (
      <PageLayout title="Market Analysis">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-2">
            <Spinner className="mx-auto size-6 text-primary" />
            <p className="text-sm text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!major) {
    return (
      <PageLayout title="Market Analysis">
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <GraduationCap className="h-12 w-12 text-muted-foreground/50 mx-auto" />
            <h3 className="font-semibold">Add your major to see market data</h3>
            <p className="text-sm text-muted-foreground">
              Add your major and degree in Settings, then come back to see skill demand and salary data for your field.
            </p>
            <div className="pt-2">
              <Button onClick={() => navigate('/settings?tab=profile')} className="rounded-control text-xs">
                Go to Profile Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Market Analysis" description={`Current market signals for ${major}.`}>
      <div className="space-y-6 print:space-y-4">

        {/* Intelligence Header */}
        <AnimatedSection y={20}>
        <Card className="border-primary/20">
          <CardContent className="pt-5 pb-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0 print:hidden">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">Career market data</h3>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <GraduationCap className="h-2.5 w-2.5" />
                      {major}
                    </Badge>
                    {data && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-primary/30 text-primary"
                      >
                        {data.from_cache ? "Cached" : "Fresh"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Skill demand, salary ranges, and hiring trends for your field.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 print:hidden">
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="w-[150px] h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  disabled={!data || loading}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refresh}
                  disabled={loading}
                  className="gap-1.5"
                >
                  <RefreshCw className={`size-3.5 ${loading ? "animate-spin motion-reduce:animate-none" : ""}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>

        {/* Error State */}
        {error && !loading && (
          <Card className="border-destructive/30">
            <CardContent className="pt-5 pb-5 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <div>
                <p className="text-sm font-medium text-destructive">Market data could not be loaded</p>
                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={refresh} className="ml-auto">
                Retry
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className={i < 3 ? "" : "lg:col-span-1"}>
                  <CardContent className="pt-5 pb-5 space-y-3 animate-pulse">
                    <div className="h-4 bg-muted rounded w-2/3" />
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="space-y-1">
                        <div className="h-3 bg-muted rounded w-full" />
                        <div className="h-1.5 bg-muted rounded-full w-4/5" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardContent className="pt-5 pb-5 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-4" />
                <div className="h-64 bg-muted rounded" />
              </CardContent>
            </Card>
            <p className="text-center text-sm text-muted-foreground">
              Analysing job market data for {major}…
            </p>
          </div>
        )}

        {/* Prescriptive action plan — the page's hero */}
        {data && !loading && (
          <AnimatedSection delay={0.06} y={20}>
            <PrescriptiveActionPlan topSkills={data.hard_skills || []} major={major} />
          </AnimatedSection>
        )}

        {/* Alumni outcomes — moat content (real grads, real employers) */}
        {data && !loading && (
          <AnimatedSection delay={0.07} y={20}>
            <AlumniOutcomesCard university={university} major={major} region={region} />
          </AnimatedSection>
        )}

        {/* Main Content */}
        {data && !loading && (
          <AnimatedSection delay={0.08} y={20}>
          <Tabs defaultValue="overview">
            <TabsList className="mb-6 print:hidden">
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                Market Overview
              </TabsTrigger>
              <TabsTrigger value="outlook" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Career Outlook
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <MarketOverviewTab data={data} />
            </TabsContent>

            <TabsContent value="outlook">
              <CareerOutlookTab data={data} />
            </TabsContent>
          </Tabs>
          </AnimatedSection>
        )}

        {/* Intentional Lower Context / Action Closure */}
        {data && !loading && (
          <AnimatedSection delay={0.1} y={20}>
            <section
              aria-labelledby="market-actions-title"
              className="rounded-surface border border-border/70 bg-card p-5 sm:p-6 space-y-4 print:hidden"
            >
              <div>
                <h2 id="market-actions-title" className="text-sm font-semibold text-foreground">
                  Apply These Market Signals
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Translate {major} skill demand and salary data into real career moves
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-surface border border-border bg-secondary/20 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary">
                      <Briefcase className="h-4 w-4" aria-hidden="true" />
                      <h3 className="text-xs font-semibold text-foreground">Find Matching Roles</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Search active job postings in {REGIONS.find((r) => r.value === region)?.label ?? 'your region'} filtered for {major}.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" asChild className="w-full text-xs rounded-control justify-between">
                      <Link to={`/opportunities?q=${encodeURIComponent(major)}`}>
                        Browse opportunities <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-surface border border-border bg-secondary/20 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      <h3 className="text-xs font-semibold text-foreground">Add In-Demand Skills</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Ensure your primary CV contains evidence of top skills like {data.hard_skills?.slice(0, 2).join(' and ') || 'key requirements'}.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" asChild className="w-full text-xs rounded-control justify-between">
                      <Link to="/cv-builder">
                        Update primary CV <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="rounded-surface border border-border bg-secondary/20 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-primary">
                      <Mic className="h-4 w-4" aria-hidden="true" />
                      <h3 className="text-xs font-semibold text-foreground">Simulate Interviews</h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Rehearse role-specific technical and behavioral questions for entry-level {major} positions.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button size="sm" variant="outline" asChild className="w-full text-xs rounded-control justify-between">
                      <Link to={`/interview-simulator?role=${encodeURIComponent(major)}`}>
                        Practise interview <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </AnimatedSection>
        )}
      </div>
    </PageLayout>
  );
};

export default Analysis;
