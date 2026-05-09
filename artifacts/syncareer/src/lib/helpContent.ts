/**
 * Centralized help content for tooltips and documentation
 */

export const helpContent: Record<string, { title: string; content: string; docLink?: string }> = {
  // Assessment
  'assessment-intro': {
    title: 'Career Assessment',
    content: 'Take our comprehensive career assessment to discover your strengths, skills, and ideal career paths. It takes about 10-15 minutes.',
    docLink: '/docs/assessment',
  },
  'assessment-scoring': {
    title: 'How Assessment Scoring Works',
    content: 'Your scores are based on your answers to our research-backed questions. Higher scores indicate stronger alignment with specific career paths.',
    docLink: '/docs/assessment/scoring',
  },

  // Portfolio
  'portfolio-cv': {
    title: 'CV Builder',
    content: 'Create an ATS-friendly CV that passes applicant tracking systems. Our builder guides you through each section with best practices.',
    docLink: '/docs/portfolio/cv',
  },
  'portfolio-projects': {
    title: 'Portfolio Projects',
    content: 'Showcase your best projects with descriptions, images, and links. Employers love seeing real work samples.',
    docLink: '/docs/portfolio/projects',
  },
  'portfolio-skills': {
    title: 'Skills Section',
    content: 'List your technical and soft skills. Be specific—use industry keywords that match job descriptions.',
    docLink: '/docs/portfolio/skills',
  },

  // Job Matching
  'jobs-filter': {
    title: 'Job Filters',
    content: 'Filter jobs by location, salary, experience level, and more. Save your preferences to get personalized recommendations.',
    docLink: '/docs/jobs/filters',
  },
  'jobs-matching': {
    title: 'Smart Matching',
    content: 'Our AI analyzes your profile and recommends jobs that match your skills and preferences.',
    docLink: '/docs/jobs/matching',
  },

  // AI Coach
  'ai-coach-intro': {
    title: 'AI Career Coach',
    content: 'Get personalized career advice, interview tips, and guidance from our AI-powered career coach. Available 24/7.',
    docLink: '/docs/ai-coach',
  },

  // Interview Simulator
  'interview-simulator': {
    title: 'Interview Practice',
    content: 'Practice common interview questions with our AI interviewer. Get feedback on your responses to improve your performance.',
    docLink: '/docs/interview-simulator',
  },

  // Settings
  'notifications-settings': {
    title: 'Notification Preferences',
    content: 'Control what notifications you receive and how often. You can disable categories you don\'t find useful.',
    docLink: '/docs/settings/notifications',
  },
  'privacy-settings': {
    title: 'Privacy & Security',
    content: 'Manage your privacy settings, control who can see your profile, and review your security settings.',
    docLink: '/docs/settings/privacy',
  },

  // General
  'career-readiness': {
    title: 'Career Readiness',
    content: 'Your career readiness score shows how prepared you are for employment across different dimensions. Improve your score by completing all sections.',
    docLink: '/docs/career-readiness',
  },
  'profile-completion': {
    title: 'Complete Your Profile',
    content: 'A complete profile increases your visibility to employers and helps us provide better recommendations.',
    docLink: '/docs/profile',
  },
};

/**
 * Get help content for a feature
 */
export function getHelpContent(featureId: string) {
  return helpContent[featureId] || null;
}

/**
 * Validate help content ID
 */
export function isValidHelpId(featureId: string): boolean {
  return featureId in helpContent;
}
