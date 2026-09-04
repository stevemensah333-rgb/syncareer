/**
 * Career Profile result experience (Advance mode).
 *
 * The result of the assessment is presented as a Career Profile, not a quiz
 * score: interest themes → what they suggest about preferred work → career
 * directions → why → contextual market signal → how the profile connects to
 * the rest of Syncareer.
 *
 * RIASEC measures interests only. Every section keeps to "what kinds of work
 * fit me" language and never claims the assessment measures skills,
 * readiness, hiring probability or aptitude.
 */
import { Suspense, lazy, useState } from 'react';
import {
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  Compass,
  EyeOff,
  Lightbulb,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RIASEC_LABELS } from '@/data/assessmentQuestions';
import type {
  CareerDirection,
  InterestTheme,
  MarketSignal,
  WorkPreference,
} from '@/features/assessment/careerProfile';
import {
  orderRoleFamilies,
  type RoleFamilyPreference,
} from '@/features/assessment/roleFamilies';
import type { CareerRecommendation } from '@/hooks/useCareerRecommendations';
import { cn } from '@/lib/utils';

const RiasecBarChart = lazy(() =>
  import('@/components/assessment/AssessmentResultCharts').then((m) => ({
    default: m.RiasecBarChart,
  })),
);

const ChartFallback = () => <div className="h-full animate-pulse rounded-md bg-muted" />;

const RANK_LABEL = ['Your strongest theme', 'Second theme', 'Third theme'];

// ── Section header ───────────────────────────────────────────────────────

