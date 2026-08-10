// ── Interview round labels ────────────────────────────────────────

export interface RoundInfo {
  label: string;
  color: string;
}

export const ROUND_LABELS: Record<string, RoundInfo> = {
  intro: { label: 'Intro', color: 'bg-primary/20 text-primary border-primary/30' },
  technical: { label: 'Technical', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  behavioral: { label: 'Behavioral', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  situational: { label: 'Scenario', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  closing: { label: 'Closing', color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  complete: { label: 'Complete', color: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' },
};

// ── Session length options ────────────────────────────────────────

export interface SessionLengthOption {
  value: 'quick' | 'standard' | 'extended';
  label: string;
  description: string;
  questions: number;
}

export const SESSION_OPTIONS: SessionLengthOption[] = [
  { value: 'quick', label: 'Quick', description: '~15 min · 8 questions', questions: 8 },
  { value: 'standard', label: 'Standard', description: '~30 min · 15 questions', questions: 15 },
  { value: 'extended', label: 'Deep Dive', description: '~45 min · 20 questions', questions: 20 },
];
