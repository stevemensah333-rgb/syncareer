import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import {
  ClipboardList, Sparkles, Settings,
  Calendar, Users, LayoutDashboard, Hammer, Target, Briefcase, MoreHorizontal
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavTab {
  title: string;
  icon: React.ElementType;
  href: string;
}

const studentTabs: NavTab[] = [
  { title: 'Home', icon: LayoutDashboard, href: '/dashboard' },
  { title: 'Build', icon: Hammer, href: '/build' },
  { title: 'Practice', icon: Target, href: '/practice' },
  { title: 'Apply', icon: Briefcase, href: '/apply' },
];

const studentMoreItems: NavTab[] = [
  { title: 'SynAI', icon: Sparkles, href: '/ai-coach' },
  { title: 'Settings', icon: Settings, href: '/settings' },
];

const counsellorTabs: NavTab[] = [
  { title: 'Profile', icon: Users, href: '/counsellor-dashboard' },
  { title: 'Availability', icon: Calendar, href: '/counsellor-availability' },
  { title: 'Sessions', icon: ClipboardList, href: '/counsellor-sessions' },
  { title: 'Settings', icon: Settings, href: '/settings' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const { profile } = useUserProfile();
  const userType = profile?.user_type;

  let tabs: NavTab[];
  let moreItems: NavTab[] | null;

  if (userType === 'career_counsellor') {
    tabs = counsellorTabs;
    moreItems = null; // 4 items, no overflow
  } else {
    tabs = studentTabs;
    moreItems = studentMoreItems;
  }

  const isMoreActive = moreItems?.some(item => location.pathname === item.href) ?? false;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border md:hidden">
      <div className="flex items-center justify-around h-14 px-1 safe-area-bottom">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.href;
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("h-5 w-5", isActive && "text-primary")} />
              <span className="text-[10px] font-medium leading-tight">{tab.title}</span>
            </Link>
          );
        })}

        {moreItems && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 flex-1 py-1 rounded-lg transition-colors",
                  isMoreActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <MoreHorizontal className={cn("h-5 w-5", isMoreActive && "text-primary")} />
                <span className="text-[10px] font-medium leading-tight">More</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-48 mb-2 bg-popover z-50">
              {moreItems.map((item) => {
                const isActive = location.pathname === item.href;
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
