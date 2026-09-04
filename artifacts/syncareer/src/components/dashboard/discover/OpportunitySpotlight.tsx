import { useState } from 'react';
import { ArrowRight, ArrowUpRight, Bookmark, BookmarkCheck, Building2, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { supabase } from '@/integrations/supabase/client';
import type { OpportunityJob } from '@/features/opportunities/opportunity';
import {
  getDeadlineState,
  getOrganisation,
  getWorkModeLabel,
  experienceLevelLabel,
  deadlineIsUrgent,
} from '@/features/opportunities/opportunity';

interface OpportunitySpotlightProps {
  jobs: OpportunityJob[];
  /** Short, honest line describing which real signals ordered the list. */
  rankingSummary: string | null;
  error: boolean;
  /** Job IDs the student has already saved (for save feedback). */
  savedJobIds?: Set<string>;
  userId?: string | null;
  /** Called after a successful save/unsave so the parent can refresh local state. */
  onSavedChange?: (jobId: string, saved: boolean) => void;
}

/**
 * A small set of meaningful opportunity objects — not a grid dump.
 * Each card shows only decision-useful facts from the listing. Save uses
 * real feedback (optimistic + flash) without inventing fit scores.
 */
export function OpportunitySpotlight({
  jobs,
  rankingSummary,
  error,
  savedJobIds,
  userId,
  onSavedChange,
}: OpportunitySpotlightProps) {
  const [savingIds, setSavingIds] = useState<Set<string>>(() => new Set());
  const [localSaved, setLocalSaved] = useState<Set<string>>(() => new Set());
  const [justSaved, setJustSaved] = useState<string | null>(null);

  if (error) return null;

  const isSaved = (jobId: string) =>
    localSaved.has(jobId) || (savedJobIds?.has(jobId) ?? false);

  const toggleSave = async (job: OpportunityJob, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!userId || savingIds.has(job.id)) return;

    const wasSaved = isSaved(job.id);
    setSavingIds((current) => new Set(current).add(job.id));
    setLocalSaved((current) => {
      const next = new Set(current);
      if (wasSaved) next.delete(job.id);
      else next.add(job.id);
      return next;
    });
    // Optimistic: also clear parent-saved when unsaving
    if (wasSaved && savedJobIds?.has(job.id)) {
      onSavedChange?.(job.id, false);
    }

    try {
      if (wasSaved) {
        const { error: deleteError } = await supabase
          .from('saved_jobs')
          .delete()
          .eq('user_id', userId)
          .eq('job_id', job.id);
        if (deleteError) throw deleteError;
        onSavedChange?.(job.id, false);
        toast.success('Removed from saved');
      } else {
        const { error: insertError } = await supabase
          .from('saved_jobs')
          .insert({ user_id: userId, job_id: job.id });
        if (insertError && insertError.code !== '23505') throw insertError;
        onSavedChange?.(job.id, true);
        setJustSaved(job.id);
        window.setTimeout(() => setJustSaved((id) => (id === job.id ? null : id)), 900);
        toast.success('Saved');
      }
    } catch {
      setLocalSaved((current) => {
        const next = new Set(current);
        if (wasSaved) next.add(job.id);
        else next.delete(job.id);
        return next;
      });
      onSavedChange?.(job.id, wasSaved);
      toast.error('Could not update saved opportunities');
    } finally {
      setSavingIds((current) => {
        const next = new Set(current);
        next.delete(job.id);
        return next;
      });
    }
  };

  return (
    <section
      aria-labelledby="opportunity-spotlight-title"
      className="discover-enter"
      style={{ animationDelay: '140ms' }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="opportunity-spotlight-title" className="type-section-title">
            Opportunities
          </h2>
          {rankingSummary ? (
            <p className="type-meta mt-0.5 truncate">{rankingSummary}</p>
          ) : (
            <p className="type-meta mt-0.5">A few roles worth a closer look</p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" asChild>
          <Link to="/opportunities">
            Browse all <ArrowRight aria-hidden="true" className="ml-1 size-3.5" />
          </Link>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="discover-object p-5">
          <p className="text-sm font-medium text-foreground">No new opportunities to feature right now</p>
          <p className="type-secondary mt-1">
            You are already tracking or have saved the closest matches. Browse the full list to widen
            your search.
          </p>
          <div className="mt-4">
            <Button variant="outline" size="sm" asChild className="gap-1.5">
              <Link to="/opportunities">
                Browse opportunities <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-3">
          {jobs.map((job) => {
            const org = getOrganisation(job);
            const workMode = getWorkModeLabel(job);
            const level = experienceLevelLabel(job.experience_level);
            const deadline = getDeadlineState(job.application_deadline);
            const showDeadline = deadline.kind !== 'none' && deadline.kind !== 'passed';
            const urgent = deadlineIsUrgent(deadline);
            const saved = isSaved(job.id);
            const saving = savingIds.has(job.id);
            return (
              <li key={job.id}>
                <div
                  className={`discover-object h-full ${justSaved === job.id ? 'state-saved' : ''}`}
                >
                  <Link
                    to={`/opportunities?job=${encodeURIComponent(job.id)}`}
                    className="block p-4 pb-3 focus-visible:outline-none"
                    aria-label={`${job.title}${org ? `, ${org}` : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold leading-snug text-foreground">{job.title}</p>
                      <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                    </div>

                    {org && (
                      <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <Building2 aria-hidden="true" className="size-3.5 shrink-0" />
                        {org}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {job.location && (
                        <span className="inline-flex items-center gap-1 rounded-control border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          <MapPin aria-hidden="true" className="size-3" />
                          {job.location}
                        </span>
                      )}
                      {workMode && (
                        <span className="rounded-control border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {workMode}
                        </span>
                      )}
                      {level && (
                        <span className="rounded-control border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                          {level}
                        </span>
                      )}
                    </div>

                    {showDeadline && (
                      <p
                        className={`mt-3 text-[11px] font-semibold ${urgent ? 'text-warning' : 'text-muted-foreground'}`}
                      >
                        {deadline.label}
                      </p>
                    )}
                  </Link>

                  {userId && (
                    <div className="flex items-center justify-end border-t border-border px-3 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 text-xs"
                        onClick={(event) => toggleSave(job, event)}
                        disabled={saving}
                        aria-label={saved ? `Unsave ${job.title}` : `Save ${job.title}`}
                        aria-pressed={saved}
                      >
                        {saving ? (
                          <Spinner className="size-3.5" />
                        ) : saved ? (
                          <BookmarkCheck aria-hidden="true" className="size-3.5 text-primary" />
                        ) : (
                          <Bookmark aria-hidden="true" className="size-3.5" />
                        )}
                        {saved ? 'Saved' : 'Save'}
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default OpportunitySpotlight;
