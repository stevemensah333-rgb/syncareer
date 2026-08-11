import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceInterviewMode } from './VoiceInterviewMode';

const hookState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('@/hooks/useVoiceInterview', () => ({
  useVoiceInterview: () => hookState.value,
}));

const baseState = {
  phase: 'completed', isActive: false, isLoading: false, isSpeaking: false,
  isListening: false, isCompleted: true, currentTranscript: '', currentQuestion: '',
  silenceWarning: false, error: null,
  progress: { answered: 1, total: 1, runningScore: 0, currentRound: 'complete', questionNumber: 1, totalQuestions: 1, category: 'complete', roundName: 'Complete', isFollowUp: false },
  start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), replayQuestion: vi.fn(), retry: vi.fn(),
};

describe('VoiceInterviewMode report', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders actual question and partial transcript evidence without a numeric hiring score', () => {
    hookState.value = {
      ...baseState,
      messages: [
        { id: 'q1', role: 'assistant', content: 'Tell me about a project you led.', timestamp: new Date() },
        { id: 'a1', role: 'user', content: 'I led a team project and delivered it on time.', timestamp: new Date() },
        { id: 'q2', role: 'assistant', content: 'What did you learn?', timestamp: new Date() },
      ],
    };
    render(<VoiceInterviewMode jobRole="Analyst" onEnd={vi.fn()} />);
    expect(screen.getByRole('heading', { level: 3, name: 'Tell me about a project you led.' })).toBeTruthy();
    expect(screen.getByText('No recognised answer is available for this question.')).toBeTruthy();
    expect(screen.queryByText(/\/100/)).toBeNull();
    expect(screen.getByText(/not semantic grading or a hiring probability/i)).toBeTruthy();
  });

  it('does not infer an assessment when no transcript evidence exists', () => {
    hookState.value = { ...baseState, messages: [] };
    render(<VoiceInterviewMode jobRole="Analyst" onEnd={vi.fn()} />);
    expect(screen.getByText('No question or transcript evidence is available. No assessment has been inferred.')).toBeTruthy();
  });

  it('disables the reactive pulse under reduced motion and exposes state as text', () => {
    hookState.value = {
      ...baseState,
      phase: 'user_speaking', isActive: true, isListening: true, isCompleted: false,
      currentQuestion: 'Why this role?', messages: [],
    };
    const { container } = render(<VoiceInterviewMode jobRole="Analyst" onEnd={vi.fn()} />);
    expect(screen.getByText('Listening')).toBeTruthy();
    expect(container.querySelector('.motion-reduce\\:animate-none')).toBeTruthy();
    expect(screen.getByRole('button', { name: /repeat question/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /pause/i })).toBeTruthy();
  });

  it('uses a labelled alert dialog for ending an active interview and lets Escape keep the session open', () => {
    hookState.value = {
      ...baseState,
      phase: 'user_speaking', isActive: true, isListening: true, isCompleted: false,
      currentQuestion: 'Why this role?', messages: [],
    };
    render(<VoiceInterviewMode jobRole="Analyst" onEnd={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'End interview' }));
    const dialog = screen.getByRole('alertdialog', { name: 'End this interview?' });
    expect(dialog).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Continue interview' })).toBeTruthy();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
