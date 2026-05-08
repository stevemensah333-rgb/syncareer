import React, { useState, useEffect } from 'react';
import { NotificationSettingsPanel } from '@/components/notifications/NotificationSettingsPanel';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Bell, Globe, Lock, User, Settings as SettingsIcon, UserCircle, CreditCard, AlertTriangle } from 'lucide-react';

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
import { countries } from '@/utils/countries';
import { languages } from '@/utils/languages';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import SubscriptionManager from '@/components/subscription/SubscriptionManager';
import { SecuritySection } from '@/components/settings/SecuritySection';

type SettingsSection = 'profile' | 'account' | 'notifications' | 'security' | 'regional' | 'preferences' | 'subscription';

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
    countryName = tzParts[tzParts.length - 1].replace(/_/g, ' ') || '';
  }
  return { timezone: tz, countryName };
};

const Settings = () => {
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsSection) || 'account';
  const [activeSection, setActiveSection] = useState<SettingsSection>(initialTab);
  const { profile, studentDetails, employerDetails, loading: profileLoading } = useUserProfile();
  const isStudentRole = !profile?.user_type || profile.user_type === 'student';
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isCompactView, setIsCompactView] = useState(() => {
    const saved = localStorage.getItem('compactView');
    return saved === 'true';
  });
  const [selectedLanguage, setSelectedLanguage] = useState(i18n.language);
  const [selectedCountry, setSelectedCountry] = useState(() => localStorage.getItem('userCountry') || '');
  const [selectedTimezone, setSelectedTimezone] = useState(() => localStorage.getItem('userTimezone') || Intl.DateTimeFormat().resolvedOptions().timeZone);

  // Fetch user email + auto-detect locale on first load
  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || '');
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
  }, []);

  const getUserTypeLabel = (userType: string | null) => {
    switch (userType) {
      case 'student': return 'Student';
      case 'employer': return 'Employer / Recruiter';
      case 'career_counsellor': return 'Career Counsellor';
      default: return 'Not specified';
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('compactView', isCompactView.toString());
    if (isCompactView) {
      document.body.classList.add('compact-view');
    } else {
      document.body.classList.remove('compact-view');
    }
  }, [isCompactView]);

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

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke('delete-account');
      
      if (response.error) {
        throw new Error(response.error.message || 'Failed to delete account');
      }

      await supabase.auth.signOut();
      navigate('/');
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

  return (
    <PageLayout title={t('settings.title')}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-card rounded-lg p-6 shadow">
            <h2 className="text-xl font-semibold mb-4">{t('settings.title')}</h2>
            <nav className="space-y-2">
              <Button 
                variant={activeSection === 'profile' ? 'secondary' : 'ghost'} 
                className="w-full justify-start" 
                size="lg"
                onClick={() => setActiveSection('profile')}
              >
                <UserCircle className="mr-2 h-5 w-5" />
                Profile
              </Button>
              <Button 
                variant={activeSection === 'account' ? 'secondary' : 'ghost'} 
                className="w-full justify-start" 
                size="lg"
                onClick={() => setActiveSection('account')}
              >
                <User className="mr-2 h-5 w-5" />
                {t('settings.account')}
              </Button>
              <Button 
                variant={activeSection === 'notifications' ? 'secondary' : 'ghost'} 
                className="w-full justify-start" 
                size="lg"
                onClick={() => setActiveSection('notifications')}
              >
                <Bell className="mr-2 h-5 w-5" />
                {t('settings.notifications')}
              </Button>
              <Button 
                variant={activeSection === 'security' ? 'secondary' : 'ghost'} 
                className="w-full justify-start" 
                size="lg"
                onClick={() => setActiveSection('security')}
              >
                <Lock className="mr-2 h-5 w-5" />
                {t('settings.security')}
              </Button>
              <Button 
                variant={activeSection === 'regional' ? 'secondary' : 'ghost'} 
                className="w-full justify-start" 
                size="lg"
                onClick={() => setActiveSection('regional')}
              >
                <Globe className="mr-2 h-5 w-5" />
                {t('settings.regional')}
              </Button>
              <Button 
                variant={activeSection === 'preferences' ? 'secondary' : 'ghost'} 
                className="w-full justify-start" 
                size="lg"
                onClick={() => setActiveSection('preferences')}
              >
                <SettingsIcon className="mr-2 h-5 w-5" />
                {t('settings.preferences')}
              </Button>
              {isStudentRole && (
                <Button 
                  variant={activeSection === 'subscription' ? 'secondary' : 'ghost'} 
                  className="w-full justify-start" 
                  size="lg"
                  onClick={() => setActiveSection('subscription')}
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Subscription
                </Button>
              )}
            </nav>
          </div>
        </div>
        
        <div className="lg:col-span-2">
          {activeSection === 'profile' && (
            <div className="bg-card rounded-lg p-6 shadow">
              <ProfileSection />
            </div>
          )}
          <div className="bg-card rounded-lg p-6 shadow">
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Full Name</label>
                          <input 
                            type="text" 
                            value={profile?.full_name || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Username</label>
                          <input 
                            type="text" 
                            value={profile?.username || ''}
                            readOnly
                            className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">{t('settings.email')}</label>
                          <input 
                            type="email" 
                            value={userEmail}
                            readOnly
                            className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Account Type</label>
                          <input 
                            type="text" 
                            value={getUserTypeLabel(profile?.user_type || null)}
                            readOnly
                            className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Role-specific details */}
                    {profile?.user_type === 'student' && studentDetails && (
                      <div className="pt-4 border-t">
                        <h3 className="text-lg font-medium mb-4">Education Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">School</label>
                            <input 
                              type="text" 
                              value={studentDetails.school || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Major</label>
                            <input 
                              type="text" 
                              value={studentDetails.major || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Degree Type</label>
                            <input 
                              type="text" 
                              value={studentDetails.degree_type || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Year of Admission</label>
                            <input 
                              type="text" 
                              value={studentDetails.year_of_admission?.toString() || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Expected Completion</label>
                            <input 
                              type="text" 
                              value={studentDetails.expected_completion?.toString() || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {profile?.user_type === 'employer' && employerDetails && (
                      <div className="pt-4 border-t">
                        <h3 className="text-lg font-medium mb-4">Company Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Company Name</label>
                            <input 
                              type="text" 
                              value={employerDetails.company_name || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Company Location</label>
                            <input 
                              type="text" 
                              value={employerDetails.company_location || ''}
                              readOnly
                              className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                            />
                          </div>
                          {employerDetails.industry && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Industry</label>
                              <input 
                                type="text" 
                                value={employerDetails.industry}
                                readOnly
                                className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                              />
                            </div>
                          )}
                          {employerDetails.job_title && (
                            <div>
                              <label className="block text-sm font-medium mb-1">Job Title</label>
                              <input 
                                type="text" 
                                value={employerDetails.job_title}
                                readOnly
                                className="w-full px-3 py-2 border border-border rounded-md bg-muted text-foreground cursor-not-allowed" 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )}


                    <div className="pt-4 border-t">
                      <p className="text-sm text-muted-foreground mb-4">
                        To edit your profile information, please visit the Profile section.
                      </p>
                      <Button onClick={() => setActiveSection('profile')}>Edit Profile</Button>
                    </div>

                    {/* Delete Account */}
                    <div className="pt-6 border-t">
                      <h3 className="text-lg font-medium text-destructive mb-2 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5" />
                        Danger Zone
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
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
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
                    <label className="block text-sm font-medium mb-1">{t('settings.language')}</label>
                    <select
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
                    <label className="block text-sm font-medium mb-1">{t('settings.country')}</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                      placeholder="Auto-detected from your location"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Auto-detected from your IP address</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{t('settings.timezone')}</label>
                    <select
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
                    <Button variant="outline" className="ml-2">{t('settings.cancel')}</Button>
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
                          <p className="font-medium">{t('settings.darkMode')}</p>
                          <p className="text-sm text-muted-foreground">{t('settings.darkModeDesc')}</p>
                        </div>
                        <div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={isDarkMode}
                              onChange={(e) => setIsDarkMode(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{t('settings.compactView')}</p>
                          <p className="text-sm text-muted-foreground">Reduce spacing for a more compact layout</p>
                        </div>
                        <div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={isCompactView}
                              onChange={(e) => setIsCompactView(e.target.checked)}
                            />
                            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-background after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Button onClick={handleSave}>{t('settings.saveChanges')}</Button>
                    <Button variant="outline" className="ml-2">{t('settings.cancel')}</Button>
                  </div>
                </div>
              </>
            )}

            {activeSection === 'subscription' && isStudentRole && (
              <div>
                <h2 className="text-xl font-semibold mb-6">Subscription & Billing</h2>
                <SubscriptionManager />
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
    );
  };
  
  export default Settings;
