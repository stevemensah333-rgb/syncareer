import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { MoreHorizontal } from 'lucide-react';
import {
  studentNavGroups,
  counsellorNavGroups,
  type NavItem,
} from '@/components/layout/AppSidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function flattenNavigation(groups: typeof studentNavGroups): NavItem[] {
  return groups.flatMap((group) => group.items);
}

export function getMobileNavigation(userType?: string | null) {
  const items = flattenNavigation(
    userType === 'career_counsellor' ? counsellorNavGroups : studentNavGroups,
  );
  return { tabs: items.slice(0, 3), moreItems: items.slice(3) };
}

function isRouteActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileBottomNav() {
  const location = useLocation();
  const { profile } = useUserProfile();
  const userType = profile?.user_type;

  const { tabs, moreItems } = getMobileNavigation(userType);
  const isMoreActive = moreItems.some((item) => isRouteActive(location.pathname, item.href));

  return (
    <nav aria-label="Mobile workspace navigation" className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-sm md:hidden">
      <div className="safe-area-bottom flex h-[3.75rem] items-center justify-around px-1">
        {tabs.map((tab) => {
          const isActive = isRouteActive(location.pathname, tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="max-w-full truncate text-[10px] font-medium leading-tight">{tab.title}</span>
            </Link>
          );
        })}

        {moreItems.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="More navigation"
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                  isMoreActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "text-primary")} />
                <span className="text-[10px] font-medium leading-tight">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-2 bg-popover z-50">
              {moreItems.map((item) => {
                const isActive = isRouteActive(location.pathname, item.href);
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        isActive && "text-primary font-medium"
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  );
}
