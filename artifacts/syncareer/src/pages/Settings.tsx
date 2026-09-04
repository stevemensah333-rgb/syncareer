import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { NotificationSettingsPanel } from '@/components/notifications/NotificationSettingsPanel';
import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  Globe,
  Lock,
  User,
  Settings as SettingsIcon,
  UserCircle,
  AlertTriangle,
  Check,
} from 'lucide-react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { languages } from '@/utils/languages';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { SecuritySection } from '@/components/settings/SecuritySection';
import AnimatedSection from '@/components/landing/AnimatedSection';
import { applyDisplayPreferences, readDisplayPreferences } from '@/lib/displayPreferences';

type SettingsSection = 'profile' | 'account' | 'notifications' | 'security' | 'regional' | 'preferences';

interface NavSectionItem {
  id: SettingsSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// All IANA timezones grouped for display
const ALL_TIMEZONES: string[] = (Intl as any).supportedValuesOf ? (Intl as any).supportedValuesOf('timeZone') : [
  'Africa/Johannesburg','Africa/Lagos','Africa/Nairobi','Africa/Cairo','Africa/Accra',
  'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Sao_Paulo','America/Toronto','America/Mexico_City',
  'Europe/London','Europe/Paris','Europe/Berlin','Europe/Moscow','Europe/Istanbul',
  'Asia/Dubai','Asia/Kolkata','Asia/Singapore','Asia/Tokyo','Asia/Shanghai','Asia/Hong_Kong','Asia/Seoul',
  'Australia/Sydney','Australia/Melbourne','Pacific/Auckland','UTC',
];

const detectUserLocale = async () => {
  // Detect timezone from browser
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Detect country via a free geo-ip API (no key needed)
  let countryName = '';
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    countryName = data.country_name || '';
  } catch {
    // fallback: derive rough country from timezone
    const tzParts = tz.split('/');
    countryName = tzParts[tzParts.length - 1]?.replace(/_/g, ' ') || '';
  }
  return { timezone: tz, countryName };
};

