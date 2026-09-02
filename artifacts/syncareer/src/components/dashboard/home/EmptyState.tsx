import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function EmptyState({ hasApplicationHistory = false, showAssessment = false }: { hasApplicationHistory?: boolean; showAssessment?: boolean }) {
  const navigate = useNavigate();
  return (
    <section className="dossier-document" aria-labelledby="application-desk-empty-title">
      <div className="grid border-b border-border md:grid-cols-[8rem_1fr]">
        <div className="border-b border-border bg-muted/40 px-4 py-5 md:border-b-0 md:border-r">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Desk / Empty</p>
        </div>
        <div className="p-6 md:p-10">
        <div className="max-w-2xl space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your next piece of work</p>
            <h2 id="application-desk-empty-title" className="dossier-title text-xl leading-7 md:text-2xl md:leading-8">{hasApplicationHistory ? 'Choose the next opportunity to pursue' : 'Start with a real opportunity'}</h2>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              {hasApplicationHistory ? 'Your current applications are complete or no longer active. Review a current listing and start a new application when you find one worth pursuing.' : 'Review a current listing, save it if it is worth investigating, then continue into an application workspace.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/opportunities')} className="gap-1.5">
              Find an opportunity <ArrowRight className="h-4 w-4" />
            </Button>
            {showAssessment && <Button variant="outline" onClick={() => navigate('/assessment')}>Still choosing a direction?</Button>}
          </div>
        </div>
        </div>
      </div>
      <div className="h-10 dossier-rules" aria-hidden="true" />
    </section>
  );
}
