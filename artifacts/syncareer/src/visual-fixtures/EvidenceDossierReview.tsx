import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronRight,
  FileText,
  Mail,
  Mic2,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ApplicationStageRail,
  DossierActionBar,
  DossierHeader,
  DossierSection,
  EvidenceInspector,
  EvidenceReference,
  EvidenceStamp,
  EvidenceThread,
  RecordList,
  RecordRow,
  RecordState,
  SourceReference,
  WorkingDocument,
  type DossierStage,
} from '@/components/dossier';
import { cn } from '@/lib/utils';

type ReviewScreen = 'home' | 'dossier' | 'cv';

const applicationStages: DossierStage[] = [
  { id: 'applied', label: 'Applied', state: 'done' },
  { id: 'review', label: 'In review', state: 'current' },
  { id: 'interview', label: 'Interview', state: 'upcoming' },
  { id: 'offer', label: 'Offer', state: 'upcoming' },
  { id: 'outcome', label: 'Outcome', state: 'upcoming' },
];

const evidenceItems = [
  {
    id: 'a13f2c99',
    title: 'Built a reporting dashboard for a coursework project',
    summary: 'Combined SQL queries with a concise presentation of weekly service data.',
    status: 'supported' as const,
    uses: ['cv', 'interview'] as Array<'cv' | 'interview'>,
  },
];

function readScreen(): ReviewScreen {
  const requested = new URLSearchParams(window.location.search).get('screen');
  return requested === 'dossier' || requested === 'cv' ? requested : 'home';
}

