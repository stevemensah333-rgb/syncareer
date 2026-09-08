import { describe, expect, it } from 'vitest';
import { isSupportEnabled, supportMomoNumber, supportUrl, supportEmailHref, supportSmsHref, SUPPORT_PATH } from './support';
import { SUPPORT_EMAIL, SUPPORT_PHONE } from './contact';

/**
 * Support is MoMo based: always available because a contact number exists,
 * and it never carries feature semantics. Navbar and footer link to the
 * in-app Support tab; the optional message goes out by email or SMS.
 */
describe('MoMo support seam', () => {
  it('is enabled because a contact number exists', () => {
    expect(isSupportEnabled()).toBe(true);
  });

  it('exposes the configured MoMo number for display', () => {
    expect(supportMomoNumber()).toBe(SUPPORT_PHONE);
  });

  it('links to the in-app support settings tab', () => {
    expect(supportUrl()).toBe(SUPPORT_PATH);
    expect(SUPPORT_PATH).toBe('/settings?tab=support');
  });

  it('accepts a custom message on both email and SMS links', () => {
    expect(supportEmailHref('Thanks!')).toBe(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Support for Syncareer')}&body=${encodeURIComponent('Thanks!')}`,
    );
    const smsPhone = SUPPORT_PHONE.replace(/\s/g, '');
    expect(supportSmsHref('Thanks!')).toBe(`sms:${smsPhone}?body=${encodeURIComponent('Thanks!')}`);
  });
});
