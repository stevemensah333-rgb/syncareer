import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  studentNavGroups,
  counsellorNavGroups,
  type NavItem,
} from '@/components/layout/AppSidebar';

function flattenNavigation(groups: typeof studentNavGroups): NavItem[] {
  return groups.flatMap((group) => group.items);
}

export function getMobileNavigation(userType?: string | null) {
  return flattenNavigation(
    userType === 'career_counsellor' ? counsellorNavGroups : studentNavGroups,
  );
}

function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNavView({ userType }: { userType?: string | null }) {
  const location = useLocation();
  const tabs = getMobileNavigation(userType);

  return (
    <nav aria-label="Mobile workspace navigation" className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card md:hidden">
      <div className="safe-area-bottom grid h-[3.75rem] grid-cols-4 items-stretch px-1">
        {tabs.map((tab) => {
          const isActive = isRouteActive(location.pathname, tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                isActive ? "bg-secondary text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 bg-primary" />}
              <tab.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="max-w-full truncate text-[10px] font-medium leading-tight">{tab.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileBottomNav() {
  const { profile } = useUserProfile();
  return <MobileBottomNavView userType={profile?.user_type} />;
}
