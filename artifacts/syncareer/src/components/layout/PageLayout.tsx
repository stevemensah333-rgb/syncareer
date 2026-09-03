
import React from 'react';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { StudentLayout } from '@/components/layout/StudentLayout';
import { CounsellorLayout } from '@/components/layout/CounsellorLayout';
import type { BreadcrumbItem } from '@/components/layout/Navbar';

interface PageLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  /** Opt into dossier/document title typography. Reserved for application,
   *  evidence and application-CV surfaces. */
  headerVariant?: 'document' | 'operational';
}

/**
 * Role-aware PageLayout that delegates to the correct role-specific layout.
 * The user's role is fetched from UserProfileContext (always from DB, never cached client-side).
 * ProtectedRoute + RoleRoute ensure the profile is loaded before this renders.
 */
export function PageLayout({ children, title, description, breadcrumbs, headerVariant }: PageLayoutProps) {
  const { profile } = useUserProfile();
  const userType = profile?.user_type;

  if (userType === 'career_counsellor') {
    return (
      <CounsellorLayout title={title} description={description} breadcrumbs={breadcrumbs} headerVariant={headerVariant}>
        {children}
      </CounsellorLayout>
    );
  }

  // Default: student layout
  return (
    <StudentLayout title={title} description={description} breadcrumbs={breadcrumbs} headerVariant={headerVariant}>
      {children}
    </StudentLayout>
  );
}
