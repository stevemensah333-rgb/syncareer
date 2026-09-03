import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Ellipsis } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  studentNavGroups,
  counsellorNavGroups,
  isRouteActive,
  type NavGroup,
  type NavItem,
} from '@/components/layout/AppSidebar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/** Bottom bar capacity. Up to four destinations fit as tabs; beyond that the
 *  bar keeps the primary three and moves the rest into the More sheet so the
 *  global pattern stays a single, thumb-reachable bar. */
const MAX_TABS = 4;
const PRIMARY_TABS_WHEN_OVERFLOW = 3;

export function getMobileNavigation(userType?: string | null): NavItem[] {
  return getMobileGroups(userType).flatMap((group) => group.items);
}

function getMobileGroups(userType?: string | null): NavGroup[] {
  return userType === 'career_counsellor' ? counsellorNavGroups : studentNavGroups;
}

function splitMobileGroups(groups: NavGroup[]) {
  const items = groups.flatMap((group) => group.items);
  if (items.length <= MAX_TABS) return { tabs: items, moreGroups: [] as NavGroup[] };
  const primary = new Set(items.slice(0, PRIMARY_TABS_WHEN_OVERFLOW).map((item) => item.href));
  const moreGroups = groups
    .map((group) => ({ ...group, items: group.items.filter((item) => primary.has(item.href) === false) }))
    .filter((group) => group.items.length > 0);
  return { tabs: items.slice(0, PRIMARY_TABS_WHEN_OVERFLOW), moreGroups };
}

function isRouteActiveGroup(pathname: string, groups: NavGroup[]): boolean {
  return groups.some((group) => group.items.some((item) => isRouteActive(pathname, item.href)));
}

export function MobileBottomNavView({ userType }: { userType?: string | null }) {
  const { pathname } = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const groups = getMobileGroups(userType);
  const { tabs, moreGroups } = splitMobileGroups(groups);
  const moreIsActive = isRouteActiveGroup(pathname, moreGroups);

  return (
    <nav
      aria-label="Mobile workspace navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card md:hidden"
    >
      <div className="safe-area-bottom flex h-[3.75rem] items-stretch px-1">
        {tabs.map((tab) => {
          const isActive = isRouteActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              to={tab.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1',
                'transition-colors duration-150 ease-out active:bg-muted motion-reduce:transition-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute inset-x-3 top-0 h-0.5 origin-center bg-primary nav-active-mark',
                  isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-50',
                )}
              />
              <tab.icon aria-hidden="true" className="size-5" />
              <span className="max-w-full truncate text-[10px] font-medium leading-tight">{tab.title}</span>
            </Link>
          );
        })}

        {moreGroups.length > 0 && (
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="More destinations"
                className={cn(
                  'relative flex min-h-11 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1',
                  'transition-colors duration-150 ease-out hover:bg-muted/60 active:bg-muted motion-reduce:transition-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                  moreIsActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {moreIsActive && (
                  <span aria-hidden="true" className="absolute inset-x-3 top-0 h-0.5 bg-primary" />
                )}
                <Ellipsis aria-hidden="true" className="size-5" />
                <span className="max-w-full truncate text-[10px] font-medium leading-tight">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-overlay p-0 sm:p-0">
              <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-muted" aria-hidden="true" />
              <SheetHeader className="p-4 pb-2 text-left">
                <SheetTitle className="text-base">More</SheetTitle>
                <SheetDescription className="sr-only">
                  The remaining destinations in your workspace
                </SheetDescription>
              </SheetHeader>
              <div className="max-h-[60vh] overflow-y-auto p-2 pb-4">
                {moreGroups.map((group) => (
                  <div key={group.label} className="mt-2 first:mt-0">
                    <p className="eyebrow px-3 pb-1 pt-2">{group.label}</p>
                    <ul>
                      {group.items.map((item) => {
                        const isActive = isRouteActive(pathname, item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              to={item.href}
                              aria-current={isActive ? 'page' : undefined}
                              onClick={() => setMoreOpen(false)}
                              className={cn(
                                'flex min-h-11 items-center gap-3 px-3 text-sm',
                                'transition-colors duration-150 ease-out hover:bg-muted/60 active:bg-muted motion-reduce:transition-none',
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                                isActive
                                  ? 'bg-selected font-medium text-selected-foreground'
                                  : 'text-foreground',
                              )}
                            >
                              <item.icon
                                aria-hidden="true"
                                className={cn('size-5', isActive ? 'text-primary' : 'text-muted-foreground')}
                              />
                              {item.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}

export function MobileBottomNav() {
  const { profile } = useUserProfile();
  return <MobileBottomNavView userType={profile?.user_type} />;
}
