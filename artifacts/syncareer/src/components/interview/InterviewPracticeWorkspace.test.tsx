import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VoiceInterviewMode } from './VoiceInterviewMode';

const hookState = vi.hoisted(() => ({
  value: {} as Record<string, unknown>,
}));

vi.mock('@/hooks/useVoiceInterview', () => ({
  useVoiceInterview: () => hookState.value,
}));

const mockBaseState = {
  phase: 'user_speaking',
  isActive: true,
  isLoading: false,
  isSpeaking: false,
  isListening: true,
  isCompleted: false,
  currentTranscript: 'I implemented a data pipeline using Python.',
  currentQuestion: 'How did you handle data validation in your pipeline?',
  silenceWarning: false,
  error: null,
  progress: {
    answered: 2,
    total: 8,
    runningScore: 0,
    currentRound: 'technical',
    questionNumber: 3,
    totalQuestions: 8,
    category: 'technical',
    roundName: 'Technical Depth',
    isFollowUp: false,
  },
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  replayQuestion: vi.fn(),
  retry: vi.fn(),
};

describe('InterviewPracticeWorkspace (Advance / Practice mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the 4-tier practice hierarchy: Question ↓ Response ↓ Controls ↓ Progression', () => {
    hookState.value = {
      ...mockBaseState,
      messages: [
        { id: 'q1', role: 'assistant', content: 'Tell me about yourself.', timestamp: new Date() },
        { id: 'a1', role: 'user', content: 'I am a software engineering graduate.', timestamp: new Date() },
      ],
    };

    render(<VoiceInterviewMode jobRole="Backend Developer" industry="Fintech" onEnd={vi.fn()} />);

    // Step 1: Question Stage
    expect(screen.getByText('Active Interview Prompt:')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'How did you handle data validation in your pipeline?' })).toBeTruthy();
    expect(screen.getByText('Question 3 of 8')).toBeTruthy();

    // Step 2: Response Stage (Active Audio & Live Transcript)
    expect(screen.getByText('Your Response:')).toBeTruthy();
    expect(screen.getByText('Listening')).toBeTruthy();
    expect(screen.getByText(/I implemented a data pipeline using Python/)).toBeTruthy();

    // Controls
    expect(screen.getByRole('button', { name: /repeat question/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /pause/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /end interview/i })).toBeTruthy();
  });

  it('structures completed feedback around actual signals (strengths, missing depth, retry blueprint, rubric)', () => {
    hookState.value = {
      ...mockBaseState,
      phase: 'completed',
      isCompleted: true,
      isActive: false,
      isListening: false,
      messages: [
        { id: 'q1', role: 'assistant', content: 'Describe a project where you solved a difficult bug.', timestamp: new Date() },
        { id: 'a1', role: 'user', content: 'During my internship at Standard Bank, I resolved a memory leak in the transaction API.', timestamp: new Date() },
      ],
    };

    render(<VoiceInterviewMode jobRole="Backend Developer" difficulty="intermediate" onEnd={vi.fn()} />);

    // Evaluation Pillars
    expect(screen.getByText('Interview Performance Review')).toBeTruthy();
    expect(screen.getByText(/Assessment Rubric & Signal Verification/i)).toBeTruthy();
    expect(screen.getByText('Strongest Moments')).toBeTruthy();
    expect(screen.getByText(/Missing Depth & High-Priority Improvements/i)).toBeTruthy();
    expect(screen.getByText(/Structured STAR Retry Blueprint/i)).toBeTruthy();

    // Rubric checks
    expect(screen.getByText('relevance')).toBeTruthy();
    expect(screen.getByText('specificity')).toBeTruthy();
    expect(screen.getByText('evidence')).toBeTruthy();
    expect(screen.getByText('clarity')).toBeTruthy();
  });
});
