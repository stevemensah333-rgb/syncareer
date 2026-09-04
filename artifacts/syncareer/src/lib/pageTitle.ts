const exactTitles: Record<string, string> = {
  '/': 'Syncareer — Stronger, Evidence-Based Graduate Applications',
  '/assessment': 'Free RIASEC Career Assessment | Syncareer',
  '/onboarding': 'Set up your account | Syncareer',
  '/terms': 'Terms and Conditions — Syncareer',
  '/privacy': 'Privacy Policy — Syncareer',
  '/unsubscribe': 'Email preferences | Syncareer',
  '/signed-out': 'Signed out | Syncareer',
  '/reset-password': 'Reset password | Syncareer',
  '/settings': 'Settings | Syncareer',
  '/dashboard': 'Application Desk | Syncareer',
  '/opportunities': 'Opportunities | Syncareer',
  '/analysis': 'Market analysis | Syncareer',
  '/ai-coach': 'Assistant | Syncareer',
  '/interview-simulator': 'Interview simulator | Syncareer',
  '/applications': 'Applications | Syncareer',
  '/cv-builder': 'CV builder | Syncareer',
  '/build': 'Build your CV | Syncareer',
  '/practice': 'Practice | Syncareer',
  '/apply': 'Apply | Syncareer',
  '/counsellor-dashboard': 'Counsellor profile | Syncareer',
  '/counsellor-availability': 'Counsellor availability | Syncareer',
  '/counsellor-sessions': 'Counsellor sessions | Syncareer',
  '/counsellor-clients': 'Counsellor clients | Syncareer',
  '/counsellor/complete-credentials': 'Complete counsellor credentials | Syncareer',
  '/mentors': 'Find a mentor | Syncareer',
  '/mentorship/requests': 'Mentor requests | Syncareer',
  '/mentor/profile': 'Mentor profile | Syncareer',
  '/mentor/availability': 'Mentor availability | Syncareer',
  '/admin/mentors': 'Mentor verification | Syncareer',
  '/admin/feedback': 'Feedback dashboard | Syncareer',
  '/admin/users': 'User management | Syncareer',
  '/admin/credentials': 'Credential review | Syncareer',
};

/** Returns a concise, route-specific document title for SPA navigation. */
export function getPageTitle(pathname: string): string {
  if (pathname.endsWith('/forgot-password')) return 'Reset password | Syncareer';
  if (pathname.startsWith('/sign-in')) return 'Sign in | Syncareer';
  if (pathname.startsWith('/sign-up')) return 'Create your account | Syncareer';
  if (pathname.startsWith('/applications/')) return 'Application dossier | Syncareer';
  if (pathname.startsWith('/mentors/')) return 'Mentor profile | Syncareer';
  return exactTitles[pathname] ?? 'Page not found | Syncareer';
}
