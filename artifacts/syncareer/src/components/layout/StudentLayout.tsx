import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Star, GraduationCap, TrendingUp, Settings, 
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
      isCollapsed ? "w-16" : "w-60"
    )}>
      <div className="flex h-14 items-center justify-between px-3 border-b border-sidebar-border">
        <h2 className={cn(
          "font-semibold text-sm tracking-tight transition-all duration-200 text-sidebar-foreground",
          isCollapsed ? "opacity-0 w-0" : "opacity-100 pl-1"
        )}>Syncareer</h2>
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(p => !p)}
          className="text-sidebar-foreground hover:bg-sidebar-accent h-7 w-7">
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <ScrollArea className="flex-1 py-3">
        <nav className="grid gap-5 px-2">
          {studentNavItems.map((group, gi) => (
            <div key={gi}>
              {!isCollapsed && (
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              <div className="grid gap-0.5">
                {group.items.map((item, i) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link key={i} to={item.href} className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all",
                      isActive 
                        ? "bg-primary/10 text-primary font-medium" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent",
                      isCollapsed && "justify-center px-0"
                    )}>
                      <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-primary")} />
                      <span className={cn("transition-all duration-200", isCollapsed ? "opacity-0 w-0" : "opacity-100")}>{item.title}</span>
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
    <div className="min-h-screen flex flex-col bg-background">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-primary focus:text-primary-foreground">Skip to main content</a>
      <Navbar onMobileMenuClick={() => {}} />
      <div className="flex-1 flex pt-16">
        {!isMobile && (
          <div className={cn("fixed top-16 left-0 bottom-0 z-20 transition-all duration-300", isCollapsed ? "w-16" : "w-60")}>
            {sidebarContent}
          </div>
        )}
        <main id="main-content" className={cn("flex-1 transition-all duration-300", !isMobile && (isCollapsed ? "ml-16" : "ml-60"), isMobile && "pb-16")}>
          {title && (
            <div className="bg-landing-cream/60 border-b border-border/40">
              <div className="max-w-[1200px] mx-auto px-4 lg:px-6 py-8">
                <h1 className="font-serif text-3xl md:text-4xl font-normal tracking-[-0.02em] text-foreground">
                  {title}
                </h1>
              </div>
            </div>
          )}
          <div className="max-w-[1200px] mx-auto p-4 lg:p-6">
            {children}
          </div>
        </main>
      </div>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
