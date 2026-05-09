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
  portfolioCompletion: number; // 0-100
  portfolioSections: ProgressItem[];
  totalCompletion: number; // 0-100
  lastUpdated: Date;
  milestones: string[]; // Milestone IDs earned
}

/**
 * Calculate overall progress percentage
 */
export function calculateTotalProgress(progress: UserProgress): number {
  const weights = {
    profile: 0.25,
    assessment: 0.25,
    portfolio: 0.25,
    jobs: 0.25,
  };

  const jobsProgress = progress.assessmentCompleted > 0 ? 50 : 0;

  return Math.round(
    progress.profileCompletion * weights.profile +
    progress.assessmentCompletion * weights.assessment +
    progress.portfolioCompletion * weights.portfolio +
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

  if (progress.portfolioCompletion >= 50) {
    earned.push('portfolio-starter');
  }

  if (progress.portfolioCompletion === 100) {
    earned.push('portfolio-complete');
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
    'portfolio-starter': {
      label: 'Portfolio Starter',
      description: 'Your portfolio is half complete',
      icon: '🎨',
    },
    'portfolio-complete': {
      label: 'Portfolio Complete',
      description: 'Your portfolio is fully complete and ready to show',
      icon: '✨',
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

  if (progress.portfolioCompletion < 50) {
    return {
      action: 'Build Portfolio',
      description: 'Showcase your work and skills with a professional portfolio.',
      urgency: 'medium',
    };
  }

  if (progress.assessmentCompleted < 3) {
    return {
      action: 'Take More Assessments',
      description: 'Explore different career paths with additional assessments.',
      urgency: 'medium',
    };
  }

  if (progress.portfolioCompletion < 100) {
    return {
      action: 'Complete Portfolio',
      description: 'Finish your portfolio to maximize your job opportunities.',
      urgency: 'low',
    };
  }

  return null;
}