export function ProfileSection({
  eyebrow,
  title,
  description,
  children,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <section className="space-y-4" aria-labelledby={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="type-label text-primary">{eyebrow}</p>
          <h2
            id={`section-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="text-xl font-semibold tracking-tight"
          >
            {title}
          </h2>
          {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

// ── 1. Interest themes ───────────────────────────────────────────────────

export function InterestThemesSection({
  themes,
  allScores,
}: {
  themes: InterestTheme[];
  /** All six RIASEC theme scores (code → 0–100) for the complete chart. */
  allScores: Record<string, number>;
}) {
  const chartData = Object.entries(allScores)
    .map(([code, score]) => ({
      name: RIASEC_LABELS[code] ?? code,
      score: score as number,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-3 lg:col-span-3">
        {themes.map((theme, index) => (
          <article
            key={theme.code}
            className={cn(
              'rounded-surface border p-4 transition-colors duration-150 ease-standard motion-reduce:transition-none',
              index === 0 ? 'border-primary/40 bg-primary/5' : 'border-border bg-card',
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                  index === 0 ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                )}
                aria-hidden="true"
              >
                {theme.code}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold leading-tight">{theme.label}</h3>
                  <Badge variant={index === 0 ? 'default' : 'secondary'} className="text-[11px]">
                    {RANK_LABEL[index]}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Card className="lg:col-span-2">
        <CardContent className="pt-6">
          <p className="type-label mb-3 flex items-center gap-1.5 text-muted-foreground">
            <Compass className="h-3.5 w-3.5" /> All six interest themes
          </p>
          <div
            className="h-64"
            role="img"
            aria-label={`RIASEC work-interest scores. ${chartData
              .map((item) => `${item.name}: ${item.score} out of 100`)
              .join('. ')}`}
          >
            <Suspense fallback={<ChartFallback />}>
              <RiasecBarChart data={chartData} />
            </Suspense>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Scores reflect how strongly you agreed with interest statements. Closely scored
            themes can swap order with a few different answers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── 2. What this suggests ────────────────────────────────────────────────

export function WorkPreferencesSection({ preferences }: { preferences: WorkPreference[] }) {
  if (preferences.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Your answers did not point strongly at any single work-style pattern — you are open to a
        range of environments. Use the career directions below as starting points to explore.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {preferences.map((preference) => (
        <div key={preference.title} className="rounded-surface border border-border bg-card p-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">{preference.title}</h3>
            <span className="type-meta text-muted-foreground">{preference.score}%</span>
          </div>
          <p className="text-sm text-muted-foreground">{preference.description}</p>
        </div>
      ))}
    </div>
  );
}

// ── 3. Career directions ─────────────────────────────────────────────────

interface DirectionsProps {
  directions: CareerDirection[];
  marketSignals: Map<string, MarketSignal>;
  onExplore: (title: string) => string;
  isGuest: boolean;
  onGuestCta: () => void;
}

/**
 * Career recommendation reveal: the strongest matches arrive as full cards
 * (progressive reveal, strongest first); alternative directions stay behind
 * one expand control. "This interests me" / "Not for me" corrections reorder
 * only this view — they never rewrite scores or saved preferences.
 */
export function CareerDirectionsSection({
  directions,
  marketSignals,
  onExplore,
  isGuest,
  onGuestCta,
}: DirectionsProps) {
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, RoleFamilyPreference>>({});

  const ordered = orderRoleFamilies(
    directions.map((direction) => direction.recommendation),
    preferences,
  );
  const byCareerId = new Map(
    directions.map((direction) => [direction.recommendation.career.id, direction]),
  );
  const visible = ordered
    .map((recommendation: CareerRecommendation) => byCareerId.get(recommendation.career.id))
    .filter((direction): direction is CareerDirection => direction !== undefined);

  const strongest = visible.slice(0, 3);
  const alternatives = visible.slice(3, 8);

  const setPreference = (careerId: string, preference: RoleFamilyPreference) =>
    setPreferences((current) => ({ ...current, [careerId]: preference }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {strongest.map((direction, index) => (
          <DirectionCard
            key={direction.recommendation.career.id}
            direction={direction}
            signal={marketSignals.get(direction.recommendation.career.title)}
            onExplore={onExplore}
            isGuest={isGuest}
            onGuestCta={onGuestCta}
            emphasized={index === 0}
            preference={preferences[direction.recommendation.career.id]}
            onPreference={setPreference}
          />
        ))}
      </div>

      {alternatives.length > 0 && (
        <Collapsible open={showAlternatives} onOpenChange={setShowAlternatives}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="rounded-full px-5">
              {showAlternatives ? 'Hide alternative directions' : `Show ${alternatives.length} alternative directions`}
              <ChevronDown
                className={cn(
                  'ml-2 h-4 w-4 transition-transform duration-150 ease-standard motion-reduce:transition-none',
                  showAlternatives && 'rotate-180',
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {alternatives.map((direction) => (
                <DirectionRow
                  key={direction.recommendation.career.id}
                  direction={direction}
                  signal={marketSignals.get(direction.recommendation.career.title)}
                  onExplore={onExplore}
                  isGuest={isGuest}
                  onGuestCta={onGuestCta}
                  preference={preferences[direction.recommendation.career.id]}
                  onPreference={setPreference}
                />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <p className="text-xs text-muted-foreground">
        Your “this interests me” and “not for me” choices reorder this view only. They do not
        rewrite your assessment scores, and saved job or industry preferences are changed
        nowhere.
      </p>
    </div>
  );
}

function DirectionThemeBadges({ direction }: { direction: CareerDirection }) {
  if (direction.matchingThemes.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {direction.matchingThemes.map((theme) => (
        <Badge key={theme.code} variant="secondary" className="text-[11px]">
          {theme.label} interests
        </Badge>
      ))}
    </div>
  );
}

function MarketSignalLine({ signal }: { signal: MarketSignal }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-secondary/20 p-3">
      <p className="type-label mb-1.5 flex items-center gap-1.5 text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5" />
        Market signal · from {signal.postingCount} current {signal.postingCount === 1 ? 'posting' : 'postings'}
      </p>
      {signal.commonlyEmphasized.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">
            Current opportunities in this direction commonly emphasise:
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {signal.commonlyEmphasized.map((skill) => (
              <Badge key={skill} variant="outline" className="text-[11px] font-normal">
                {skill}
              </Badge>
            ))}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Open postings in this direction rarely list specific skills in their headlines —
          review individual listings for what they ask for.
        </p>
      )}
      <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
        This is market context about what current employers mention — it never means interest
        alignment proves a role suits you. Check the actual listings and your own evidence before
        deciding.
      </p>
    </div>
  );
}

function ExploreButton({
  title,
  onExplore,
  isGuest,
  onGuestCta,
}: {
  title: string;
  onExplore: (title: string) => string;
  isGuest: boolean;
  onGuestCta: () => void;
}) {
  return isGuest ? (
    <Button size="sm" variant="outline" onClick={onGuestCta} className="w-full justify-between">
      Explore opportunities <ArrowRight className="h-3.5 w-3.5" />
    </Button>
  ) : (
    <Button size="sm" variant="outline" asChild className="w-full justify-between">
      <Link to={onExplore(title)}>
        Explore opportunities <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </Button>
  );
}

function DirectionCard({
  direction,
  signal,
  onExplore,
  isGuest,
  onGuestCta,
  emphasized,
  preference,
  onPreference,
}: {
  direction: CareerDirection;
  signal?: MarketSignal;
  onExplore: (title: string) => string;
  isGuest: boolean;
  onGuestCta: () => void;
  emphasized?: boolean;
  preference?: RoleFamilyPreference;
  onPreference: (careerId: string, preference: RoleFamilyPreference) => void;
}) {
  const { career } = direction.recommendation;
  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-surface border p-4 transition-colors duration-150 ease-standard motion-reduce:transition-none',
        emphasized ? 'border-primary/40 bg-primary/[0.03]' : 'border-border bg-card',
      )}
    >
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <h3 className="font-semibold leading-tight">{career.title}</h3>
          </div>
          {preference === 'prioritised' && (
            <Badge className="shrink-0 text-[11px]">
              <Check className="mr-1 h-3 w-3" /> Interests you
            </Badge>
          )}
        </div>
        <DirectionThemeBadges direction={direction} />
        <p className="text-sm text-muted-foreground">{career.description}</p>
      </div>

      {signal && <MarketSignalLine signal={signal} />}

      <div className="mt-auto space-y-2 pt-1">
        <ExploreButton title={career.title} onExplore={onExplore} isGuest={isGuest} onGuestCta={onGuestCta} />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 flex-1 text-xs"
            aria-pressed={preference === 'prioritised'}
            onClick={() => onPreference(career.id, preference === 'prioritised' ? 'neutral' : 'prioritised')}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" /> This interests me
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 flex-1 text-xs"
            aria-pressed={preference === 'dismissed'}
            onClick={() => onPreference(career.id, preference === 'dismissed' ? 'neutral' : 'dismissed')}
          >
            <EyeOff className="mr-1.5 h-3.5 w-3.5" /> Not for me
          </Button>
        </div>
      </div>
    </article>
  );
}

function DirectionRow({
  direction,
  signal,
  onExplore,
  isGuest,
  onGuestCta,
  preference,
  onPreference,
}: {
  direction: CareerDirection;
  signal?: MarketSignal;
  onExplore: (title: string) => string;
  isGuest: boolean;
  onGuestCta: () => void;
  preference?: RoleFamilyPreference;
  onPreference: (careerId: string, preference: RoleFamilyPreference) => void;
}) {
  const { career } = direction.recommendation;
  const [open, setOpen] = useState(false);
  const dismissed = preference === 'dismissed';
  if (dismissed) return null;
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-surface border border-border bg-card">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate text-sm font-semibold">{career.title}</h3>
          <DirectionThemeBadges direction={direction} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full px-2"
            aria-label={`Remove ${career.title} from my directions`}
            aria-pressed={dismissed}
            onClick={() => onPreference(career.id, 'dismissed')}
          >
            <EyeOff className="h-3.5 w-3.5" />
          </Button>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="rounded-full" aria-label={`Why ${career.title}?`}>
              Why? <ChevronDown className={cn('ml-1 h-3.5 w-3.5 transition-transform duration-150 ease-standard motion-reduce:transition-none', open && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent>
        <div className="space-y-3 border-t border-border-subtle px-4 pb-4 pt-3">
          <p className="text-sm text-muted-foreground">{career.description}</p>
          <p className="text-xs text-muted-foreground">{direction.recommendation.explanation}</p>
          {signal && <MarketSignalLine signal={signal} />}
          <ExploreButton title={career.title} onExplore={onExplore} isGuest={isGuest} onGuestCta={onGuestCta} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── 4. Why these directions ─────────────────────────────────────────────

export function WhyDirectionsNote({
  themes,
  clusterInsight,
}: {
  themes: InterestTheme[];
  clusterInsight: { title: string; themes: string[] } | null;
}) {
  return (
    <Card className="border-border/70 bg-secondary/20">
      <CardContent className="flex gap-3 pt-5">
        <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="space-y-2">
            <p className="font-medium text-foreground">Why these directions?</p>
            <p>
              Each direction above is a broad role family whose typical work overlaps with your{' '}
              {themes.map((theme) => theme.label).join(', ')} interests. The overlap comes from
              your answers to the interest questions — nothing else.
            </p>
            <p>
              RIASEC describes the kinds of work you are drawn to. It does not measure skill
              level, job readiness, aptitude or hiring probability, and interest alignment is not
              proof that a role suits you. Treat these directions as prompts to investigate:
              compare them with your actual experience, evidence, constraints and goals.
            </p>
          </div>
          {clusterInsight && (
            <div className="rounded-lg border border-border-subtle bg-card p-3">
              <p className="text-sm font-medium text-foreground">
                One possible combination: {clusterInsight.title}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                An interpretation of how your top themes can overlap — not a diagnosis or a fixed
                identity.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
