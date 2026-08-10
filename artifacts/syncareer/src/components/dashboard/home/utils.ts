// Pure helpers for the Home journey — no React, no Supabase IO.

export type ApplicationStatus =
  | 'pending'
  | 'reviewing'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn'
  | string;

export const ACTIVE_STATUSES: ApplicationStatus[] = [
  'pending',
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
];

export const ORDERED_STATUSES: ApplicationStatus[] = [
  'pending',
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
  'hired',
];

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Applied',
  reviewing: 'Under review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offered: 'Offered',
  hired: 'Hired',
  rejected: 'Closed',
  withdrawn: 'Withdrawn',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function getDaysUntilDeadline(deadline: string | null | undefined): number | null {
  if (!deadline) return null;
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / 86400000);
}

export function formatShortDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function getDeadlineLabel(days: number | null): { label: string; tone: 'urgent' | 'soon' | 'ok' } | null {
  if (days === null) return null;
  if (days < 0) return null;
  if (days === 0) return { label: 'Closes today', tone: 'urgent' };
  if (days === 1) return { label: 'Closes tomorrow', tone: 'urgent' };
  if (days <= 3) return { label: `Closes in ${days} days`, tone: 'urgent' };
  if (days <= 7) return { label: `Closes in ${days} days`, tone: 'soon' };
  return { label: `Closes ${formatShortDate(new Date(Date.now() + days * 86400000).toISOString())}`, tone: 'ok' };
}

export function scoreResume(resume: any): number {
  if (!resume) return 0;
  let score = 0;
  if (resume.personal_info?.fullName || resume.personal_info?.full_name) score += 15;
  if (resume.personal_info?.email) score += 10;
  if (Array.isArray(resume.education) && resume.education.length > 0) score += 20;
  if (Array.isArray(resume.experience) && resume.experience.length > 0) score += 20;
  if (Array.isArray(resume.skills) && resume.skills.length > 0) score += 15;
  if (Array.isArray(resume.projects) && resume.projects.length > 0) score += 15;
  // clamp + round down to avoid fake precision, also handle achievements as bonus
  if (Array.isArray(resume.achievements) && resume.achievements.length > 0) score += 5;
  return Math.min(100, score);
}

export interface NextStepForStatus {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

export function nextStepForApplicationStatus(
  status: string,
  jobTitle: string
): NextStepForStatus {
  const role = jobTitle || 'this role';
  switch (status) {
    case 'pending':
      return {
        title: 'Application under review',
        description: `Your application for ${role} has been received. Use this time to tailor your CV for similar roles or practise interview questions for ${role}.`,
        ctaLabel: 'Practise interview',
        href: '/interview-simulator',
      };
    case 'reviewing':
      return {
        title: 'Recruiter is reviewing',
        description: `The team is reviewing your application for ${role}. Prepare for the next stage by rehearsing role-specific answers.`,
        ctaLabel: 'Prepare for interview',
        href: '/practice',
      };
    case 'shortlisted':
      return {
        title: 'You have been shortlisted',
        description: `Great progress on ${role}. Focus your next hour on interview practice and refining your key stories.`,
        ctaLabel: 'Practise interview',
        href: `/interview-simulator?role=${encodeURIComponent(role)}`,
      };
    case 'interview':
      return {
        title: 'Interview stage',
        description: `You're in interviews for ${role}. Run a mock interview and review your CV alignment with the posting.`,
        ctaLabel: 'Run mock interview',
        href: `/interview-simulator?role=${encodeURIComponent(role)}`,
      };
    case 'offered':
      return {
        title: 'Offer received',
        description: `You have an offer for ${role}. When you're ready, record the outcome so your tracker stays accurate.`,
        ctaLabel: 'Record outcome',
        href: '/applications',
      };
    case 'hired':
      return {
        title: 'Hired — congratulations',
        description: `Your application for ${role} is marked as hired. Keep your CV updated for future opportunities.`,
        ctaLabel: 'Update CV',
        href: '/cv-builder',
      };
    case 'rejected':
      return {
        title: 'Application closed',
        description: `Your application for ${role} has been closed. Review feedback if available and apply your learnings to the next role.`,
        ctaLabel: 'Find new roles',
        href: '/opportunities',
      };
    case 'withdrawn':
      return {
        title: 'Application withdrawn',
        description: `You withdrew from ${role}. Your other applications are still active.`,
        ctaLabel: 'Browse opportunities',
        href: '/opportunities',
      };
    default:
      return {
        title: 'Keep momentum',
        description: `Stay active on ${role} — review the posting, improve your CV, and practise key interview answers.`,
        ctaLabel: 'Open tracker',
        href: '/applications',
      };
  }
}

export function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatShortDate(dateString);
}
