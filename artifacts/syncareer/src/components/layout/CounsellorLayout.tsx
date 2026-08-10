import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { AppSidebar, counsellorNavGroups } from '@/components/layout/AppSidebar';
import { PageHeader, type BreadcrumbItem } from '@/components/layout/PageHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

interface CounsellorLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
}

export function CounsellorLayout({ children, title, description, breadcrumbs }: CounsellorLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();

  return (
    <div className="app-canvas flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:px-4 focus:py-3 focus:bg-primary focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      <Navbar />
      <div className="flex flex-1 pt-16">
        {!isMobile && (
          <div
            className={cn(
              'fixed bottom-0 left-0 top-16 z-20 transition-[width] duration-150 ease-out',
              isCollapsed ? 'w-[68px]' : 'w-64'
            )}
          >
            <AppSidebar
              groups={counsellorNavGroups}
              isCollapsed={isCollapsed}
              onToggleCollapsed={() => setIsCollapsed((p) => !p)}
            />
          </div>
        )}
        <main
          id="main-content"
          tabIndex={-1}
          className={cn(
            'flex-1 transition-[margin] duration-150 ease-out focus:outline-none',
            !isMobile && (isCollapsed ? 'ml-[68px]' : 'ml-64'),
            isMobile && 'pb-16'
          )}
        >
          <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
