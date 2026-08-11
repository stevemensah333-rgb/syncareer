export interface InterviewContextFacts {
  role: string;
  organisation: string;
  description: string;
}

/** RIASEC themes and academic majors are not job roles or industries. */
export function manualInterviewContext(): InterviewContextFacts {
  return { role: '', organisation: '', description: '' };
}

export function listingInterviewContext(input: {
  title?: string | null;
  organisation?: string | null;
  description?: string | null;
}): InterviewContextFacts {
  return {
    role: input.title?.trim() ?? '',
    organisation: input.organisation?.trim() ?? '',
    description: input.description?.trim() ?? '',
  };
}

export type DeviceReadiness = 'unchecked' | 'checking' | 'ready' | 'denied' | 'missing' | 'failed';

export function classifyMicrophoneError(error: unknown): Exclude<DeviceReadiness, 'unchecked' | 'checking' | 'ready'> {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'missing';
  return 'failed';
}
