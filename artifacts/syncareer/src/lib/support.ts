/**
 * Optional voluntary support for Syncareer.
 *
 * Syncareer is free to use. "Support Syncareer" is a strictly optional,
 * one-time contribution for people who find the product useful. It never
 * unlocks, extends, or changes product functionality — there is no reward,
 * tier, or entitlement attached to it.
 *
 * Configuration seam: set the browser-exposed `VITE_SUPPORT_URL` to a secure,
 * hosted one-time payment/donation destination (for example a provider
 * payment link). There is intentionally no payment code in the client and no
 * fallback URL: while `VITE_SUPPORT_URL` is unset the support entry point is
 * simply hidden and nothing is broken.
 */
const supportEnv = import.meta.env as { VITE_SUPPORT_URL?: string };

export const supportUrl = (): string => supportEnv.VITE_SUPPORT_URL ?? '';

export const isSupportEnabled = (): boolean => supportUrl().trim().length > 0;
