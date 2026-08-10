import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  nameSchema,
  phoneSchema,
  signupFormSchema,
  loginFormSchema,
  studentDetailsSchema,
  validateForm,
  getFormErrorMessage,
} from './validationSchemas';

/**
 * Matrix 1.5 / 2.3 — Auth/onboarding validation contracts.
 * These are the deterministic client-side gates that mirror server rules.
 */

describe('emailSchema', () => {
  it('accepts a valid email', () => {
    expect(emailSchema.safeParse('ama@example.com').success).toBe(true);
  });
  it('rejects a malformed email', () => {
    expect(emailSchema.safeParse('not-an-email').success).toBe(false);
    expect(emailSchema.safeParse('').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('rejects short passwords', () => {
    expect(passwordSchema.safeParse('Short1').success).toBe(false);
  });
  it('rejects passwords missing uppercase / lowercase / number', () => {
    expect(passwordSchema.safeParse('alllowercase1').success).toBe(false);
    expect(passwordSchema.safeParse('ALLUPPERCASE1').success).toBe(false);
    expect(passwordSchema.safeParse('NoDigitsHere').success).toBe(false);
  });
  it('accepts a compliant password', () => {
    expect(passwordSchema.safeParse('ValidPass1').success).toBe(true);
  });
});

describe('signupFormSchema (email sign-up contract)', () => {
  it('rejects mismatched passwords', () => {
    const r = signupFormSchema.safeParse({
      email: 'ama@example.com',
      password: 'ValidPass1',
      confirmPassword: 'ValidPass2',
      fullName: 'Ama Mensah',
      agreeToTerms: true,
    });
    expect(r.success).toBe(false);
  });
  it('requires agreeing to terms', () => {
    const r = signupFormSchema.safeParse({
      email: 'ama@example.com',
      password: 'ValidPass1',
      confirmPassword: 'ValidPass1',
      fullName: 'Ama Mensah',
      agreeToTerms: false,
    });
    expect(r.success).toBe(false);
  });
  it('accepts a complete valid signup', () => {
    const r = signupFormSchema.safeParse({
      email: 'ama@example.com',
      password: 'ValidPass1',
      confirmPassword: 'ValidPass1',
      fullName: 'Ama Mensah',
      agreeToTerms: true,
    });
    expect(r.success).toBe(true);
  });
});

describe('loginFormSchema', () => {
  it('accepts email + non-empty password', () => {
    expect(loginFormSchema.safeParse({ email: 'ama@example.com', password: 'x' }).success).toBe(true);
  });
  it('rejects missing password', () => {
    expect(loginFormSchema.safeParse({ email: 'ama@example.com', password: '' }).success).toBe(false);
  });
});

describe('nameSchema', () => {
  it('accepts letters, spaces, hyphens, apostrophes', () => {
    expect(nameSchema.safeParse("Ama O'Neil Mensah").success).toBe(true);
  });
  it('rejects names with digits/symbols or too short', () => {
    expect(nameSchema.safeParse('Ama1').success).toBe(false);
    expect(nameSchema.safeParse('A').success).toBe(false);
  });
});

describe('phoneSchema', () => {
  it('accepts E.164-style international numbers', () => {
    expect(phoneSchema.safeParse('+233201234567').success).toBe(true);
  });
  it('rejects invalid phone numbers', () => {
    expect(phoneSchema.safeParse('abc').success).toBe(false);
  });
});

describe('studentDetailsSchema (student onboarding)', () => {
  it('accepts a plausible student record', () => {
    const r = studentDetailsSchema.safeParse({
      school: 'University of Ghana',
      degree_type: 'Bachelor',
      major: 'Computer Science',
      year_of_admission: 2021,
      expected_completion: 2025,
    });
    expect(r.success).toBe(true);
  });
  it('rejects an impossible admission year', () => {
    const r = studentDetailsSchema.safeParse({
      school: 'University of Ghana',
      degree_type: 'Bachelor',
      major: 'Computer Science',
      year_of_admission: 1700,
      expected_completion: 2025,
    });
    expect(r.success).toBe(false);
  });
});

describe('validateForm / getFormErrorMessage', () => {
  it('returns typed data on success', async () => {
    const r = await validateForm(loginFormSchema, { email: 'a@b.com', password: 'x' });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ email: 'a@b.com', password: 'x' });
  });
  it('returns a field-keyed error map on failure', async () => {
    const r = await validateForm(loginFormSchema, { email: 'bad', password: '' });
    expect(r.success).toBe(false);
    expect(r.errors?.email).toBeTruthy();
    expect(r.errors?.password).toBeTruthy();
  });
  it('formats a ZodError message', () => {
    expect(getFormErrorMessage({ email: 'x' })).toBe('An error occurred');
  });
});
