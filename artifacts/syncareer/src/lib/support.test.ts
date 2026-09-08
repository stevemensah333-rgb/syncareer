import { afterEach, describe, expect, it } from 'vitest';
import { isSupportEnabled, supportMomoNumber, supportUrl, supportWhatsAppHref, supportSmsHref } from './support';
import { SUPPORT_PHONE } from './contact';

afterEach(() => {
  vi.unstubAllEnvs();
});

/**
 * Support is MoMo based: always available because a contact number exists,
 * and it never carries feature semantics. The link opens a WhatsApp "click to
 * chat" with a default message; donors send the actual MoMo transfer on their
 * own device.
 */
describe('MoMo support seam', () => {
  it('is enabled because a contact number exists', () => {
    expect(isSupportEnabled()).toBe(true);
  });

  it('exposes the configured MoMo number for display', () => {
    expect(supportMomoNumber()).toBe(SUPPORT_PHONE);
  });

  it('returns a WhatsApp click-to-chat link with the default message', () => {
    const digits = SUPPORT_PHONE.replace(/[^\d]/g, '');
    expect(supportUrl()).toBe(`https://wa.me/${digits}?text=${encodeURIComponent('Hi Syncareer, I just sent a voluntary support contribution via MoMo. Thank you for keeping it free!')}`);
  });

  it('accepts a custom message on both WhatsApp and SMS links', () => {
    const digits = SUPPORT_PHONE.replace(/[^\d]/g, '');
    expect(supportWhatsAppHref('Thanks!')).toBe(`https://wa.me/${digits}?text=${encodeURIComponent('Thanks!')}`);
    const smsPhone = SUPPORT_PHONE.replace(/\s/g, '');
    expect(supportSmsHref('Thanks!')).toBe(`sms:${smsPhone}?body=${encodeURIComponent('Thanks!')}`);
  });
});
