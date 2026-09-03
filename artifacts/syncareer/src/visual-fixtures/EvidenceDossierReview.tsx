import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  ChevronRight,
  FileText,
  Mail,
  Mic2,
  Search,
  User,
} from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AppSidebar, counsellorNavGroups, studentNavGroups } from '@/components/layout/AppSidebar';
import { MobileBottomNavView } from '@/components/layout/MobileBottomNav';
import { PageHeader } from '@/components/layout/PageHeader';
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
import { OpportunityDetail } from '@/components/opportunities/OpportunityDetail';
import type { MatchedOpportunityJob } from '@/features/opportunities/opportunity';

type ReviewScreen = 'home' | 'dossier' | 'cv' | 'opportunities' | 'shell';

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

const fixtureOpportunity: MatchedOpportunityJob = {
  id: 'opportunity-01',
  title: 'Graduate Data Analyst',
  department: null,
  location: 'Accra, Ghana',
  employment_type: 'full-time',
  salary_min: null,
  salary_max: null,
  salary_currency: null,
  description: 'Support recurring reporting, organize service data, and explain findings to programme teams.',
  requirements: 'Comfort with SQL, clear written communication, and experience working with structured data.',
  skills: ['SQL', 'Data reporting', 'Written communication'],
  created_at: '2026-08-28T09:00:00.000Z',
  employer_id: null,
  source: 'company careers',
  source_url: 'https://example.com/careers/graduate-data-analyst',
  is_external: true,
  application_deadline: '2026-09-12T23:59:59.000Z',
  company_name: 'Cedar Analytics',
  company_domain: null,
  experience_level: 'entry',
  external_id: 'cedar-001',
  status: 'active',
  updated_at: '2026-09-01T12:00:00.000Z',
};

