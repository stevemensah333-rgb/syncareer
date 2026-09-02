import { FileText, Mic, Briefcase, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecordList, RecordRow } from '@/components/dossier';

export interface NextAction {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: 'cv' | 'interview' | 'opportunities' | 'outcome';
}

const ICON_MAP = {
  cv: FileText,
  interview: Mic,
  opportunities: Briefcase,
  outcome: CheckCircle2,
};

export function NextActionsList({ actions }: { actions: NextAction[] }) {
  const navigate = useNavigate();
  if (actions.length === 0) return null;

  return (
    <section className="dossier-document" aria-labelledby="next-actions-title">
      <header className="border-b border-border px-4 py-4">
        <h2 id="next-actions-title" className="text-sm font-semibold">Action docket</h2>
      </header>
      <RecordList className="border-y-0" label="Next actions">
        {actions.map(action => {
          const Icon = ICON_MAP[action.icon];
          return (
            <RecordRow
              key={action.id}
              eyebrow="Next action"
              title={action.title}
              detail={action.description}
              onClick={() => navigate(action.href)}
              status={<span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-muted"><Icon className="h-4 w-4 text-muted-foreground" /></span>}
            />
          );
        })}
      </RecordList>
    </section>
  );
}
