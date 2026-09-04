import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DossierRequirementsEvidence } from './DossierRequirementsEvidence';
import type {
  ApplicationEvidenceLinkRow,
  ApplicationRequirementRow,
  EvidenceItemRow,
  EvidenceSourceRow,
  ResumeEvidenceLinkRow,
} from '@/features/evidence/types';

const NOW = '2026-09-01T09:00:00.000Z';
const USER = 'user-1';

function requirement(overrides: Partial<ApplicationRequirementRow> = {}): ApplicationRequirementRow {
  return {
    id: 'req-1',
    application_id: 'app-1',
    user_id: USER,
    label: 'SQL reporting',
    detail: 'Build and explain reporting queries.',
    origin: 'posting_skill',
    sort_order: 0,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function item(overrides: Partial<EvidenceItemRow> = {}): EvidenceItemRow {
  return {
    id: 'ev-1',
    user_id: USER,
    category: 'project',
    title: 'Reporting dashboard',
    summary: 'Weekly service data.',
    occurred_on: null,
    review_status: 'confirmed',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function source(overrides: Partial<EvidenceSourceRow> = {}): EvidenceSourceRow {
  return {
    id: 'src-1',
    evidence_id: 'ev-1',
    user_id: USER,
    source_type: 'manual_note',
    resume_id: null,
    interview_id: null,
    entry_locator: null,
    source_label: 'Coursework folder',
    source_excerpt: 'Dashboard screenshots.',
    source_url: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function link(overrides: Partial<ApplicationEvidenceLinkRow> = {}): ApplicationEvidenceLinkRow {
  return {
    id: 'link-1',
    requirement_id: 'req-1',
    evidence_id: 'ev-1',
    user_id: USER,
    relevance_note: 'Explains the dashboard',
    created_at: NOW,
    ...overrides,
  };
}

function cvLink(overrides: Partial<ResumeEvidenceLinkRow> = {}): ResumeEvidenceLinkRow {
  return {
    id: 'cv-link-1',
    resume_id: 'cv-1',
    evidence_id: 'ev-1',
    user_id: USER,
    cv_section: 'projects',
    entry_locator: 'entry 1',
    created_at: NOW,
    ...overrides,
  };
}

type Props = React.ComponentProps<typeof DossierRequirementsEvidence>;

function baseProps(overrides: Partial<Props> = {}): Props {
  return {
    requirements: [requirement()],
    links: [],
    items: [item()],
    sources: [],
    resumeLinks: [],
    postingSkillCount: 1,
    busy: false,
    applicationCvId: 'cv-1',
    applicationCvTitle: 'Graduate Analyst CV',
    cvHref: '/applications/app-1/cv',
    interviewHref: '/applications/app-1/interview',
    onLinkEvidence: vi.fn().mockResolvedValue(true),
    onUnlinkEvidence: vi.fn().mockResolvedValue(true),
    onImportPostingSkills: vi.fn().mockResolvedValue(null),
    onAddManualRequirement: vi.fn().mockResolvedValue(null),
    onRemoveRequirement: vi.fn().mockResolvedValue(true),
    onRequestSourceForEvidence: vi.fn(),
    ...overrides,
  };
}

function renderSection(overrides: Partial<Props> = {}) {
  const props = baseProps(overrides);
  render(
    <MemoryRouter>
      <DossierRequirementsEvidence {...props} />
    </MemoryRouter>,
  );
  return props;
}

const threadOf = (label: string) => screen.getByRole('region', { name: `Evidence for ${label}` });

describe('DossierRequirementsEvidence', () => {
  it('reads as the four-band flow: requirement, evidence, material, next action', () => {
    renderSection({
      requirements: [
        requirement(),
        requirement({ id: 'req-2', label: 'Written communication', detail: null, sort_order: 1 }),
      ],
      links: [link()],
      sources: [source()],
      resumeLinks: [cvLink()],
    });

    const thread = threadOf('SQL reporting');
    expect(thread.textContent).toMatch(
      /Job requirement[\s\S]*Your evidence[\s\S]*Application material[\s\S]*Next action/,
    );
    expect(thread.textContent).toContain('Build and explain reporting queries.');
    expect(thread.textContent).toContain('Reporting dashboard');
    expect(thread.textContent).toContain('Explains the dashboard');
    // The material band names the CV and the recorded locator rather than
    // claiming a vaguer "used somewhere".
    expect(thread.textContent).toContain('Graduate Analyst CV');
    expect(thread.textContent).toContain('Projects · entry 1');
    // Supported and already in the CV, so the one step left is rehearsal.
    expect(screen.getByRole('link', { name: 'Practice this in interview prep' }).getAttribute('href')).toBe(
      '/applications/app-1/interview',
    );

    // A requirement with no recorded detail says where it came from instead.
    const gapThread = threadOf('Written communication');
    expect(gapThread.textContent).toContain('From the job listing');
    expect(gapThread.textContent).toContain('No supporting evidence yet');

    expect(screen.getByText('1 of 2 requirements have supported evidence')).toBeTruthy();
  });

  it('keeps a gap visible and points at the control that closes it', async () => {
    const props = renderSection();
    const thread = threadOf('SQL reporting');
    expect(thread.textContent).toContain('No evidence answers this requirement yet.');
    expect(thread.textContent).toContain('Nothing from this requirement is in your CV or interview practice yet.');

    fireEvent.click(screen.getByRole('button', { name: 'Link evidence to SQL reporting' }));
    // The next action opens the picker for eligible evidence, not a new screen.
    expect(await screen.findByRole('radio', { name: 'Reporting dashboard' })).toBeTruthy();
    expect(props.onLinkEvidence).not.toHaveBeenCalled();
  });

  it('says where to start when there is nothing eligible to link', () => {
    renderSection({ items: [] });
    fireEvent.click(screen.getByRole('button', { name: 'Link evidence to SQL reporting' }));
    expect(screen.getByText('Nothing eligible yet. Save evidence in the Evidence section first.')).toBeTruthy();
  });

  it('sends the student to the exact source control when evidence needs one', () => {
    const props = renderSection({ links: [link()] });
    expect(threadOf('SQL reporting').textContent).toContain('1 item attached, none backed by a source.');
    fireEvent.click(screen.getByRole('button', { name: 'Add a source' }));
    expect(props.onRequestSourceForEvidence).toHaveBeenCalledWith('ev-1');
  });

  it('selecting a requirement or an evidence record drives the inspector selection', () => {
    const onSelectRequirement = vi.fn();
    const onSelectEvidence = vi.fn();
    renderSection({
      links: [link()],
      sources: [source()],
      selectedRequirementId: 'req-1',
      onSelectRequirement,
      selectedEvidenceId: null,
      onSelectEvidence,
    });

    const requirementButton = screen.getByRole('button', { name: /Job requirement SQL reporting/ });
    expect(requirementButton.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(requirementButton);
    expect(onSelectRequirement).toHaveBeenCalledWith('req-1');

    const evidenceRow = threadOf('SQL reporting').querySelector<HTMLButtonElement>('.evidence-thread-track')!;
    expect(evidenceRow.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(evidenceRow);
    expect(onSelectEvidence).toHaveBeenCalledWith('ev-1');
  });

  it('tints the evidence row the inspector is describing', () => {
    renderSection({
      links: [link()],
      sources: [source()],
      selectedEvidenceId: 'ev-1',
      onSelectEvidence: vi.fn(),
    });
    const row = threadOf('SQL reporting').querySelector<HTMLElement>('.evidence-thread-track')!;
    // Selection is stated twice: the tint plus the explicit state attribute the
    // CSS keys on, so it never depends on colour alone.
    expect(row.getAttribute('data-state')).toBe('selected');
    expect(row.getAttribute('aria-pressed')).toBe('true');
  });

  it('flashes a row for one tick after the link lands', async () => {
    function Harness() {
      const [links, setLinks] = useState<ApplicationEvidenceLinkRow[]>([]);
      const onLinkEvidence = vi.fn(async (requirementId: string, evidenceId: string) => {
        setLinks((current) => [
          ...current,
          {
            id: 'link-new',
            requirement_id: requirementId,
            evidence_id: evidenceId,
            user_id: USER,
            relevance_note: null,
            created_at: NOW,
          },
        ]);
        return true;
      });
      return (
        <DossierRequirementsEvidence
          {...baseProps({ links, onLinkEvidence, sources: [source()] })}
        />
      );
    }

    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Link evidence to SQL reporting' }));
    fireEvent.click(await screen.findByRole('radio', { name: 'Reporting dashboard' }));
    fireEvent.click(screen.getByRole('button', { name: 'Link evidence' }));
    await waitFor(() => expect(screen.getByText('Reporting dashboard')).toBeTruthy());

    const row = threadOf('SQL reporting').querySelector<HTMLElement>('.evidence-thread-track')!;
    expect(row.className).toContain('dossier-flash');
    // The row keeps its real support state underneath the confirmation.
    expect(row.getAttribute('data-state')).toBe('supported');
  });

  it('keeps maintenance controls out of the flow bands', () => {
    renderSection({ links: [link()], sources: [source()] });
    const thread = threadOf('SQL reporting');
    const nextActionBand = thread.querySelector('[data-flow-band="next-action"]');
    const editBand = thread.querySelector('[data-flow-band="edits"]');
    expect(nextActionBand?.textContent).not.toContain('Unlink');
    expect(editBand?.textContent).toContain('Unlink Reporting dashboard');
    expect(editBand?.textContent).toContain('Remove requirement');
  });
});
