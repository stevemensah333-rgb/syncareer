export const ACCOUNT_ROLES = ['student', 'career_counsellor'] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

export function isAccountRole(value: unknown): value is AccountRole {
  return typeof value === 'string' && ACCOUNT_ROLES.includes(value as AccountRole);
}

/** The product-facing name of a stored role. `career_counsellor` is the
 *  internal role id; users meet it as "Career mentor". */
export function accountRoleLabel(userType: string | null | undefined): string {
  if (userType === 'career_counsellor') return 'Career mentor';
  if (userType === 'student') return 'Student';
  return 'Syncareer account';
}
