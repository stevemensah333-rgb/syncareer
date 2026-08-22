import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CVAIAssistant } from './CVAIAssistant';
import type { CVData } from '@/features/cv-builder/types';
import { buildCandidateEvidence, type CvSuggestion, type OpportunityContext } from '@/features/cv-builder/guidance';

const propose = vi.hoisted(() => vi.fn());
vi.mock('@/features/cv-builder/aiOperations', async (load) => {
  const actual = await load<typeof import('@/features/cv-builder/aiOperations')>();
  return { ...actual, proposeCvBulletImprovement: propose };
});

const cv: CVData = {
  personal: { firstName: 'Ama', lastName: 'Mensah', phone: '', nationality: '', email: 'ama@example.test', schoolEmail: '', linkedIn: '' },
  education: { university: '', location: '', degree: '', graduationDate: '', gpa: '' },
  achievements: [],
  experience: [{ id: 'exp-1', company: 'Campus Lab', location: 'Accra', date: '2026', role: 'Volunteer', bullets: ['Built a Python data cleaner'] }],
  projects: [], activities: [], skills: ['Python'], references: '',
};
const requirement = { requirementId: 'requirement-python', kind: 'required_skill' as const, text: 'Python', sourceText: 'Python', sourceField: 'skills' as const };
const opportunity: OpportunityContext = {
  opportunityId: 'job-1', title: 'Data Intern', organisation: 'Example Ltd', description: 'Python', responsibilities: [],
  requiredQualifications: [], preferredQualifications: [], requiredSkills: ['Python'], preferredSkills: [], requirements: [requirement],
};

function suggestion(): CvSuggestion {
  return {
    suggestionId: 'suggestion-1', targetSection: 'experience', fieldPath: 'experience.exp-1.bullets.0',
    originalText: 'Built a Python data cleaner', proposedText: 'Developed a Python data cleaner',
    evidenceIds: [buildCandidateEvidence(cv)[0]!.evidenceId], requirementIds: ['requirement-python'],
    rationale: 'Connects the selected project evidence to the Python requirement.', unsupportedClaims: [], warnings: [], confidence: 'high',
  };
}

describe('job-specific CV suggestion review', () => {
  it('shows original/proposal/evidence/rationale, supports edit, accept and undo', async () => {
    propose.mockResolvedValue(suggestion());
    const onSuggestion = vi.fn(() => true);
    const onUndo = vi.fn();
    render(<CVAIAssistant cvData={cv} activeSection="experience" opportunity={opportunity} onSuggestion={onSuggestion} onUndo={onUndo} />);

    await waitFor(() => expect((screen.getByRole('button', { name: 'Request suggestion' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Request suggestion' }));
    expect(await screen.findByText('Suggested for review')).toBeTruthy();
    expect(screen.getAllByText('Built a Python data cleaner')).toHaveLength(2);
    expect(screen.getByText(/Connects the selected project evidence/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Proposed — editable'), { target: { value: 'Developed a concise Python data cleaner' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to draft' }));
    expect(onSuggestion).toHaveBeenCalledWith(expect.objectContaining({ after: 'Developed a concise Python data cleaner' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo AI change' }));
    expect(onUndo).toHaveBeenCalledOnce();
  });

  it('rejects without changing the CV', async () => {
    propose.mockResolvedValue(suggestion());
    const onSuggestion = vi.fn(() => true);
    render(<CVAIAssistant cvData={cv} activeSection="experience" opportunity={opportunity} onSuggestion={onSuggestion} onUndo={vi.fn()} />);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Request suggestion' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Request suggestion' }));
    await screen.findByText('Suggested for review');
    fireEvent.click(screen.getByRole('button', { name: 'Reject' }));
    expect(screen.getByText(/Suggestion rejected/)).toBeTruthy();
    expect(onSuggestion).not.toHaveBeenCalled();
  });
});
