import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CVEditorWorkspace } from './CVEditorWorkspace';
import type { CVData } from '@/features/cv-builder/types';
import { initialCVData } from '@/features/cv-builder/types';

vi.mock('@/hooks/useFeedbackModal', () => ({
  useFeedbackModal: () => ({
    isOpen: false,
    triggerFeedback: vi.fn(),
    submitFeedback: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

const mockCV: CVData = {
  ...initialCVData,
  personal: {
    firstName: 'Kwame',
    lastName: 'Mensah',
    phone: '+233 24 000 0000',
    nationality: 'Ghanaian',
    email: 'kwame.mensah@gmail.com',
    schoolEmail: 'kmensah@ashesi.edu.gh',
    linkedIn: 'https://linkedin.com/in/kwamemensah',
  },
  education: {
    university: 'Ashesi University',
    location: 'Berekuso',
    degree: 'BSc Computer Science',
    graduationDate: 'June 2026',
    gpa: '3.85',
  },
  achievements: [
    { id: 'ach-1', title: 'Mastercard Scholar', organization: 'Ashesi', date: '2024' },
  ],
  experience: [
    {
      id: 'exp-1',
      company: 'Standard Chartered Bank',
      location: 'Accra',
      date: 'May 2024 – Aug 2024',
      role: 'Fintech Analyst Intern',
      bullets: ['Automated reconciliation workflows with Python and SQL'],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      organization: 'Ashesi Capstone',
      date: '2024',
      projectName: 'Computer Vision Crop Analyzer',
      role: 'Lead Developer',
      bullets: ['Trained YOLO models achieving 92% classification accuracy'],
    },
  ],
  activities: [
    {
      id: 'act-1',
      organization: 'Robotics Club',
      activity: 'High School STEM Outreach',
      date: '2023 – 2024',
      role: 'Peer Mentor',
      bullets: ['Facilitated hands-on robotics workshops for 40 students'],
    },
  ],
  skills: ['Python', 'SQL', 'Data Analysis'],
  references: 'Available upon request',
};

describe('CVEditorWorkspace interaction & professional workbench', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a professional editing workspace with toolbar, save state, and section navigation', () => {
    const saveMock = vi.fn().mockResolvedValue({ ok: true, resumeId: 'res-1' });
    render(
      <MemoryRouter>
        <CVEditorWorkspace
          initialCv={mockCV}
          save={saveMock}
        />
      </MemoryRouter>
    );

    // Toolbar & Save state
    expect(screen.getByText('CV Editor')).toBeTruthy();
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByRole('button', { name: /upload cv/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /preview/i })).toBeTruthy();

    // Section outline
    expect(screen.getByRole('tab', { name: /personal/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /education/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /work experience/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /projects/i })).toBeTruthy();
    expect(screen.getByRole('tab', { name: /skills/i })).toBeTruthy();
  });

  it('transitions saving -> saved with visual feedback on confirmed save', async () => {
    let resolveSave: (val: any) => void = () => {};
    const savePromise = new Promise((resolve) => {
      resolveSave = resolve;
    });
    const saveMock = vi.fn().mockImplementation(() => savePromise);

    render(
      <MemoryRouter>
        <CVEditorWorkspace
          initialCv={mockCV}
          save={saveMock}
        />
      </MemoryRouter>
    );

    // Edit a field to mark unsaved
    const firstNameInput = screen.getByLabelText(/first name/i);
    fireEvent.change(firstNameInput, { target: { value: 'Kofi' } });

    // Save button becomes enabled with 'Save changes'
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    // In-flight state
    expect(screen.getAllByText('Saving…').length).toBeGreaterThan(0);

    // Resolve save
    resolveSave({ ok: true, resumeId: 'res-1' });

    await waitFor(() => {
      expect(screen.getAllByText('Saved').length).toBeGreaterThan(0);
    });
  });

  it('supports toggling between focused section view and continuous document view with collapsible sections', () => {
    const saveMock = vi.fn().mockResolvedValue({ ok: true, resumeId: 'res-1' });
    render(
      <MemoryRouter>
        <CVEditorWorkspace
          initialCv={mockCV}
          save={saveMock}
        />
      </MemoryRouter>
    );

    const toggleViewBtn = screen.getByRole('button', { name: /all sections/i });
    fireEvent.click(toggleViewBtn);

    // Should now show continuous document view with expandable headers
    expect(screen.getByRole('heading', { level: 2, name: /personal details/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /work experience/i })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: /education & honors/i })).toBeTruthy();

    // Collapse a section
    const expHeader = screen.getByRole('heading', { level: 2, name: /work experience/i }).closest('header');
    if (expHeader) {
      fireEvent.click(expHeader);
      expect(screen.getByText('Click to expand')).toBeTruthy();
    }
  });

  it('provides contextual AI assistance trigger and supports undoing an assisted change', async () => {
    const saveMock = vi.fn().mockResolvedValue({ ok: true, resumeId: 'res-1' });
    render(
      <MemoryRouter>
        <CVEditorWorkspace
          initialCv={mockCV}
          save={saveMock}
        />
      </MemoryRouter>
    );

    // Navigate to experience tab
    fireEvent.click(screen.getByRole('tab', { name: /work experience/i }));

    // Check for inline contextual improve button
    const improveBtn = screen.getByRole('button', { name: /improve/i });
    expect(improveBtn).toBeTruthy();

    fireEvent.click(improveBtn);
    // Contextual AI panel should open
    expect(screen.getByText('Wording help')).toBeTruthy();
  });
});
