import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { LogOut, MessageSquare, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import syncareerLogo from '@/assets/syncareer-logo.svg';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

const navLinks = [
  { label: 'Feedback', href: '/admin/feedback', icon: MessageSquare },
  { label: 'Users', href: '/admin/users', icon: Users },
];

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = () => {
    sessionStorage.removeItem('syncareer_admin_access');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Admin Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={syncareerLogo} alt="Syncareer" className="h-11 w-auto object-contain" />
              <span className="text-sm font-semibold text-foreground">Syncareer</span>
              <span className="text-muted-foreground mx-1">·</span>
              <span className="text-sm text-muted-foreground">Admin</span>
            </div>
            <nav className="flex items-center gap-1 ml-2">
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
      <main className="container mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold text-foreground mb-6">{title}</h1>
        {children}
      </main>
    </div>
  );
}