export function EvidenceDossierReview() {
  const params = new URLSearchParams(window.location.search);
  const [screen, setScreen] = useState<ReviewScreen>(readScreen);
  const [dark, setDark] = useState(params.get('theme') === 'dark');
  const [compact, setCompact] = useState(params.get('density') === 'compact');

  useEffect(() => {
    document.body.classList.toggle('compact-view', compact);
    return () => document.body.classList.remove('compact-view');
  }, [compact]);

  const changeScreen = (next: ReviewScreen) => {
    setScreen(next);
    const nextParams = new URLSearchParams(window.location.search);
    nextParams.set('screen', next);
    window.history.replaceState(null, '', `${window.location.pathname}?${nextParams}`);
  };

  return (
    <div className={cn('evidence-dossier-fixture min-h-screen bg-background text-foreground', dark && 'dark')}>
      <header className="border-b border-border bg-card px-4 py-3 print:hidden">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="dossier-eyebrow text-primary">Syncareer design review</p>
            <p className="text-xs text-muted-foreground">Fixture data only · never shipped in the product bundle</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex border border-border bg-background" aria-label="Review screen">
              {(['home', 'dossier', 'cv'] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={screen === item}
                  className={cn('min-h-10 border-r border-border px-3 text-xs font-semibold capitalize last:border-r-0', screen === item ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                  onClick={() => changeScreen(item)}
                >
                  {item}
                </button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setCompact((value) => !value)}>{compact ? 'Comfortable' : 'Compact'}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setDark((value) => !value)}>{dark ? 'Light' : 'Dark'}</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {screen === 'home' && <HomeFixture onOpenDossier={() => changeScreen('dossier')} />}
        {screen === 'dossier' && <DossierFixture onOpenCv={() => changeScreen('cv')} />}
        {screen === 'cv' && <CvFixture onBack={() => changeScreen('dossier')} />}
      </main>
    </div>
  );
}

function HomeFixture({ onOpenDossier }: { onOpenDossier: () => void }) {
  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="dossier-eyebrow">Wednesday, 2 September</p>
          <h1 className="dossier-title mt-1 text-[26px] leading-8 sm:text-[32px] sm:leading-9">Application Desk</h1>
          <p className="mt-1 text-sm text-muted-foreground">Good morning, Ama. Continue the application that needs your attention.</p>
        </div>
        <Button type="button" variant="outline"><Search />Find an opportunity</Button>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <WorkingDocument label="Current application dossier">
            <DossierHeader
              eyebrow="Current dossier / Updated today"
              title="Graduate Data Analyst"
              description="Cedar Analytics · Accra · Entry level"
              status={<span className="border border-primary/40 bg-secondary px-2 py-1 text-[11px] font-semibold text-primary">IN REVIEW</span>}
              actions={<Button type="button" onClick={onOpenDossier}>Open dossier<ChevronRight /></Button>}
            />
            <ApplicationStageRail stages={applicationStages} />
            <DossierSection index="01" label="Next action" title="Strengthen the SQL evidence" description="The application is current; improve the evidence before interview preparation.">
              <div className="grid gap-4 sm:grid-cols-3">
                <Fact label="Due" value="4 September" tone="warning" />
                <Fact label="Evidence" value="2 of 3 supported" tone="success" />
                <Fact label="Application CV" value="Draft saved" />
              </div>
            </DossierSection>
          </WorkingDocument>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div><p className="dossier-eyebrow">Working set</p><h2 className="dossier-title mt-1 text-xl">Recent dossiers</h2></div>
              <Button type="button" variant="ghost" size="sm">View all</Button>
            </div>
            <RecordList label="Recent application dossiers">
              <RecordRow title="Graduate Data Analyst" eyebrow="In review" detail="Cedar Analytics · Updated today" status={<EvidenceStamp status="supported" />} onClick={onOpenDossier} />
              <RecordRow title="Research Operations Associate" eyebrow="Applied" detail="Morrow Labs · Updated 28 August" status={<span className="text-xs text-muted-foreground">1 gap</span>} onClick={() => undefined} />
              <RecordRow title="Junior Product Analyst" eyebrow="Closed" detail="Northstar Systems · Updated 19 August" status={<span className="text-xs text-muted-foreground">Outcome recorded</span>} onClick={() => undefined} />
            </RecordList>
          </section>
        </div>

        <aside className="min-w-0 space-y-6">
          <section className="dossier-document">
            <div className="border-b border-border px-4 py-4"><p className="dossier-eyebrow">Action docket</p><h2 className="mt-1 text-sm font-semibold">What needs attention</h2></div>
            <RecordList>
              <RecordRow title="Add a source for Python" eyebrow="Evidence gap" detail="Graduate Data Analyst" status={<span className="font-mono text-[11px] text-warning">DUE 04 SEP</span>} onClick={onOpenDossier} />
              <RecordRow title="Review mentor reply" eyebrow="Mentorship" detail="Portfolio feedback accepted" status={<Mail className="h-4 w-4 text-primary" />} onClick={() => undefined} />
            </RecordList>
          </section>
          <RecordState tone="warning" title="One deadline is close" description="A saved opportunity closes in three days. Decide whether it belongs in your application desk." action={<Button type="button" variant="outline" size="sm">Review</Button>} />
        </aside>
      </div>
    </div>
  );
}

function DossierFixture({ onOpenCv }: { onOpenCv: () => void }) {
  const [selectedEvidence, setSelectedEvidence] = useState('a13f2c99');
  const [stage, setStage] = useState('review');
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
      <aside className="hidden border border-border bg-card xl:block">
        <div className="border-b border-border p-3"><div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Search dossiers" className="h-10 w-full border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring" placeholder="Search dossiers" /></div></div>
        <RecordList label="Application dossiers">
          <RecordRow title="Graduate Data Analyst" eyebrow="In review" detail="Cedar Analytics" selected onClick={() => undefined} />
          <RecordRow title="Research Operations Associate" eyebrow="Applied" detail="Morrow Labs" onClick={() => undefined} />
          <RecordRow title="Junior Product Analyst" eyebrow="Closed" detail="Northstar Systems" onClick={() => undefined} />
        </RecordList>
      </aside>

      <WorkingDocument label="Graduate Data Analyst application dossier">
        <DossierHeader
          eyebrow="Application dossier / Source retained"
          title="Graduate Data Analyst"
          description="Cedar Analytics · Accra · Entry level"
          metadata={<span>Original listing captured 24 August · Updated today</span>}
          status={<span className="border border-primary/40 bg-secondary px-2 py-1 text-[11px] font-semibold text-primary">IN REVIEW</span>}
          actions={<><Button type="button" variant="outline">Update status</Button><Button type="button" onClick={onOpenCv}>Open CV<FileText /></Button></>}
        />
        <ApplicationStageRail stages={applicationStages} selectedId={stage} onStageChange={setStage} />
        <DossierSection index="01" label="Brief" title="What this role asks for">
          <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
            <Fact label="Source" value="Company careers page" />
            <Fact label="Location" value="Accra" />
            <Fact label="Deadline" value="12 September" tone="warning" />
          </div>
        </DossierSection>
        <DossierSection index="02" label="Evidence" title="Requirements and proof" description="Supported means you attached a source. It does not mean Syncareer verified the claim.">
          <div className="space-y-4">
            <EvidenceThread requirement="SQL reporting" detail="Build and explain reporting queries." evidence={evidenceItems} selectedEvidenceId={selectedEvidence} onSelectEvidence={setSelectedEvidence} />
            <EvidenceThread requirement="Python" detail="Use Python for data preparation." evidence={[{ id: 'b83d1071', title: 'Cleaned survey data in a methods course', status: 'needs_source' }]} selectedEvidenceId={selectedEvidence} onSelectEvidence={setSelectedEvidence} />
            <EvidenceThread requirement="AWS" detail="Exposure to cloud data tooling." evidence={[]} />
          </div>
        </DossierSection>
        <DossierSection index="03" label="Connected work" title="Documents and preparation">
          <RecordList>
            <RecordRow title="Graduate Data Analyst — application CV" eyebrow="CV / Draft saved" detail="2 evidence references used" status={<FileText className="h-4 w-4 text-primary" />} onClick={onOpenCv} />
            <RecordRow title="Role-specific interview practice" eyebrow="Interview / Not started" detail="Uses three explicit requirements" status={<Mic2 className="h-4 w-4 text-muted-foreground" />} onClick={() => undefined} />
            <RecordRow title="Portfolio feedback request" eyebrow="Mentor / Accepted" detail="Conversation continues over email" status={<Mail className="h-4 w-4 text-success" />} onClick={() => undefined} />
          </RecordList>
        </DossierSection>
        <DossierActionBar><Button type="button" variant="outline">Edit next action</Button><Button type="button" onClick={onOpenCv}>Continue CV</Button></DossierActionBar>
      </WorkingDocument>

      <EvidenceInspector title="Reporting dashboard" description="One confirmed example supports the selected requirement." className="hidden xl:block">
        <div className="flex items-center justify-between gap-2"><EvidenceReference id="a13f2c99" /><EvidenceStamp status="supported" /></div>
        <div><p className="dossier-eyebrow">Student-supplied evidence</p><p className="mt-2 text-sm leading-6">Built a SQL reporting dashboard for a coursework project and presented weekly service trends.</p></div>
        <SourceReference type="resume_entry" label="Projects / Reporting dashboard" detail="Base CV · source attached" />
        <div className="border-t border-border pt-4"><p className="dossier-eyebrow">Used by</p><p className="mt-2 flex items-center gap-2 text-xs"><FileText className="h-4 w-4 text-primary" />Application CV · Project bullet 01</p></div>
      </EvidenceInspector>
    </div>
  );
}

