import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Hammer, Target, Briefcase, User } from 'lucide-react';

/**
 * Mobile bottom navigation for student dashboard
 * Only visible on mobile devices
 */
export const MobileBottomNav: React.FC = () => {
  const { pathname } = useLocation();

  const navItems = [
    { label: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Build', href: '/build', icon: Hammer },
    { label: 'Practice', href: '/practice', icon: Target },
    { label: 'Apply', href: '/apply', icon: Briefcase },
    { label: 'Profile', href: '/settings', icon: User },
  ];

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-background border-t border-border z-40">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                active
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-foreground/60 hover:text-foreground'
              }`}
              title={item.label}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
