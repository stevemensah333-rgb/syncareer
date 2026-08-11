import { useMemo } from 'react';

export interface NextBestAction {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  reason: string;
}

interface Inputs {
  hasAssessment: boolean;
  cvScore: number;
  interviewScore: number;
  applications: number;
}

/**
 * Returns the single next best action a student should take based on their
 * current progress. Opportunity exploration is primary; assessment is optional.
 */
export function useNextBestAction({ hasAssessment, cvScore, interviewScore, applications }: Inputs): NextBestAction {
  return useMemo(() => {
    if (!hasAssessment) {
      return {
        title: 'Explore a real opportunity',
        description: 'Start with current external listings and choose a role worth investigating.',
        ctaLabel: 'Browse opportunities',
        href: '/opportunities',
        reason: 'The assessment remains available if you are still choosing a direction.',
      };
    }
    if (cvScore < 60) {
      return {
        title: cvScore === 0 ? 'Build your CV' : 'Strengthen your CV',
        description: cvScore === 0
          ? 'Create a clear, role-focused CV for your applications.'
          : `Your CV is ${cvScore}% complete. Use the builder checklist to choose the next section.`,
        ctaLabel: cvScore === 0 ? 'Open CV Builder' : 'Improve CV',
        href: '/cv-builder',
        reason: 'A strong CV unlocks better matches.',
      };
    }
    if (interviewScore < 70) {
      return {
        title: 'Practice an interview',
        description: interviewScore === 0
          ? 'Run a mock interview with SynAssist and get scored feedback.'
          : `Your last interview scored ${interviewScore}%. One more session to lift it past 70%.`,
        ctaLabel: 'Start mock interview',
        href: '/interview-simulator',
        reason: 'Interview prep is the highest-leverage next step.',
      };
    }
    if (applications < 5) {
      return {
        title: 'Apply to your top matches',
        description: 'You\'re interview-ready. Aim for 5+ targeted applications this week.',
        ctaLabel: 'Browse opportunities',
        href: '/opportunities',
        reason: 'You\'ve sent fewer than 5 applications.',
      };
    }
    return {
      title: 'Refine your applications',
      description: 'Review pipeline status and tailor follow-ups for active applications.',
      ctaLabel: 'Open tracker',
      href: '/applications',
      reason: 'Keep momentum on roles you\'ve already applied to.',
    };
  }, [hasAssessment, cvScore, interviewScore, applications]);
}
