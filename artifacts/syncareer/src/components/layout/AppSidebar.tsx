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
  LayoutDashboard,
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

/** Primary student destinations. CV, interview, request history, and settings
 * remain available contextually and through the account menu. */
export const studentNavGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Home', icon: LayoutDashboard, href: '/dashboard' },
      { title: 'Opportunities', icon: BriefcaseBusiness, href: '/opportunities' },
      { title: 'Applications', icon: ClipboardList, href: '/applications' },
      { title: 'Mentors', icon: Users, href: '/mentors' },
    ],
  },
];

export const counsellorNavGroups: NavGroup[] = [
  {
    label: 'Main',
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

export function AppSidebar({ groups, isCollapsed, onToggleCollapsed, currentDossier }: AppSidebarProps) {
  const { pathname } = useLocation();

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground',
        'transition-[width] duration-150 ease-out',
        isCollapsed ? 'w-[68px]' : 'w-64'
      )}
    >
      <div className={cn('flex h-14 items-center border-b border-sidebar-border px-3', isCollapsed && 'justify-center px-2')}>
        <div
          className={cn(
            'flex min-w-0 items-center gap-2 px-1.5 text-sm font-semibold tracking-tight text-sidebar-foreground',
            isCollapsed && 'justify-center px-0'
          )}
        >
          <img src={syncareerLogo} alt="" className="h-7 w-auto shrink-0" />
          {!isCollapsed && <span>Syncareer</span>}
        </div>
      </div>

      <nav aria-label="Workspace navigation" className="flex-1 overflow-y-auto px-3 py-5">
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
                          'relative flex min-h-11 items-center gap-3 border border-transparent px-2.5 text-sm transition-colors duration-150 lg:min-h-10',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-1',
                          isCollapsed && 'justify-center px-0',
                          isActive
                            ? 'border-sidebar-border bg-secondary font-medium text-primary'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        {isActive && (
                          <span
                            aria-hidden="true"
                            className="absolute -left-px top-1/2 h-6 w-0.5 -translate-y-1/2 bg-primary"
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

      {currentDossier && (
        <div className="border-t border-sidebar-border p-3">
          <Link
            to={`/applications?application=${encodeURIComponent(currentDossier.id)}`}
            aria-label={`Current dossier: ${currentDossier.title}`}
            title={isCollapsed ? `Current dossier: ${currentDossier.title}` : undefined}
            className={cn(
              'block min-h-11 border border-sidebar-border bg-secondary/60 text-sidebar-foreground transition-colors duration-150 hover:border-primary/45 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              isCollapsed ? 'flex items-center justify-center p-2' : 'p-3',
            )}
          >
            {isCollapsed ? (
              <FileStack className="h-5 w-5 text-primary" />
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
            'h-11 w-full justify-start gap-3 px-2.5 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground lg:h-10',
            isCollapsed && 'justify-center px-0',
          )}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          {!isCollapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
