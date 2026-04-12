import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Star, GraduationCap, TrendingUp, BarChart, Settings, 
  ChevronRight, ChevronLeft, Sparkles, FileText, ClipboardList, Mic, LayoutDashboard
} from 'lucide-react';

interface StudentLayoutProps {
  children: React.ReactNode;
  title: string;
}

const studentNavItems = [
  { label: 'Main', items: [
    { title: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' },
    { title: 'Assessment', icon: ClipboardList, href: '/assessment' },
    { title: 'Learn', icon: GraduationCap, href: '/learn' },
    { title: 'Opportunities', icon: TrendingUp, href: '/opportunities' },
  ]},
  { label: 'Growth', items: [
    { title: 'Portfolio', icon: Star, href: '/portfolio' },
    { title: 'CV Builder', icon: FileText, href: '/cv-builder' },
    { title: 'Applications', icon: ClipboardList, href: '/applications' },
    { title: 'Interview Prep', icon: Mic, href: '/interview-simulator' },
    
  ]},
  { label: 'Account', items: [
    { title: 'SynAI', icon: Sparkles, href: '/ai-coach' },
    { title: 'Settings', icon: Settings, href: '/settings' },
  ]},
];

export function StudentLayout({ children, title }: StudentLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const location = useLocation();

  const sidebarContent = (
    <aside className={cn(
      "bg-sidebar text-sidebar-foreground relative transition-all duration-300 ease-in-out flex flex-col border-r border-sidebar-border h-full",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border">
        <h2 className={cn(
          "font-semibold tracking-tight transition-opacity duration-200 text-sidebar-foreground",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}>Syncareer</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(p => !p)}
          className={cn("absolute right-2 text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8", isCollapsed ? "right-2" : "right-4")}>
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-6 px-2">
          {studentNavItems.map((group, gi) => (
            <div key={gi}>
              {!isCollapsed && <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">{group.label}</p>}
              <div className="grid gap-1">
                {group.items.map((item, i) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link key={i} to={item.href} className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent",
                      isActive ? "bg-sidebar-accent text-primary font-medium" : "text-sidebar-foreground",
                      isCollapsed && "justify-center px-0"
                    )}>
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                      <span className={cn("text-sm transition-opacity duration-200", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">Skip to main content</a>
      <Navbar onMobileMenuClick={() => {}} />
      <div className="flex-1 flex pt-16">
        {!isMobile && (
          <div className={cn("fixed top-16 left-0 bottom-0 z-20 transition-all duration-300", isCollapsed ? "w-16" : "w-64")}>
            {sidebarContent}
          </div>
        )}
        <main id="main-content" className={cn("flex-1 transition-all duration-300", !isMobile && (isCollapsed ? "ml-16" : "ml-64"), isMobile && "pb-16")}>
          <div className="container max-w-full p-4 lg:p-6 animate-fade-in">
            <h1 className="text-2xl font-bold mb-6">{title}</h1>
            {children}
          </div>
        </main>
      </div>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
