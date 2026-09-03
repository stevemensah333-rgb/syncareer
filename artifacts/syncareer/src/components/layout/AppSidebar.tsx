import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import syncareerLogo from '@/assets/syncareer-logo.svg';
import {
  BriefcaseBusiness,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileStack,
  FileText,
  LayoutDashboard,
  Mic,
  Settings,
  Users,
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
  currentDossier?: CurrentDossierLink | null;
}

export interface CurrentDossierLink {
  id: string;
  title: string;
  company: string | null;
  statusLabel: string;
}

/** Conceptual map of the student workspace. Every href must be a real route;
 *  contextual destinations (assessment, analysis, requests, settings) stay in
 *  their workflows and the account menu. */
export const studentNavGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Home', icon: LayoutDashboard, href: '/dashboard' },
      { title: 'Opportunities', icon: BriefcaseBusiness, href: '/opportunities' },
      { title: 'Applications', icon: ClipboardList, href: '/applications' },
    ],
  },
  {
    label: 'Build',
    items: [{ title: 'CV Builder', icon: FileText, href: '/cv-builder' }],
  },
  {
    label: 'Practice',
    items: [{ title: 'Interview', icon: Mic, href: '/interview-simulator' }],
  },
  {
    label: 'Connect',
    items: [{ title: 'Mentors', icon: Users, href: '/mentors' }],
  },
];

export const counsellorNavGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Profile', icon: Users, href: '/mentor/profile' },
      { title: 'Requests', icon: ClipboardList, href: '/mentorship/requests' },
      { title: 'Availability', icon: Calendar, href: '/mentor/availability' },
      { title: 'Settings', icon: Settings, href: '/settings' },
    ],
  },
];

/** True when the current path is the destination or within its subtree. Root
 *  is never a prefix match so `/` does not light up every route. */
export function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export interface NavContext {
  group: string;
  item: NavItem;
}

/** Resolves the navigation group + destination that owns the current path, so
 *  the top bar can state the user's context even on sub-routes. */
export function findNavContext(pathname: string, groups: NavGroup[]): NavContext | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (isRouteActive(pathname, item.href)) return { group: group.label, item };
    }
  }
  return null;
}

export function AppSidebar({ groups, isCollapsed, onToggleCollapsed, currentDossier }: AppSidebarProps) {
  const { pathname } = useLocation();
  const activeContext = findNavContext(pathname, groups);

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        'transition-[width] duration-150 ease-out motion-reduce:transition-none',
        isCollapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-sidebar-border px-4',
          isCollapsed && 'justify-center px-2',
        )}
      >
        <Link
          to="/dashboard"
          className={cn(
            'flex min-w-0 items-center gap-2 rounded-control px-1.5 py-1 text-sm font-semibold tracking-tight text-sidebar-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background',
            isCollapsed ? 'hover:bg-sidebar-accent' : 'hover:text-primary',
          )}
          aria-label="Syncareer home"
        >
          <img src={syncareerLogo} alt="" className="h-7 w-auto shrink-0" />
          <span
            className={cn(
              'truncate transition-[opacity,width] duration-150 motion-reduce:transition-none',
              isCollapsed && 'w-0 opacity-0',
            )}
          >
            Syncareer
          </span>
        </Link>
      </div>

      <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-3 py-5">
        <ul className="space-y-5">
          {groups.map((group) => {
            const groupIsActive = activeContext?.group === group.label;
            return (
              <li key={group.label}>
                <p
                  className={cn(
                    'eyebrow mb-2 px-3 transition-colors duration-150',
                    groupIsActive ? 'text-primary' : 'text-muted-foreground',
                    isCollapsed && 'sr-only',
                  )}
                >
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeContext?.item.href === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          to={item.href}
                          aria-current={isActive ? 'page' : undefined}
                          title={isCollapsed ? item.title : undefined}
                          className={cn(
                            'relative flex min-h-11 items-center gap-3 px-3 text-sm',
                            'transition-colors duration-150 ease-out lg:min-h-10',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background',
                            isCollapsed && 'justify-center px-0',
                            isActive
                              ? 'bg-selected font-medium text-selected-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent',
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 bg-primary',
                              'transition-opacity duration-150 ease-out motion-reduce:transition-none',
                              isActive ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <item.icon
                            aria-hidden="true"
                            className={cn(
                              'size-5 shrink-0 transition-colors duration-150',
                              isActive ? 'text-primary' : 'text-sidebar-foreground/70',
                            )}
                          />
                          <span
                            className={cn(
                              'truncate transition-[opacity,width] duration-150 ease-out motion-reduce:transition-none',
                              isCollapsed && 'w-0 opacity-0',
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
            );
          })}
        </ul>
      </nav>

      {currentDossier && (
        <div className="border-t border-sidebar-border p-3">
          <Link
            to={`/applications/${encodeURIComponent(currentDossier.id)}`}
            aria-label={`Current dossier: ${currentDossier.title}`}
            title={isCollapsed ? `Current dossier: ${currentDossier.title}` : undefined}
            className={cn(
              'block min-h-11 border border-sidebar-border bg-card p-3 text-sidebar-foreground',
              'transition-colors duration-150 ease-out hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-background',
              isCollapsed ? 'flex items-center justify-center p-2' : '',
            )}
          >
            {isCollapsed ? (
              <FileStack aria-hidden="true" className="size-5 text-primary" />
            ) : (
              <>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Current dossier</span>
                <span className="mt-1.5 block truncate text-sm font-semibold">{currentDossier.title}</span>
                <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                  {[currentDossier.company, currentDossier.statusLabel].filter(Boolean).join(' · ')}
                </span>
              </>
            )}
          </Link>
        </div>
      )}

      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!isCollapsed}
          className={cn(
            'h-11 w-full justify-start gap-3 rounded-control px-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground active:bg-sidebar-accent lg:h-10',
            isCollapsed && 'justify-center px-0',
          )}
        >
          {isCollapsed ? (
            <ChevronRight aria-hidden="true" className="size-4" />
          ) : (
            <ChevronLeft aria-hidden="true" className="size-4" />
          )}
          {!isCollapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
