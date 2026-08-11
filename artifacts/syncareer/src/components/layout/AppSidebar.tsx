import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import syncareerLogo from '@/assets/syncareer-logo.svg';
import {
  LayoutDashboard, Briefcase, ClipboardList, Target,
  FileText, Mic, Settings,
  Users, Calendar, UserCheck, ChevronRight, ChevronLeft,
} from 'lucide-react';

export interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AppSidebarProps {
  groups: NavGroup[];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

/** Student destinations — one source of truth for desktop and mobile
 *  navigation. Deep routes for `/build`, `/apply`,
 *  and `/analysis` remain live; they are reached from here or via their hubs. */
export const studentNavGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { title: 'Home', icon: LayoutDashboard, href: '/dashboard' },
      { title: 'Opportunities', icon: Briefcase, href: '/opportunities' },
      { title: 'Applications', icon: ClipboardList, href: '/applications' },
      { title: 'Practice', icon: Target, href: '/practice' },
    ],
  },
  {
    label: 'Workspace',
    items: [
      { title: 'CV Builder', icon: FileText, href: '/cv-builder' },
      { title: 'Interview Simulator', icon: Mic, href: '/interview-simulator' },
    ],
  },
  {
    label: 'Account',
    items: [
      { title: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
];

export const counsellorNavGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { title: 'My Profile', icon: Users, href: '/counsellor-dashboard' },
      { title: 'Availability', icon: Calendar, href: '/counsellor-availability' },
    ],
  },
  {
    label: 'Schedule',
    items: [
      { title: 'Sessions', icon: ClipboardList, href: '/counsellor-sessions' },
      { title: 'My Clients', icon: UserCheck, href: '/counsellor-clients' },
    ],
  },
  {
    label: 'Account',
    items: [
      { title: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
];

/** True when the current path is the destination or within its subtree. Root
 *  is never a prefix match so `/` does not light up every route. */
function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ groups, isCollapsed, onToggleCollapsed }: AppSidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        'transition-[width] duration-150 ease-out',
        isCollapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-2.5">
        <div
          className={cn(
            'flex min-w-0 items-center gap-2 px-1.5 text-sm font-semibold tracking-tight text-sidebar-foreground',
            isCollapsed && 'sr-only'
          )}
        >
          <img src={syncareerLogo} alt="" className="h-7 w-auto shrink-0" />
          <span>Syncareer</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          className="h-9 w-9 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-6">
          {groups.map((group) => (
            <li key={group.label}>
              {!isCollapsed && (
                <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = isRouteActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        to={item.href}
                        aria-current={isActive ? 'page' : undefined}
                        title={isCollapsed ? item.title : undefined}
                        className={cn(
                          'relative flex min-h-9 items-center gap-3 rounded-lg px-2.5 text-sm transition-colors duration-150',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1',
                          isCollapsed && 'justify-center px-0',
                          isActive
                            ? 'bg-primary/10 font-medium text-primary'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary"
                          />
                        )}
                        <item.icon
                          className={cn(
                            'h-5 w-5 shrink-0',
                            isActive ? 'text-primary' : 'text-sidebar-foreground/70'
                          )}
                        />
                        <span
                          className={cn(
                            'truncate transition-[opacity,width] duration-150',
                            isCollapsed && 'w-0 opacity-0'
                          )}
                        >
                          {item.title}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
