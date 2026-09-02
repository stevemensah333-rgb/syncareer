import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, CreditCard, HelpCircle, LogOut, Mail, Phone, Settings, Shield, User } from 'lucide-react';
import syncareerLogo from '@/assets/syncareer-logo.svg';

import { cn } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/lib/auth';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { NotificationsDropdown } from '@/components/notifications/NotificationsDropdown';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  
  const supabaseUserId = useSupabaseUserId();
  const { signOut } = useAuth();

  const isCounsellor = profile?.user_type === 'career_counsellor';
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!supabaseUserId) return;
    const checkAdmin = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', supabaseUserId)
        .eq('role', 'admin')
        .maybeSingle();
      setIsAdmin(!!data);
    };
    checkAdmin();
  }, [supabaseUserId]);

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: '/' });
      toast.success('Signed out successfully');
    } catch {
      toast.error('Error signing out');
    }
  };

  const initials = profile?.full_name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || null;

  return (
    <>
      <header className={cn("fixed left-0 right-0 top-0 z-30 h-14 border-b bg-card transition-[left] duration-150 ease-out motion-reduce:transition-none", className)}>
        <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <img src={syncareerLogo} alt="" className="h-7 w-auto object-contain" />
            <span className="text-sm font-semibold tracking-tight">Syncareer</span>
          </div>
          <div className="hidden md:block" aria-hidden="true" />
          
          <div className="flex items-center gap-1.5">
            <NotificationsDropdown />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Open account menu"
                  className="flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-9 md:w-9"
                >
                <Avatar className="h-9 w-9 cursor-pointer border transition-colors duration-150 hover:border-primary/50">
                  <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {initials || <User className="h-5 w-5" />}
                  </AvatarFallback>
                </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                <DropdownMenuLabel className="space-y-0.5">
                  <span className="block truncate">{profile?.full_name || 'My account'}</span>
                  <span className="block text-[11px] font-normal text-muted-foreground">{isCounsellor ? 'Career mentor' : 'Student'}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')} className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {!isCounsellor && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/mentorship/requests')} className="cursor-pointer">
                      <BellRing className="h-4 w-4 mr-2" />
                      Mentor requests
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/settings?tab=subscription')} className="cursor-pointer">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Subscription
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate('/settings')} className="cursor-pointer">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/admin/feedback')} className="cursor-pointer">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="cursor-pointer">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="bg-popover z-50">
                    <div className="px-3 py-2 space-y-2">
                      <a 
                        href="tel:+233555156128" 
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        +233 555 156 128
                      </a>
                      <a 
                        href="mailto:syncareer01@gmail.com" 
                        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        syncareer01@gmail.com
                      </a>
                    </div>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

    </>
  );
}
