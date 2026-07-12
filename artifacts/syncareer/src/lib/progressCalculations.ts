/**
 * Progress tracking utilities for user journey
 */

export interface ProgressItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: Date;
}

export interface UserProgress {
  userId: string;
  profileCompletion: number; // 0-100
  profileItems: ProgressItem[];
  assessmentCompletion: number; // 0-100
  assessmentCount: number;
  assessmentCompleted: number;
  totalCompletion: number; // 0-100
  lastUpdated: Date;
  milestones: string[]; // Milestone IDs earned
}

/**
 * Calculate overall progress percentage
 */
export function calculateTotalProgress(progress: UserProgress): number {
  const weights = {
    profile: 0.34,
    assessment: 0.33,
    jobs: 0.33,
  };

  const jobsProgress = progress.assessmentCompleted > 0 ? 50 : 0;

  return Math.round(
    progress.profileCompletion * weights.profile +
    progress.assessmentCompletion * weights.assessment +
    jobsProgress * weights.jobs
  );
}

/**
 * Get milestone based on progress
 */
export function getMilestones(progress: UserProgress): string[] {
  const earned: string[] = [];

  if (progress.profileCompletion === 100) {
    earned.push('profile-complete');
  }

  if (progress.assessmentCompleted >= 1) {
    earned.push('first-assessment');
  }

  if (progress.assessmentCompleted >= 3) {
    earned.push('assessment-explorer');
  }

  if (calculateTotalProgress(progress) === 100) {
    earned.push('syncareer-ready');
  }

  return earned;
}

/**
 * Get milestone details
 */
export function getMilestoneDetails(milestoneId: string): {
  id: string;
  label: string;
  description: string;
  icon: string;
} | null {
  const milestones: Record<string, any> = {
    'profile-complete': {
      label: 'Profile Complete',
      description: 'You&apos;ve filled out your complete profile',
      icon: '👤',
    },
    'first-assessment': {
      label: 'First Assessment',
      description: 'You&apos;ve completed your first career assessment',
      icon: '📊',
    },
    'assessment-explorer': {
      label: 'Assessment Explorer',
      description: 'You&apos;ve completed 3+ assessments',
      icon: '🔍',
    },
    'syncareer-ready': {
      label: 'Syncareer Ready',
      description: 'You&apos;re fully prepared to land your dream role',
      icon: '🚀',
    },
  };

  const milestone = milestones[milestoneId];
  return milestone ? { id: milestoneId, ...milestone } : null;
}

/**
 * Get next recommended action
 */
export function getNextAction(progress: UserProgress): {
  action: string;
  description: string;
  urgency: 'high' | 'medium' | 'low';
} | null {
  if (progress.profileCompletion < 100) {
    return {
      action: 'Complete Profile',
      description: `Your profile is ${progress.profileCompletion}% complete. Finish it to improve visibility.`,
      urgency: 'high',
    };
  }

  if (progress.assessmentCompleted === 0) {
    return {
      action: 'Take Assessment',
      description: 'Start with our career assessment to discover your strengths.',
      urgency: 'high',
    };
  }

  if (progress.assessmentCompleted < 3) {
    return {
      action: 'Take More Assessments',
      description: 'Explore different career paths with additional assessments.',
      urgency: 'medium',
    };
  }

  return null;
}
