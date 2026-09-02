import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AppSidebar, type NavGroup } from '@/components/layout/AppSidebar';
import { PageHeader, type BreadcrumbItem } from '@/components/layout/PageHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCurrentDossier } from '@/features/navigation/useCurrentDossier';
import { cn } from '@/lib/utils';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  navigation: NavGroup[];
  role: 'student' | 'mentor';
}

/** Shared authenticated workspace shell. Role-specific layouts supply only
 * their navigation model so spacing, focus order, and responsive behavior stay
 * consistent for students and counsellors. */
export function AuthenticatedLayout({
  children,
  title,
  description,
  breadcrumbs,
  navigation,
  role,
}: AuthenticatedLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const currentDossier = useCurrentDossier(role === 'student');

  return (
    <div className="workspace-shell min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>

      {!isMobile && (
        <div
          className={cn(
            'fixed inset-y-0 left-0 z-40 transition-[width] duration-150 ease-out motion-reduce:transition-none',
            isCollapsed ? 'w-[68px]' : 'w-64',
          )}
        >
          <AppSidebar
            groups={navigation}
            isCollapsed={isCollapsed}
            onToggleCollapsed={() => setIsCollapsed((current) => !current)}
            currentDossier={role === 'student' ? currentDossier : null}
          />
        </div>
      )}

      <Navbar
        className={cn(
          !isMobile && (isCollapsed ? 'left-[68px]' : 'left-64'),
        )}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'min-h-screen pt-14 transition-[margin] duration-150 ease-out focus:outline-none motion-reduce:transition-none',
          !isMobile && (isCollapsed ? 'ml-[68px]' : 'ml-64'),
          isMobile && 'pb-[calc(3.75rem+env(safe-area-inset-bottom,0px))]',
        )}
      >
        <PageHeader
          title={title}
          description={description}
          breadcrumbs={breadcrumbs}
          variant={role === 'mentor' ? 'operational' : 'document'}
        />
        <div className="workspace-content mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </div>
      </main>

      {isMobile && <MobileBottomNav />}
    </div>
  );
}
