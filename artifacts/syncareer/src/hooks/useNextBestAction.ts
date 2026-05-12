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
 * current progress. Tiered: Assessment -> CV -> Interview -> Apply -> Iterate.
 */
export function useNextBestAction({ hasAssessment, cvScore, interviewScore, applications }: Inputs): NextBestAction {
  return useMemo(() => {
    if (!hasAssessment) {
      return {
        title: 'Take the career assessment',
        description: '10 minutes to discover your top 3 career fits using the RIASEC model.',
        ctaLabel: 'Start assessment',
        href: '/assessment',
        reason: 'You haven\'t completed an assessment yet.',
      };
    }
    if (cvScore < 60) {
      return {
        title: cvScore === 0 ? 'Build your CV' : 'Strengthen your CV',
        description: cvScore === 0
          ? 'Create an ATS-friendly CV in under 15 minutes.'
          : `Your CV strength is ${cvScore}%. A few additions will push you above 60%.`,
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
