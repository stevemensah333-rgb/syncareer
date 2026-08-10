

import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users, LogOut, MessageCircle, HelpCircle, Phone, Mail, CreditCard, Sparkles, Shield } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';
import syncareerLogo from '@/assets/syncareer-logo.svg';

import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

// The AskCounsellorDialog pulls in react-day-picker + date-fns v4 (~300 kB
// combined). Lazy-load it so the calendar/date-picker code is only fetched
// the first time the user opens (or hovers) the "Ask a Counsellor" CTA.
const AskCounsellorDialog = lazy(() => import('@/components/counsellor/AskCounsellorDialog'));

function preloadAskCounsellor() {
  // Vite dedupes this with the lazy() importer; multiple calls are cheap.
  void import('@/components/counsellor/AskCounsellorDialog');
}

interface NavbarProps {
  className?: string;
  onMobileMenuClick?: () => void;
}

export function Navbar({ className }: NavbarProps) {
  const [askCounsellorOpen, setAskCounsellorOpen] = useState(false);

  const openAskCounsellor = useCallback(() => {
    // Start preloading the moment the user opens the dialog so the lazy
    // chunk starts fetching immediately in parallel with state commit.
    preloadAskCounsellor();
    setAskCounsellorOpen(true);
  }, []);

  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { isPremium, loading: subLoading } = useSubscription();
  
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

  return (
    <>
      <header className={cn("bg-background/95 backdrop-blur-sm fixed top-0 left-0 right-0 z-30 border-b", className)}>
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-2 lg:gap-6">
            
            <div className="flex items-center gap-2">
              <img src={syncareerLogo} alt="Syncareer logo" className="h-8 w-auto object-contain" />
              <span className="text-base font-semibold tracking-tight lg:text-lg">Syncareer</span>
            </div>
            

            <div className="hidden lg:flex items-center gap-2">
              {isCounsellor ? (
                // Counsellors see their role indicator
                <Button
                  variant="ghost"
                  className="text-sm"
                >
                  <Users className="h-4 w-4 mr-1" />
                  Counsellor Portal
                </Button>
              ) : (
                // Job seekers see both buttons
                <>
                  <Button
                    variant="ghost"
                    className="text-sm"
                  >
                    <Users className="h-4 w-4 mr-1" />
                    For Job Seekers
                  </Button>
                  
                  <Button
                    variant="ghost"
                    className="text-sm"
                    onMouseEnter={preloadAskCounsellor}
                    onFocus={preloadAskCounsellor}
                    onClick={openAskCounsellor}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Ask a Counsellor
                  </Button>
                </>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">

            {/* Pricing link — students only */}
            {!isCounsellor && (
              <Button
                variant="ghost"
                className="text-sm hidden sm:flex"
                onClick={() => navigate('/pricing')}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Pricing
              </Button>
            )}

            {/* Mobile Ask Counsellor Button - Only for students */}
            {!isCounsellor && (
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-9 w-9"
                onMouseEnter={preloadAskCounsellor}
                onFocus={preloadAskCounsellor}
                onClick={openAskCounsellor}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            )}

            <NotificationsDropdown />

            {/* Plan badge — students only */}
            {!isCounsellor && !subLoading && (
              isPremium ? (
                <Badge variant="outline" className="hidden sm:flex items-center gap-1 border-primary/40 text-primary text-xs px-2 py-0.5">
                  <Sparkles className="h-3 w-3" />
                  Premium
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="hidden sm:flex items-center gap-1 border-border text-muted-foreground text-xs px-2 py-0.5 cursor-pointer hover:border-primary/40 hover:text-primary transition-colors"
                  onClick={() => navigate('/pricing')}
                >
                  Free
                </Badge>
              )
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 transition-transform duration-200 hover:scale-105 cursor-pointer">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/settings?tab=profile')} className="cursor-pointer">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                {!isCounsellor && (
                  <DropdownMenuItem onClick={() => navigate('/settings?tab=subscription')} className="cursor-pointer">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Subscription
                  </DropdownMenuItem>
                )}
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

      {/* Ask a Counsellor Dialog — lazily loaded; render nothing until the chunk arrives. */}
      {askCounsellorOpen && (
        <Suspense fallback={null}>
          <AskCounsellorDialog open={askCounsellorOpen} onOpenChange={setAskCounsellorOpen} />
        </Suspense>
      )}
    </>
  );
}
