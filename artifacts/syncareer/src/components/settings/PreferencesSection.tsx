import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Moon, Sun } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_LANGUAGES } from '@/i18n/config';
import { countryNames } from '@/utils/countries';
import {
  availableTimezones,
  browserTimezone,
  readRegion,
  readTimezone,
  saveRegion,
  saveTimezone,
} from '@/lib/localePreferences';
import { applyDisplayPreferences, readDisplayPreferences } from '@/lib/displayPreferences';
import { cn } from '@/lib/utils';
import { SettingsGroup, SettingsRow } from './SettingsScaffold';

/**
 * Device preferences. These are intentionally local: `profiles`,
 * `student_details` and the auth record have no region or time-zone column, so
 * nothing here pretends to write to the account. Language is the exception —
 * it is what the i18n runtime reads, and it takes effect immediately.
 */
export function PreferencesSection() {
  const { t, i18n } = useTranslation();
  const [region, setRegion] = useState(readRegion);
  const [timezone, setTimezone] = useState(readTimezone);
  const [isDark, setIsDark] = useState(() => readDisplayPreferences().dark);
  const deviceTimezone = browserTimezone();
  const timezones = availableTimezones();

  const selectTheme = (dark: boolean) => {
    setIsDark(dark);
    applyDisplayPreferences({ dark });
  };

  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Language and region"
        description="Changes apply straight away and are stored on this device."
      >
        <SettingsRow label={t('settings.language')} hint="Only languages Syncareer actually ships are listed.">
          <div className="w-full sm:w-52">
            <Label htmlFor="preference-language" className="sr-only">
              {t('settings.language')}
            </Label>
            <Select
              value={i18n.language}
              onValueChange={(code) => {
                // i18next caches the chosen language itself (see i18n/config),
                // so no second copy is written here.
                void i18n.changeLanguage(code);
              }}
            >
              <SelectTrigger id="preference-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LANGUAGES.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    {language.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SettingsRow>

        <SettingsRow label={t('settings.country')} hint="You set this yourself; Syncareer never looks up your location.">
          <div className="w-full sm:w-52">
            <Label htmlFor="preference-region" className="sr-only">
              {t('settings.country')}
            </Label>
            <Select
              value={region || 'unset'}
              onValueChange={(value) => {
                const next = value === 'unset' ? '' : value;
                setRegion(next);
                saveRegion(next);
              }}
            >
              <SelectTrigger id="preference-region">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unset">Not set</SelectItem>
                {countryNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SettingsRow>

        <SettingsRow
          label={t('settings.timezone')}
          hint={
            timezone === deviceTimezone
              ? 'Following your device.'
              : `Your device reports ${deviceTimezone}.`
          }
        >
          <div className="w-full sm:w-52">
            <Label htmlFor="preference-timezone" className="sr-only">
              {t('settings.timezone')}
            </Label>
            <Select
              value={timezone}
              onValueChange={(value) => {
                setTimezone(value);
                saveTimezone(value);
              }}
            >
              <SelectTrigger id="preference-timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup title="Appearance" description="Applies to the whole app on this device.">
        <SettingsRow label={t('settings.theme')} hint="Both themes use the shared workspace palette, so nothing re-themes per route.">
          <div className="flex gap-1.5" role="group" aria-label={t('settings.theme')}>
            <ThemeOption
              active={!isDark}
              onClick={() => selectTheme(false)}
              icon={<Sun className="size-3.5" aria-hidden="true" />}
              label={t('settings.lightTheme')}
            />
            <ThemeOption
              active={isDark}
              onClick={() => selectTheme(true)}
              icon={<Moon className="size-3.5" aria-hidden="true" />}
              label={t('settings.darkTheme')}
            />
          </div>
        </SettingsRow>
      </SettingsGroup>
    </div>
  );
}

interface ThemeOptionProps {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}

function ThemeOption({ active, onClick, icon, label }: ThemeOptionProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'interactive inline-flex h-control items-center gap-1.5 rounded-control border px-3 text-sm font-medium',
        active ? 'border-primary/40 bg-selected text-selected-foreground' : 'border-border text-muted-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
