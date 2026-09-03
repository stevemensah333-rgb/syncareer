import React from 'react';
import { counsellorNavGroups } from '@/components/layout/AppSidebar';
import { type BreadcrumbItem } from '@/components/layout/PageHeader';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

interface CounsellorLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  headerVariant?: 'document' | 'operational';
}

export function CounsellorLayout({ children, title, description, breadcrumbs, headerVariant }: CounsellorLayoutProps) {
  return (
    <AuthenticatedLayout
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      headerVariant={headerVariant}
      navigation={counsellorNavGroups}
      role="mentor"
    >
      {children}
    </AuthenticatedLayout>
  );
}
