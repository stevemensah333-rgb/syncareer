
import React from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { CounsellorLayout } from '@/components/layout/CounsellorLayout';
import type { BreadcrumbItem } from '@/components/layout/PageHeader';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
}

/**
 * Role-aware PageLayout that delegates to the correct role-specific layout.
 * The user's role is fetched from UserProfileContext (always from DB, never cached client-side).
 * ProtectedRoute + RoleRoute ensure the profile is loaded before this renders.
 */
export function PageLayout({ children, title, description, breadcrumbs }: PageLayoutProps) {
  const { profile } = useUserProfile();
  const userType = profile?.user_type;

  if (userType === 'career_counsellor') {
    return (
      <CounsellorLayout title={title} description={description} breadcrumbs={breadcrumbs}>
        {children}
      </CounsellorLayout>
    );
  }

  // Default: student layout
  return (
    <StudentLayout title={title} description={description} breadcrumbs={breadcrumbs}>
      {children}
    </StudentLayout>
  );
}
