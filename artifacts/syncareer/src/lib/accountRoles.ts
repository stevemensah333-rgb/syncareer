export const ACCOUNT_ROLES = ['student', 'career_counsellor'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === 'string' && ACCOUNT_ROLES.includes(value as AccountRole);
}
