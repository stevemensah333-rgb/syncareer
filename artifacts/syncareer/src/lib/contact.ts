/**
 * The support channels Syncareer actually answers.
 *
 * These literals used to be duplicated in the account menu; one place keeps
 * the menu, the Help destination and any failure message in sync. Support is a
 * human channel (email and phone), not a ticket queue — feedback captured in
 * the product is stored separately in `user_feedback`.
 */
export const SUPPORT_EMAIL = 'syncareer01@gmail.com';

/** Display form, as it appears to a user. */
export const SUPPORT_PHONE = '+233 555 156 128';

export const SUPPORT_PHONE_HREF = `tel:${SUPPORT_PHONE.replace(/[^+\d]/g, '')}`;