function readScreen(): ReviewScreen {
  const requested = new URLSearchParams(window.location.search).get('screen');
  return requested === 'dossier' || requested === 'cv' || requested === 'opportunities' || requested === 'shell' ? requested : 'home';
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

  if (screen === 'shell') {
    return (
      <ShellFixture
        collapsed={params.get('collapsed') === 'true'}
        role={params.get('role') === 'mentor' ? 'mentor' : 'student'}
        dark={dark}
      />
    );
  }

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
          <div className="hidden min-w-0 flex-wrap items-center justify-end gap-2 sm:flex sm:w-auto">
            <div className="flex max-w-full overflow-x-auto border border-border bg-background" aria-label="Review screen">
              {(['home', 'opportunities', 'dossier', 'cv'] as const).map((item) => (
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
      <main className="mx-auto min-w-0 w-[calc(100%-2rem)] max-w-[1440px] overflow-x-hidden py-5 sm:w-[calc(100%-3rem)] lg:w-[calc(100%-4rem)] lg:py-7">
        {screen === 'home' && <HomeFixture onOpenDossier={() => changeScreen('dossier')} state={params.get('state') ?? 'active'} />}
        {screen === 'opportunities' && <MemoryRouter><OpportunityFixture detailOnly={params.get('detail') === 'true'} /></MemoryRouter>}
        {screen === 'dossier' && <DossierFixture onOpenCv={() => changeScreen('cv')} />}
        {screen === 'cv' && <CvFixture onBack={() => changeScreen('dossier')} />}
      </main>
    </div>
  );
}

function ShellFixture({ collapsed, role, dark }: { collapsed: boolean; role: 'student' | 'mentor'; dark: boolean }) {
  const isMentor = role === 'mentor';
  const route = isMentor ? '/mentorship/requests' : '/applications/example-dossier';
  const sidebarWidth = collapsed ? 'md:ml-[68px]' : 'md:ml-64';
  const topbarLeft = collapsed ? 'md:left-[68px]' : 'md:left-64';

  return (
    <MemoryRouter initialEntries={[route]}>
      <div className={cn('evidence-dossier-fixture min-h-screen bg-background text-foreground', dark && 'dark')}>
        <div className={cn('fixed inset-y-0 left-0 z-40 hidden md:block', collapsed ? 'w-[68px]' : 'w-64')}>
          <AppSidebar
            groups={isMentor ? counsellorNavGroups : studentNavGroups}
            isCollapsed={collapsed}
            onToggleCollapsed={() => undefined}
            currentDossier={isMentor ? null : { id: 'example-dossier', title: 'Graduate Data Analyst', company: 'Cedar Analytics', statusLabel: 'In review' }}
          />
        </div>

        <header className={cn('fixed inset-x-0 top-0 z-30 h-14 border-b border-border bg-background', topbarLeft)}>
          <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
            <span className="text-sm font-semibold md:hidden">Syncareer</span>
            <span className="hidden text-[13px] md:block">{isMentor ? 'Workspace · Requests' : 'Workspace · Applications'}</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label="Notifications" className="flex h-11 w-11 items-center justify-center text-muted-foreground md:h-9 md:w-9"><Bell className="h-4 w-4" /></button>
              <button type="button" aria-label="Account menu" className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-secondary text-primary md:h-9 md:w-9"><User className="h-4 w-4" /></button>
            </div>
          </div>
        </header>

        <main className={cn('min-h-screen pb-20 pt-14 transition-[margin] duration-150 md:pb-0', sidebarWidth)}>
          {isMentor && (
            <PageHeader
              title="Mentorship requests"
              description="Review focused requests and introduce yourself by email when you can help."
              variant="operational"
            />
          )}
          <div className="workspace-content mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
            {isMentor ? <MentorShellContent /> : <StudentShellContent />}
          </div>
        </main>
        <MobileBottomNavView userType={isMentor ? 'career_counsellor' : 'student'} />
      </div>
    </MemoryRouter>
  );
}

function StudentShellContent() {
  return (
    <WorkingDocument label="Graduate Data Analyst application dossier">
      <DossierHeader
        eyebrow="Current dossier / Updated today"
        title="Graduate Data Analyst"
        description="Cedar Analytics · Accra · Entry level"
        status={<span className="border border-primary/40 bg-secondary px-2 py-1 text-[11px] font-semibold text-primary">IN REVIEW</span>}
        actions={<Button type="button">Continue evidence</Button>}
      />
      <ApplicationStageRail stages={applicationStages} />
      <DossierSection index="01" label="Next action" title="Strengthen the SQL evidence">
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">Attach the source for your dashboard example before using it in the application CV.</p>
      </DossierSection>
    </WorkingDocument>
  );
}

function MentorShellContent() {
  return (
    <section className="dossier-document">
      <div className="border-b border-border px-4 py-4 sm:px-6">
        <p className="dossier-eyebrow">Request inbox</p>
        <h2 className="mt-1 text-base font-semibold">Pending requests</h2>
      </div>
      <RecordList label="Pending mentorship requests">
        <RecordRow title="Resume/CV review" eyebrow="Ama Mensah · Received today" detail="Graduate Data Analyst application · CV title visible; contact details remain private" status={<span className="text-xs font-semibold text-warning">Pending</span>} onClick={() => undefined} />
        <RecordRow title="Role/industry insight" eyebrow="Kojo Owusu · Received yesterday" detail="Product Operations application · Context ready for review" status={<span className="text-xs font-semibold text-warning">Pending</span>} onClick={() => undefined} />
      </RecordList>
    </section>
  );
}

function HomeFixture({ onOpenDossier, state }: { onOpenDossier: () => void; state: string }) {
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

      {state === 'partial' && <RecordState tone="warning" title="Some records are temporarily unavailable" description="Saved opportunities could not be refreshed. Applications that loaded successfully are still shown." action={<Button type="button" variant="outline" size="sm">Retry</Button>} />}

      {state === 'empty' ? (
        <WorkingDocument label="Empty application desk">
          <div className="grid border-b border-border md:grid-cols-[8rem_1fr]">
            <div className="border-b border-border bg-muted/40 px-4 py-5 md:border-b-0 md:border-r"><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">Desk / Empty</p></div>
            <div className="p-6 md:p-10"><p className="dossier-eyebrow text-primary">Your next piece of work</p><h2 className="dossier-title mt-3 text-2xl">Start with a real opportunity</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Review a current listing, save it if it is worth investigating, then continue into an application workspace.</p><Button type="button" className="mt-5">Find an opportunity<ChevronRight /></Button></div>
          </div>
          <div className="h-20 border-b border-border bg-muted/20" aria-hidden="true" />
        </WorkingDocument>
      ) : (

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <WorkingDocument label="Current application dossier">
            <DossierHeader
              titleAs="h2"
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
          {(state === 'deadline' || state === 'active') && <RecordState tone="warning" title="One deadline is close" description="A saved opportunity closes in three days. Decide whether it belongs in your application desk." action={<Button type="button" variant="outline" size="sm">Review</Button>} />}
        </aside>
      </div>
      )}
    </div>
  );
}

function OpportunityFixture({ detailOnly }: { detailOnly: boolean }) {
  const detail = <OpportunityDetail job={fixtureOpportunity} saved application={null} savingBookmark={false} tracking={false} onToggleSave={() => undefined} onTrack={() => undefined} />;
  if (detailOnly) return <section style={{ width: 'calc(100vw - 2rem)' }} className="min-w-0 max-w-full overflow-hidden border border-border bg-card">{detail}</section>;

  return (
    <div className="space-y-4">
      <header className="border-b border-border pb-5"><p className="dossier-eyebrow">Opportunity records</p><h1 className="dossier-title mt-1 text-[32px] leading-9">Opportunities</h1><p className="mt-2 text-sm text-muted-foreground">Review current external listings, inspect their source, and carry the right role into an application dossier.</p></header>
      <section className="dossier-document" aria-label="Opportunity search and filters">
        <div className="border-b border-border px-4 py-4"><p className="dossier-eyebrow">Opportunity index</p><div className="relative mt-3"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input aria-label="Search opportunities" className="h-10 w-full border border-input bg-background pl-9 pr-3 text-sm" placeholder="Search titles, organisations, or skills" /></div></div>
        <div className="flex flex-wrap gap-2 px-4 py-3"><Button type="button" variant="outline" size="sm">All types</Button><Button type="button" variant="outline" size="sm">Any experience</Button><Button type="button" variant="outline" size="sm">Any deadline</Button><span className="ml-auto font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">3 records</span></div>
      </section>
      <div className="grid min-h-[650px] overflow-hidden border border-border bg-card lg:grid-cols-[minmax(340px,420px)_1fr]">
        <section className="divide-y divide-border border-border lg:border-r" aria-label="Opportunity records">
          <FixtureOpportunityRow selected title="Graduate Data Analyst" company="Cedar Analytics" detail="Accra · Full-time" />
          <FixtureOpportunityRow title="Research Operations Associate" company="Morrow Labs" detail="Remote · Contract" />
          <FixtureOpportunityRow title="Junior Product Analyst" company="Northstar Systems" detail="Kumasi · Full-time" />
        </section>
        <section className="hidden overflow-y-auto lg:block" aria-label="Selected opportunity">{detail}</section>
      </div>
    </div>
  );
}

function FixtureOpportunityRow({ title, company, detail, selected = false }: { title: string; company: string; detail: string; selected?: boolean }) {
  return <button type="button" aria-current={selected || undefined} className={cn('min-h-[132px] w-full border-l-2 p-4 text-left', selected ? 'border-primary bg-secondary' : 'border-transparent')}><p className="dossier-eyebrow">{company}</p><p className="mt-2 text-sm font-semibold">{title}</p><p className="mt-2 text-xs text-muted-foreground">{detail}</p><span className="mt-3 inline-flex border border-border bg-card px-2 py-1 font-mono text-[10px] uppercase">Source retained</span></button>;
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
