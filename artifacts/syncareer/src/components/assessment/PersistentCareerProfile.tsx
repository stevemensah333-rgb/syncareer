/**
 * Persistent Career Profile section on the result page.
 *
 * Shows only what the backend genuinely persists, derived from real tables:
 *   - relevant skills  → user_skills
 *   - evidence         → evidence_items (evidence dossier)
 *   - target roles     → saved opportunities (saved_jobs → job_postings)
 *   - gaps             → skills commonly expected across the strongest
 *                        directions that are not yet in user_skills
 *
 * Goals and direction preferences ("this interests me") are NOT shown as
 * stored data: no backend table holds them yet. See
 * docs/CAREER_PROFILE_BACKEND_GAPS.md for the proposed backend changes.
 */
import { ArrowRight, FileText, Star, Target, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  RecordedSkill,
  SkillGap,
} from '@/features/assessment/careerProfile';
import type { EvidenceItemRow } from '@/features/evidence/types';

interface Props {
  loading: boolean;
  isGuest: boolean;
  onGuestCta: () => void;
  recordedSkills: RecordedSkill[];
  evidence: EvidenceItemRow[];
  targetRoles: string[];
  relevantSkills: RecordedSkill[];
  gaps: SkillGap[];
}

export function PersistentCareerProfile({
  loading,
  isGuest,
  onGuestCta,
  recordedSkills,
  evidence,
  targetRoles,
  relevantSkills,
  gaps,
}: Props) {
  if (isGuest) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col items-start gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Your Career Profile builds as you use Syncareer</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a free account and your interest themes join your recorded skills, evidence
              and saved roles — kept across sessions, never invented.
            </p>
          </div>
          <Button size="sm" onClick={onGuestCta} className="shrink-0 rounded-full px-5">
            Create account <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-surface" />
        ))}
      </div>
    );
  }

  const supportedEvidence = evidence.filter(
    (item) => item.review_status === 'confirmed',
  ).length;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Target roles — from saved opportunities */}
      <ProfileTile
        icon={<Target className="h-4 w-4 text-primary" aria-hidden="true" />}
        title="Target roles"
        meta="Roles behind your saved opportunities"
      >
        {targetRoles.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {targetRoles.map((role) => (
              <Badge key={role} variant="secondary" className="text-xs">
                {role}
              </Badge>
            ))}
          </div>
        ) : (
          <EmptyHint
            text="Save an opportunity and its role appears here as something you are aiming at."
            action={{ label: 'Browse opportunities', href: '/opportunities' }}
          />
        )}
      </ProfileTile>

      {/* Relevant skills — from user_skills */}
      <ProfileTile
        icon={<Star className="h-4 w-4 text-primary" aria-hidden="true" />}
        title="Relevant skills"
        meta="Skills you have recorded that these directions commonly expect"
      >
        {relevantSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {relevantSkills.map((skill) => (
              <Badge key={skill.name} variant="secondary" className="text-xs capitalize">
                {skill.name}
              </Badge>
            ))}
          </div>
        ) : recordedSkills.length > 0 ? (
          <EmptyHint
            text="You have recorded skills, but none overlap yet with the expectations of these directions."
            action={{ label: 'Review your skills', href: '/cv-builder' }}
          />
        ) : (
          <EmptyHint
            text="No skills recorded yet. Add them from your CV or profile to connect your profile."
            action={{ label: 'Build your CV', href: '/cv-builder' }}
          />
        )}
      </ProfileTile>

      {/* Evidence — from the evidence dossier */}
      <ProfileTile
        icon={<FileText className="h-4 w-4 text-primary" aria-hidden="true" />}
        title="Evidence"
        meta={`${evidence.length} item${evidence.length === 1 ? '' : 's'} in your dossier · ${supportedEvidence} sourced`}
      >
        {evidence.length > 0 ? (
          <div className="space-y-2">
            {evidence.slice(0, 3).map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{item.title}</span>
                <Badge variant="outline" className="shrink-0 text-[11px] capitalize">
                  {item.category}
                </Badge>
              </div>
            ))}
            <DossierLink href="/cv-builder" label="Add evidence to your CV" />
          </div>
        ) : (
          <EmptyHint
            text="Evidence is the proof behind your applications — projects, experience, achievements."
            action={{ label: 'Start your dossier', href: '/cv-builder' }}
          />
        )}
      </ProfileTile>

      {/* Gaps — exploration cues, not verdicts */}
      <ProfileTile
        icon={<XCircle className="h-4 w-4 text-warning" aria-hidden="true" />}
        title="Gaps worth exploring"
        meta="Commonly expected across your strongest directions, not yet recorded in Syncareer"
      >
        {gaps.length > 0 ? (
          <div className="space-y-2">
            {gaps.slice(0, 4).map((gap) => (
              <div key={gap.skill} className="text-sm">
                <span className="font-medium">{gap.skill}</span>
                <span className="text-muted-foreground"> — {gap.context}</span>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">
              These are directions to investigate or build, not a judgement of what you can do —
              skills gained outside Syncareer simply are not recorded here yet.
            </p>
          </div>
        ) : (
          <EmptyHint text="No obvious exploration gaps: the expectations of these directions are either covered or open-ended." />
        )}
      </ProfileTile>

      {/* Goals — intentionally not stored yet. No goals table exists in the
          backend, so this is an honest status, not an empty placeholder. */}
      <ProfileTile
        icon={<Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
        title="Career goals"
        meta="Not part of your saved profile yet"
      >
        <p className="text-sm text-muted-foreground">
          Syncareer does not yet store personal career goals. For now, use your directions and
          target roles to guide your applications and CV tailoring.
        </p>
      </ProfileTile>
    </div>
  );
}

function ProfileTile({
  icon,
  title,
  meta,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col">
      <CardContent className="space-y-3 pt-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {icon}
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{meta}</p>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function EmptyHint({ text, action }: { text: string; action?: { label: string; href: string } }) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{text}</p>
      {action && (
        <Button variant="outline" size="sm" asChild className="rounded-full px-4 text-xs">
          <Link to={action.href}>
            {action.label} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}

function DossierLink({ href, label }: { href: string; label: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="px-0 text-xs">
      <Link to={href}>
        {label} <ArrowRight className="ml-1 h-3.5 w-3.5" />
      </Link>
    </Button>
  );
}
