import { SUPPORT_PHONE } from '@/lib/contact';

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
 * short message (WhatsApp or SMS) so the team can acknowledge it.
 */

const momoDigits = SUPPORT_PHONE.replace(/[^\d]/g, '');

export const SUPPORT_DEFAULT_MESSAGE =
  'Hi Syncareer, I just sent a voluntary support contribution via MoMo. Thank you for keeping it free!';

export const supportMomoNumber = (): string => SUPPORT_PHONE;

export const supportWhatsAppHref = (message: string = SUPPORT_DEFAULT_MESSAGE): string =>
  `https://wa.me/${momoDigits}?text=${encodeURIComponent(message)}`;

export const supportSmsHref = (message: string = SUPPORT_DEFAULT_MESSAGE): string =>
  `sms:${SUPPORT_PHONE.replace(/\s/g, '')}?body=${encodeURIComponent(message)}`;

/**
 * Single link used by the navbar and footer. Returns the WhatsApp "click to
 * chat" link with the default message, so the existing external-anchor callers
 * keep working without a hosted payment URL.
 */
export const supportUrl = (): string => supportWhatsAppHref();

export const isSupportEnabled = (): boolean => momoDigits.length > 0;
