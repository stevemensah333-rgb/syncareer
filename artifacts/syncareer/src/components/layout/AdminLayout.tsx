import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, MessageSquare, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/layout/PageHeader';
import syncareerLogo from '@/assets/syncareer-logo.svg';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const navLinks = [
  { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Mentors', href: '/admin/mentors', icon: ShieldCheck },
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    sessionStorage.removeItem('syncareer_admin_access');
    navigate('/', { replace: true });
  };

  return (
    <div className="app-canvas min-h-screen bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to main content
      </a>
      {/* Admin Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={syncareerLogo} alt="Syncareer logo" className="h-12 w-auto object-contain" />
              <span className="text-sm font-semibold text-foreground">Syncareer</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-sm text-muted-foreground">Admin</span>
            </div>
            <nav aria-label="Admin navigation" className="flex items-center gap-1 ml-2">
              {navLinks.map(({ label, href, icon: Icon }) => (
                <Link
                  key={href}
                  to={href}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors',
                    location.pathname === href
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Page Content */}
      <main id="main-content" tabIndex={-1} className="focus:outline-none">
        <PageHeader title={title} />
        <div className="mx-auto w-full max-w-[1400px] px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
