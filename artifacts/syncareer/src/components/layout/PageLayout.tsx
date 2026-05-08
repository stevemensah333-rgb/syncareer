
import React from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { EmployerLayout } from '@/components/layout/EmployerLayout';
import { CounsellorLayout } from '@/components/layout/CounsellorLayout';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
}

/**
 * Role-aware PageLayout that delegates to the correct role-specific layout.
 * The user's role is fetched from UserProfileContext (always from DB, never cached client-side).
 * ProtectedRoute + RoleRoute ensure the profile is loaded before this renders.
 */
export function PageLayout({ children, title }: PageLayoutProps) {
  const { profile } = useUserProfile();
  const userType = profile?.user_type;

  if (userType === 'employer') {
    return <EmployerLayout title={title}>{children}</EmployerLayout>;
  }

  if (userType === 'career_counsellor') {
    return <CounsellorLayout title={title}>{children}</CounsellorLayout>;
  }

  // Default: student layout
  return <StudentLayout title={title}>{children}</StudentLayout>;
}
