import React from 'react';
import { studentNavGroups } from '@/components/layout/AppSidebar';
import { type BreadcrumbItem } from '@/components/layout/PageHeader';
import { AuthenticatedLayout } from '@/components/layout/AuthenticatedLayout';

interface StudentLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  headerVariant?: 'document' | 'operational';
}

export function StudentLayout({ children, title, description, breadcrumbs, headerVariant }: StudentLayoutProps) {
  return (
    <AuthenticatedLayout
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      headerVariant={headerVariant}
      navigation={studentNavGroups}
      role="student"
    >
      {children}
    </AuthenticatedLayout>
  );
}
