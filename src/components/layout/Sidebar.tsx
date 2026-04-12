
import React, { useEffect, useState } from 'react';
import { 
  Users, Briefcase, GraduationCap, 
  BarChart, Settings, ChevronRight, ChevronLeft, Sparkles,
  Building2, TrendingUp, FileText, UserPlus, Star, Calendar,
  ClipboardList, Mic, MessageSquare, LineChart
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link, useLocation } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  className?: string;
}

interface NavItem {
  title: string;
  icon: React.ElementType;
  href: string;
}

export function Sidebar({ isCollapsed, onToggle, className }: SidebarProps) {
  const location = useLocation();
  const { profile } = useUserProfile();
  const [isAdmin, setIsAdmin] = useState(false);
  
  const isEmployer = profile?.user_type === 'employer';
  const isCounsellor = profile?.user_type === 'career_counsellor';

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .eq('role', 'admin')
        .limit(1);
      setIsAdmin(!!data && data.length > 0);
    };
    checkAdmin();
  }, []);
  
  // Navigation items for job seekers (students, professionals)
  const jobSeekerNavItems: NavItem[] = [
    {
      title: 'Assessment',
      icon: ClipboardList,
      href: '/assessment',
    },
    {
      title: 'Learn',
      icon: GraduationCap,
      href: '/learn',
    },
    {
      title: 'Opportunities',
      icon: TrendingUp,
      href: '/opportunities',
    },
    {
      title: 'Portfolio',
      icon: Star,
      href: '/portfolio',
    },
    {
      title: 'CV Builder',
      icon: FileText,
      href: '/cv-builder',
    },
    {
      title: 'Applications',
      icon: ClipboardList,
      href: '/applications',
    },
    {
      title: 'Interview Prep',
      icon: Mic,
      href: '/interview-simulator',
    },
    {
      title: 'Market Analysis',
      icon: LineChart,
      href: '/analysis',
    },
    {
      title: 'SynAI',
      icon: Sparkles,
      href: '/ai-coach',
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/settings',
    }
  ];

  // Navigation items for employers
  const employerNavItems: NavItem[] = [
    {
      title: 'My Company',
      icon: Building2,
      href: '/my-company',
    },
    {
      title: 'Post a Job',
      icon: FileText,
      href: '/post-job',
    },
    {
      title: 'Applicants',
      icon: Users,
      href: '/applicants',
    },
    {
      title: 'Hire with AI',
      icon: UserPlus,
      href: '/hire-ai',
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/settings',
    }
  ];

  // Navigation items for counsellors
  const counsellorNavItems: NavItem[] = [
    {
      title: 'My Portfolio',
      icon: Users,
      href: '/counsellor-dashboard',
    },
    {
      title: 'Availability',
      icon: Calendar,
      href: '/counsellor-availability',
    },
    {
      title: 'Sessions',
      icon: ClipboardList,
      href: '/counsellor-sessions',
    },
    {
      title: 'Settings',
      icon: Settings,
      href: '/settings',
    }
  ];

  const getNavItems = () => {
    if (isEmployer) return employerNavItems;
    if (isCounsellor) return counsellorNavItems;
    return jobSeekerNavItems;
  };

  const navItems = getNavItems();


  const adminNavItems: NavItem[] = isAdmin ? [
    { title: 'Feedback', icon: MessageSquare, href: '/admin/feedback' },
  ] : [];

  // Group navigation items by section
  const getGroupedNavItems = () => {
    const groups = [];
    if (isEmployer) {
      groups.push(
        { label: 'Main', items: employerNavItems.slice(0, 4) },
        { label: 'Tools', items: employerNavItems.slice(4, 7) },
        { label: 'Account', items: employerNavItems.slice(7) },
      );
    } else if (isCounsellor) {
      groups.push(
        { label: 'Main', items: counsellorNavItems.slice(0, 2) },
        { label: 'Schedule', items: counsellorNavItems.slice(2, 3) },
        { label: 'Account', items: counsellorNavItems.slice(3) },
      );
    } else {
      groups.push(
        { label: 'Main', items: jobSeekerNavItems.slice(0, 4) },
        { label: 'Growth', items: jobSeekerNavItems.slice(4, 9) },
        { label: 'Account', items: jobSeekerNavItems.slice(9) },
      );
    }
    if (adminNavItems.length > 0) {
      groups.push({ label: 'Admin', items: adminNavItems });
    }
    return groups;
  };

  const groupedNav = getGroupedNavItems();

  return (
    <aside className={cn(
      "bg-sidebar text-sidebar-foreground relative transition-all duration-300 ease-in-out flex flex-col border-r border-sidebar-border",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="flex h-16 items-center justify-center border-b border-sidebar-border">
        <h2 className={cn(
          "font-semibold tracking-tight transition-opacity duration-200 text-sidebar-foreground",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}>
          Syncareer
        </h2>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className={cn(
            "absolute right-2 text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8",
            isCollapsed ? "right-2" : "right-4"
          )}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <ScrollArea className="flex-1 py-4">
        <nav className="grid gap-6 px-2">
          {groupedNav.map((group, groupIndex) => (
            <div key={groupIndex}>
              {!isCollapsed && (
                <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              <div className="grid gap-1">
                {group.items.map((item, index) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={index}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent",
                        isActive ? "bg-sidebar-accent text-primary font-medium" : "text-sidebar-foreground",
                        isCollapsed && "justify-center px-0"
                      )}
                    >
                      <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                      <span className={cn(
                        "text-sm transition-opacity duration-200",
                        isCollapsed ? "opacity-0 w-0" : "opacity-100"
                      )}>
                        {item.title}
                      </span>
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
}