const Settings = () => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { userId, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const SETTINGS_SECTIONS: SettingsSection[] = ['profile', 'account', 'notifications', 'security', 'regional', 'preferences'];
  const requestedTab = searchParams.get('tab') as SettingsSection | null;
  // Guard stale/unknown deep links (e.g. legacy ?tab=subscription) to 'account'.
  const initialTab: SettingsSection = requestedTab && SETTINGS_SECTIONS.includes(requestedTab) ? requestedTab : 'account';
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialTab);
  const { profile, studentDetails, loading: profileLoading } = useUserProfile();
  const [userEmail, setUserEmail] = useState<string>('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const initialDisplayPreferences = React.useMemo(() => readDisplayPreferences(), []);
  const [isDarkMode, setIsDarkMode] = useState(initialDisplayPreferences.dark);
  const [isCompactView, setIsCompactView] = useState(initialDisplayPreferences.compact);
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [selectedCountry, setSelectedCountry] = useState(() => localStorage.getItem('userCountry') || '');
  const [selectedTimezone, setSelectedTimezone] = useState(() => localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Sync tab with URL search parameter
  const handleTabChange = (section: SettingsSection) => {
    setActiveSection(section);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', section);
      return next;
    }, { replace: true });
  };

  const navItems: NavSectionItem[] = [
    { id: 'profile', label: 'Profile', icon: UserCircle },
    { id: 'account', label: t('settings.account'), icon: User },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'security', label: t('settings.security'), icon: Lock },
    { id: 'regional', label: t('settings.regional'), icon: Globe },
    { id: 'preferences', label: t('settings.preferences'), icon: SettingsIcon },
  ];

  // Fetch user email + auto-detect locale on first load
  useEffect(() => {
    const fetchUserData = async () => {
      if (userId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserEmail(session.user.email || '');
        }
      }
    };
    fetchUserData();

    // Auto-detect country & timezone if not already saved
    const savedCountry = localStorage.getItem('userCountry');
    const savedTz = localStorage.getItem('userTimezone');
    if (!savedCountry || !savedTz) {
      detectUserLocale().then(({ timezone, countryName }) => {
        if (!savedTz) {
          setSelectedTimezone(timezone);
          localStorage.setItem('userTimezone', timezone);
        }
        if (!savedCountry && countryName) {
          setSelectedCountry(countryName);
          localStorage.setItem('userCountry', countryName);
        }
      });
    }
  }, [userId]);

  const getUserTypeLabel = (userType: string | null) => {
    switch (userType) {
      case 'student': return 'Student';
      case 'career_counsellor': return 'Career Mentor';
      default: return 'User';
    }
  };

  useEffect(() => {
    applyDisplayPreferences({ dark: isDarkMode, compact: isCompactView });
  }, [isDarkMode, isCompactView]);

  const handleSave = () => {
    if (selectedLanguage !== i18n.language) {
      i18n.changeLanguage(selectedLanguage);
      localStorage.setItem('i18nextLng', selectedLanguage);
    }
    localStorage.setItem('userCountry', selectedCountry);
    localStorage.setItem('userTimezone', selectedTimezone);
    toast({
      title: t('settings.settingsSaved'),
      description: t('settings.settingsSavedDesc'),
    });
  };

  const resetRegionalSettings = () => {
    setSelectedLanguage(i18n.language);
    setSelectedCountry(localStorage.getItem('userCountry') || '');
    setSelectedTimezone(localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone);
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      if (!userId) return;

      const response = await supabase.functions.invoke('delete-account');
      
      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete account');
      }

      await signOut({ redirectUrl: '/' });
      toast({
        title: 'Account deleted',
        description: 'Your account has been permanently deleted.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingAccount(false);
    }
  };

  const initials = profile?.full_name
    ? profile.full_name
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <PageLayout title={t('settings.title')}>
      <div className="space-y-4">
        {/* Mobile: Deliberate Horizontal Tab Navigation Strip */}
        <div className="block lg:hidden">
          <nav
            aria-label="Settings sections"
            className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-none"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeSection === item.id;
              return (
                <Button
                  key={item.id}
                  variant={isSelected ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={isSelected}
                  onClick={() => handleTabChange(item.id)}
                  className={`h-8 rounded-control text-xs shrink-0 gap-1.5 ${isSelected ? 'font-semibold' : ''}`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {item.label}
                </Button>
              );
            })}
          </nav>
        </div>

        {/* Two-Region Layout on Desktop */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Desktop Left Region: Account Summary & Section Nav */}
          <AnimatedSection y={15} className="hidden lg:block lg:col-span-4">
            <div className="surface-content p-4 space-y-4">
              {/* User Identity Preview */}
              <div className="flex items-center gap-3 border-b border-border/70 pb-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {profile?.full_name || 'My Account'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{userEmail || 'Signed in'}</p>
                </div>
                <Badge variant="soft-neutral" className="shrink-0 text-[10px] capitalize">
                  {getUserTypeLabel(profile?.user_type ?? null)}
                </Badge>
              </div>

              {/* Vertical Nav List */}
              <nav aria-label="Settings navigation" className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isSelected = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => handleTabChange(item.id)}
                      className={`flex w-full items-center gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        isSelected
                          ? 'bg-secondary text-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                      <span>{item.label}</span>
                      {isSelected && <Check className="ml-auto h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                    </button>
                  );
                })}
              </nav>
            </div>
          </AnimatedSection>
          
          {/* Right Region: Active Settings Surface */}
          <AnimatedSection delay={0.05} y={15} className="lg:col-span-8">
            <div className="surface-content p-5 sm:p-6">
              {activeSection === 'profile' && <ProfileSection />}

              {activeSection === 'account' && (
                <>
                  <h2 className="text-xl font-semibold mb-6">{t('settings.accountSettings')}</h2>
                  {profileLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">{t('settings.personalInfo')}</h3>
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="settings-full-name" className="block text-sm font-medium mb-1">{t('settings.fullName')}</label>
                            <input
                              id="settings-full-name"
                              type="text"
                              value={profile?.full_name || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label htmlFor="settings-email" className="block text-sm font-medium mb-1">{t('settings.email')}</label>
                            <input
                              id="settings-email"
                              type="email"
                              value={userEmail}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed"
                            />
                          </div>
                          <div>
                            <label htmlFor="settings-account-type" className="block text-sm font-medium mb-1">{t('settings.accountType')}</label>
                            <input
                              id="settings-account-type"
                              type="text"
                              value={getUserTypeLabel(profile?.user_type || null)}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>

                      {studentDetails && (
                        <div className="pt-4 border-t">
                          <h3 className="text-lg font-medium mb-4">Academic Information</h3>
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="settings-school" className="block text-sm font-medium mb-1">University / Institution</label>
                              <input
                                id="settings-school"
                                type="text"
                                value={studentDetails.school || ''}
                                readOnly
                                className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label htmlFor="settings-major" className="block text-sm font-medium mb-1">Major / Field of Study</label>
                              <input
                                id="settings-major"
                                type="text"
                                value={studentDetails.major || ''}
                                readOnly
                                className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label htmlFor="settings-degree-type" className="block text-sm font-medium mb-1">Degree Type</label>
                              <input
                                id="settings-degree-type"
                                type="text"
                                value={studentDetails.degree_type || ''}
                                readOnly
                                className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label htmlFor="settings-year-of-admission" className="block text-sm font-medium mb-1">Year of Admission</label>
                              <input
                                id="settings-year-of-admission"
                                type="text"
                                value={studentDetails.year_of_admission?.toString() || ''}
                                readOnly
                                className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed"
                              />
                            </div>
                            <div>
                              <label htmlFor="settings-expected-completion" className="block text-sm font-medium mb-1">Expected Completion</label>
                              <input
                                id="settings-expected-completion"
                                type="text"
                                value={studentDetails.expected_completion?.toString() || ''}
                                readOnly
                                className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-4">
                          To edit your profile information, please visit the Profile section.
                        </p>
                        <Button onClick={() => handleTabChange('profile')}>Edit Profile</Button>
                      </div>

                      {/* Delete Account */}
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-medium text-destructive mb-2 flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          Delete account
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={deletingAccount}>
                              {deletingAccount ? 'Deleting...' : 'Delete Account'}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete your account, profile, resumes, assessments, and all other data. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleDeleteAccount}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Yes, delete my account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeSection === 'notifications' && (
                <>
                  <h2 className="text-xl font-semibold mb-6">{t('settings.notificationSettings')}</h2>
                  <NotificationSettingsPanel />
                </>
              )}

              {activeSection === 'security' && (
                <SecuritySection />
              )}

              {activeSection === 'regional' && (
                <>
                  <h2 className="text-xl font-semibold mb-6">{t('settings.regionalSettings')}</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your country and timezone are auto-detected when you sign in. You can adjust them below if needed.
                  </p>
                  <div className="space-y-6">
                    <div>
                      <label htmlFor="settings-language" className="block text-sm font-medium mb-1">{t('settings.language')}</label>
                      <select
                        id="settings-language"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="settings-country" className="block text-sm font-medium mb-1">{t('settings.country')}</label>
                      <input
                        id="settings-country"
                        type="text"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        placeholder="Auto-detected from your location"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Auto-detected from your IP address</p>
                    </div>
                    <div>
                      <label htmlFor="settings-timezone" className="block text-sm font-medium mb-1">{t('settings.timezone')}</label>
                      <select
                        id="settings-timezone"
                        className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                        value={selectedTimezone}
                        onChange={(e) => setSelectedTimezone(e.target.value)}
                      >
                        {ALL_TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>{tz}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">Auto-detected from your browser</p>
                    </div>
                    <div className="pt-4 border-t">
                      <Button onClick={handleSave}>{t('settings.saveChanges')}</Button>
                      <Button variant="outline" className="ml-2" onClick={resetRegionalSettings}>{t('settings.cancel')}</Button>
                    </div>
                  </div>
                </>
              )}

              {activeSection === 'preferences' && (
                <>
                  <h2 className="text-xl font-semibold mb-6">{t('settings.preferences')}</h2>
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-4">{t('settings.displaySettings')}</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="settings-dark-mode" className="font-medium">{t('settings.darkMode')}</Label>
                            <p id="settings-dark-mode-description" className="text-sm text-muted-foreground">{t('settings.darkModeDesc')}</p>
                          </div>
                          <Switch
                            id="settings-dark-mode"
                            checked={isDarkMode}
                            onCheckedChange={setIsDarkMode}
                            aria-describedby="settings-dark-mode-description"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="settings-compact-view" className="font-medium">{t('settings.compactView')}</Label>
                            <p id="settings-compact-view-description" className="text-sm text-muted-foreground">Reduce spacing for a more compact layout</p>
                          </div>
                          <Switch
                            id="settings-compact-view"
                            checked={isCompactView}
                            onCheckedChange={setIsCompactView}
                            aria-describedby="settings-compact-view-description"
                          />
                        </div>
                      </div>
                    </div>
                    <p className="border-t pt-4 text-sm text-muted-foreground" role="status">
                      Display changes are saved automatically.
                    </p>
                  </div>
                </>
              )}

            </div>
          </AnimatedSection>
        </div>
      </div>
    </PageLayout>
  );
};

export default Settings;
