import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChevronLeft,
  CircleUser,
  HeartHandshake,
  LifeBuoy,
  MessageSquare,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/layout/PageLayout';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/lib/auth';
import { accountRoleLabel } from '@/lib/accountRoles';
import { isSupportEnabled } from '@/lib/support';
import { cn } from '@/lib/utils';
import { AccountSecuritySection } from '@/components/settings/AccountSecuritySection';
import { FeedbackSection } from '@/components/settings/FeedbackSection';
import { HelpSection } from '@/components/settings/HelpSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { PreferencesSection } from '@/components/settings/PreferencesSection';
import { ProfileSection } from '@/components/settings/ProfileSection';
import { SupportSection } from '@/components/settings/SupportSection';

const SETTINGS_SECTIONS = ['profile', 'account', 'notifications', 'preferences', 'feedback', 'help', 'support'] as const;
type SettingsSection = (typeof SETTINGS_SECTIONS)[number];

interface NavItem {
  id: SettingsSection;
  label: string;
  description: string;
  icon: typeof Bell;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Settings is administrative infrastructure, not a workspace. Three groups, six
 * destinations, one optional entry:
 *
 *   Account      Profile · Account & Security
 *   Preferences  Notifications · Preferences (language, region, time zone, theme)
 *   Support      Feedback · Help · Support Syncareer (only when configured)
 *
 * Region and time zone are Preferences rather than their own destination, and
 * there is no subscription or billing surface — the product is free. The active
 * section lives in `?tab=` so every destination is linkable and the mobile
 * list/detail pattern is driven by ordinary history.
 */
function useSettingsNav(): NavGroup[] {
  const { t } = useTranslation();
  const groups: NavGroup[] = [
    {
      label: t('settings.sectionAccount'),
      items: [
        {
          id: 'profile',
          label: t('settings.profile'),
          description: 'Your name, studies and qualifications.',
          icon: UserRound,
        },
        {
          id: 'account',
          label: t('settings.accountSecurity'),
          description: 'Sign-in details, security and closing your account.',
          icon: CircleUser,
        },
      ],
    },
    {
      label: t('settings.sectionPreferences'),
      items: [
        {
          id: 'notifications',
          label: t('settings.notifications'),
          description: 'What Syncareer sends you, and where it appears.',
          icon: Bell,
        },
        {
          id: 'preferences',
          label: t('settings.preferences'),
          description: 'Language, country, time zone and theme on this device.',
          icon: SlidersHorizontal,
        },
      ],
    },
    {
      label: t('settings.sectionSupport'),
      items: [
        {
          id: 'feedback',
          label: t('settings.feedback'),
          description: 'Report a problem, suggest an improvement, or comment.',
          icon: MessageSquare,
        },
        {
          id: 'help',
          label: t('settings.help'),
          description: 'How to reach a person, and the policies that matter.',
          icon: LifeBuoy,
        },
      ],
    },
  ];

  // Optional, and only present when a real support destination is configured.
  if (isSupportEnabled()) {
    groups[2]!.items.push({
      id: 'support',
      label: t('settings.supportSyncareer'),
      description: 'One-time support, if you want it. Free either way.',
      icon: HeartHandshake,
    });
  }

  return groups;
}

/**
 * Removed destinations keep resolving to where they live now instead of
 * dead-ending: the old Security tab is part of Account & Security, and the old
 * Regional page is part of Preferences.
 */
function resolveTab(raw: string | null, supportEnabled: boolean): SettingsSection | null {
  switch (raw) {
    case null:
      return null;
    case 'security':
    case 'subscription':
    case 'billing':
      return 'account';
    case 'regional':
      return 'preferences';
    case 'support':
      return supportEnabled ? 'support' : 'help';
    default:
      return SETTINGS_SECTIONS.includes(raw as SettingsSection) ? (raw as SettingsSection) : null;
  }
}

function IdentitySummary() {
  const { profile } = useUserProfile();
  const { user } = useAuth();

  const initials = (profile?.full_name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="flex items-center gap-3 border-b border-border px-3 pb-3.5">
      <Avatar className="size-9">
        <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
        <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
          {initials || '—'}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{profile?.full_name || 'Your account'}</p>
        <p className="type-metadata truncate">{user?.email ?? 'Signed in'}</p>
      </div>
      <Badge variant="soft-neutral" className="shrink-0">
        {accountRoleLabel(profile?.user_type)}
      </Badge>
    </div>
  );
}

function SettingsNavList({ groups, activeId }: { groups: NavGroup[]; activeId: SettingsSection | null }) {
  return (
    <nav aria-label="Settings sections" className="space-y-3.5">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="type-label px-3">{group.label}</p>
          <ul className="mt-1 space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const selected = item.id === activeId;
              return (
                <li key={item.id}>
                  <Link
                    to={`/settings?tab=${item.id}`}
                    aria-current={selected ? 'page' : undefined}
                    className={cn(
                      'interactive flex items-start gap-2.5 rounded-control px-3 py-2 text-left text-sm',
                      selected ? 'is-selected' : 'text-muted-foreground',
                    )}
                  >
                    <Icon
                      className={cn('mt-0.5 size-4 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">{item.label}</span>
                      <span className="type-metadata block">{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

const Settings = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const groups = useSettingsNav();
  const items = groups.flatMap((group) => group.items);

  const requestedTab = searchParams.get('tab');
  const section = resolveTab(requestedTab, items.some((item) => item.id === 'support'));
  // Desktop always has a section selected (the rail is the navigation); on
  // mobile the section list is the landing view and a section is a detail.
  const active: NavItem = items.find((item) => item.id === (section ?? 'profile')) ?? items[0]!;

  useEffect(() => {
    if (requestedTab === null || requestedTab === section) return;
    setSearchParams(section ? { tab: section } : {}, { replace: true });
  }, [requestedTab, section, setSearchParams]);

  const content = (
    <>
      {active.id === 'profile' && <ProfileSection />}
      {active.id === 'account' && <AccountSecuritySection />}
      {active.id === 'notifications' && <NotificationsSection />}
      {active.id === 'preferences' && <PreferencesSection />}
      {active.id === 'feedback' && <FeedbackSection />}
      {active.id === 'help' && <HelpSection />}
      {active.id === 'support' && <SupportSection />}
    </>
  );

  if (isMobile && section === null) {
    return (
      <PageLayout title={t('settings.title')} description="Your account, how Syncareer reaches you, and where to get help.">
        <div className="surface-content p-3">
          <IdentitySummary />
          <div className="pt-3">
            <SettingsNavList groups={groups} activeId={null} />
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={t('settings.title')} description="Your account, how Syncareer reaches you, and where to get help.">
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)] md:gap-6">
        <aside className="hidden md:sticky md:top-16 md:block">
          <div className="surface-content p-3">
            <IdentitySummary />
            <div className="pt-3">
              <SettingsNavList groups={groups} activeId={section ?? 'profile'} />
            </div>
          </div>
        </aside>

        <section className="min-w-0 space-y-4" aria-label={active.label}>
          {isMobile && (
            <Link
              to="/settings"
              className="interactive -ml-1 inline-flex items-center gap-1 rounded-control px-1.5 py-1 text-sm font-medium text-muted-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              {t('settings.title')}
            </Link>
          )}

          <header className="px-0.5">
            <h2 className="type-section-title">{active.label}</h2>
            <p className="type-supporting mt-1 max-w-prose">{active.description}</p>
          </header>

          {content}
        </section>
      </div>
    </PageLayout>
  );
};

export default Settings;