function CvFixture({ onBack }: { onBack: () => void }) {
  const mobilePanes = ['evidence', 'edit', 'preview'] as const;
  const [mobilePane, setMobilePane] = useState<(typeof mobilePanes)[number]>('edit');

  return (
    <div className="space-y-4">
      <button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground" onClick={onBack}><ArrowLeft className="h-4 w-4" />Graduate Data Analyst dossier</button>
      <WorkingDocument label="Application CV evidence editor">
        <DossierHeader
          eyebrow="Application CV / Draft saved"
          title="Graduate Data Analyst"
          description="Cedar Analytics · Built from Ama Mensah — Base CV"
          actions={<><Button type="button" variant="outline">Preview</Button><Button type="button">Save application CV<Check /></Button></>}
        />
        <div className="flex overflow-x-auto border-b border-border lg:hidden" role="tablist" aria-label="CV workspace">
          {mobilePanes.map((pane, index) => (
            <button
              key={pane}
              type="button"
              role="tab"
              aria-selected={mobilePane === pane}
              tabIndex={mobilePane === pane ? 0 : -1}
              className={cn(
                'relative min-h-11 flex-1 border-r border-border px-4 text-xs font-semibold capitalize last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                mobilePane === pane ? 'bg-secondary text-primary' : 'bg-card text-muted-foreground',
              )}
              onClick={() => setMobilePane(pane)}
              onKeyDown={(event) => {
                let nextIndex: number | undefined;
                if (event.key === 'ArrowRight') nextIndex = (index + 1) % mobilePanes.length;
                if (event.key === 'ArrowLeft') nextIndex = (index - 1 + mobilePanes.length) % mobilePanes.length;
                if (event.key === 'Home') nextIndex = 0;
                if (event.key === 'End') nextIndex = mobilePanes.length - 1;
                if (nextIndex === undefined) return;
                const nextPane = mobilePanes[nextIndex];
                if (!nextPane) return;
                event.preventDefault();
                setMobilePane(nextPane);
                requestAnimationFrame(() => {
                  const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
                  tabs?.[nextIndex]?.focus();
                });
              }}
            >
              {pane}
              {mobilePane === pane && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
        <div className="grid min-h-[680px] lg:grid-cols-[250px_minmax(0,1fr)] xl:grid-cols-[250px_minmax(0,1fr)_290px]">
          <aside className={cn('border-b border-border bg-muted/25 lg:block lg:border-b-0 lg:border-r', mobilePane !== 'evidence' && 'hidden')}>
            <div className="border-b border-border px-4 py-4"><p className="dossier-eyebrow">Evidence shelf</p><h2 className="mt-1 text-sm font-semibold">Choose facts to use</h2></div>
            <div className="space-y-4 p-4">
              <button type="button" className="w-full border-l-2 border-primary bg-secondary p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex flex-wrap items-center gap-2"><EvidenceReference id="a13f2c99" /><EvidenceStamp status="supported" /></div><p className="mt-2 text-sm font-semibold">Reporting dashboard</p><p className="mt-1 text-xs leading-5 text-muted-foreground">SQL queries and weekly service trends.</p></button>
              <button type="button" className="w-full border-l-2 border-warning bg-[hsl(var(--dossier-clay-wash))] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex flex-wrap items-center gap-2"><EvidenceReference id="b83d1071" /><EvidenceStamp status="needs_source" /></div><p className="mt-2 text-sm font-semibold">Survey data cleaning</p></button>
            </div>
          </aside>

          <section className={cn('min-w-0 border-b border-border lg:block lg:border-b-0 xl:border-r', mobilePane !== 'edit' && 'hidden')}>
            <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6"><div><p className="dossier-eyebrow">Working document</p><h2 className="mt-1 text-sm font-semibold">Experience and projects</h2></div><span className="text-xs text-success">Saved</span></div>
            <div className="space-y-6 px-4 py-5 sm:px-6">
              <EditorField label="Project" value="Service reporting dashboard" />
              <EditorField label="Role" value="Data analyst — coursework project" />
              <div>
                <div className="mb-2 flex items-center justify-between"><label className="text-xs font-semibold" htmlFor="fixture-bullet">Evidence-based bullet</label><EvidenceReference id="a13f2c99" /></div>
                <textarea id="fixture-bullet" className="min-h-28 w-full resize-y border border-input bg-background px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring" defaultValue="Built a SQL reporting dashboard that organised weekly service data and made recurring trends easier to review." />
                <p className="mt-2 text-[11px] text-muted-foreground">Based on a student-confirmed source. Review every word before saving.</p>
              </div>
              <RecordState tone="success" title="Evidence remains traceable" description="This bullet is linked to EV-A13F2C. Editing the wording does not change the original evidence record." />
            </div>
          </section>

          <aside className={cn('bg-muted/20 xl:block', mobilePane !== 'preview' && 'hidden', mobilePane === 'preview' && 'block lg:hidden')}>
            <div className="border-b border-border px-4 py-4"><p className="dossier-eyebrow">Requirement check</p><h2 className="mt-1 text-sm font-semibold">Role alignment</h2></div>
            <div className="space-y-5 p-4">
              <div><p className="text-xs font-semibold">SQL reporting</p><div className="mt-2 flex items-center gap-2 text-xs text-success"><Check className="h-4 w-4" />Supported in this CV</div></div>
              <div><p className="text-xs font-semibold">Python</p><div className="mt-2 flex items-center gap-2 text-xs text-warning"><CalendarClock className="h-4 w-4" />Evidence needs a source</div></div>
              <div><p className="text-xs font-semibold">AWS</p><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><BriefcaseBusiness className="h-4 w-4" />Visible gap</div></div>
              <Button type="button" variant="outline" className="w-full">Open CV preview</Button>
            </div>
          </aside>
        </div>
      </WorkingDocument>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' }) {
  return <div className={cn('border-l-2 border-border pl-3', tone === 'success' && 'border-success', tone === 'warning' && 'border-warning')}><p className="dossier-eyebrow">{label}</p><p className={cn('mt-1 text-sm font-semibold', tone === 'success' && 'text-success', tone === 'warning' && 'text-warning')}>{value}</p></div>;
}

function EditorField({ label, value }: { label: string; value: string }) {
  const id = `fixture-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return <div><label htmlFor={id} className="text-xs font-semibold">{label}</label><input id={id} defaultValue={value} className="mt-2 h-11 w-full border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring" /></div>;
}
