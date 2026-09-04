/**
 * Device-local regional preferences (country/region and time zone).
 *
 * These are deliberately local, not profile columns: the schema has no
 * region/time-zone field and the app has no server-side consumer for them.
 * Nothing here reaches a third party — the earlier implementation resolved the
 * country from a geo-IP request on every first load, which was an unconsented
 * call to an external service for a value nothing read.
 */
const REGION_KEY = 'syncareer.region';
const TIMEZONE_KEY = 'syncareer.timezone';

function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function readRegion(): string {
  return readStored(REGION_KEY) ?? '';
}

/** The browser zone is the default; an explicit choice overrides it. */
export function readTimezone(): string {
  return readStored(TIMEZONE_KEY) ?? browserTimezone();
}

export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const FALLBACK_TIMEZONES = [
  'Africa/Accra', 'Africa/Abuja', 'Africa/Addis_Ababa', 'Africa/Cairo', 'Africa/Johannesburg',
  'Africa/Kampala', 'Africa/Nairobi', 'Africa/Windhoek', 'America/New_York', 'America/Toronto',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Europe/London', 'Europe/Paris', 'UTC',
];

/**
 * IANA identifiers the runtime supports. `Intl.supportedValuesOf('timeZone')`
 * is not available on every engine (older WebViews, minimal runtimes), so the
 * curated African-first list is the fallback rather than an empty select. The
 * list is static for the lifetime of the page, so it is resolved once — the
 * first call alone costs tens of milliseconds.
 */
let timezoneChoices: string[] | null = null;

export function availableTimezones(): string[] {
  if (timezoneChoices) return timezoneChoices;
  const supported = typeof Intl.supportedValuesOf === 'function'
    ? Intl.supportedValuesOf('timeZone')
    : [];
  timezoneChoices = supported.length > 0 ? supported : FALLBACK_TIMEZONES;
  return timezoneChoices;
}

export function saveRegion(region: string): void {
  write(REGION_KEY, region);
}

export function saveTimezone(timezone: string): void {
  write(TIMEZONE_KEY, timezone);
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, locked-down browsers); the
    // value simply does not survive the session.
  }
}
