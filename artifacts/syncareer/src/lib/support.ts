import { SUPPORT_EMAIL, SUPPORT_PHONE } from '@/lib/contact';

/**
 * Optional voluntary support for Syncareer (Mobile Money based).
 *
 * Syncareer is free to use. "Support Syncareer" is a strictly optional,
 * one-time contribution for people who find the product useful. It never
 * unlocks, extends, or changes product functionality — there is no reward,
 * tier, or entitlement attached to it.
 *
 * Contributions are sent directly via Mobile Money to the Syncareer number
 * (SUPPORT_PHONE). There is no payment processor in the client: the donor
 * initiates the MoMo transfer on their own device, then optionally sends a
 * short message (email or SMS) so the team can acknowledge it.
 */

const momoDigits = SUPPORT_PHONE.replace(/[^\d]/g, '');

export const SUPPORT_DEFAULT_MESSAGE =
  'Hi Syncareer, I just sent a voluntary support contribution via MoMo. Thank you for keeping it free!';

export const SUPPORT_EMAIL_SUBJECT = 'Support for Syncareer';

export const supportMomoNumber = (): string => SUPPORT_PHONE;

export const supportEmailHref = (message: string = SUPPORT_DEFAULT_MESSAGE): string =>
  `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(SUPPORT_EMAIL_SUBJECT)}&body=${encodeURIComponent(message)}`;

/**
 * Web compose URL. `mailto:` links do nothing when no desktop mail client is
 * registered (and are blocked in embedded previews), so the primary email
 * action opens Gmail's compose view in a new tab instead.
 */
export const supportGmailHref = (message: string = SUPPORT_DEFAULT_MESSAGE): string =>
  `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}` +
  `&su=${encodeURIComponent(SUPPORT_EMAIL_SUBJECT)}&body=${encodeURIComponent(message)}`;

export const supportSmsHref = (message: string = SUPPORT_DEFAULT_MESSAGE): string =>
  `sms:${SUPPORT_PHONE.replace(/\s/g, '')}?body=${encodeURIComponent(message)}`;

/**
 * In-app destination used by the navbar and footer: the Support tab in
 * Settings, where the MoMo number and message composer live.
 */
export const SUPPORT_PATH = '/settings?tab=support';

export const supportUrl = (): string => SUPPORT_PATH;

export const isSupportEnabled = (): boolean => momoDigits.length > 0;

