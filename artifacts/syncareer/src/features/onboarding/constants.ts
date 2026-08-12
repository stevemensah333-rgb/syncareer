import { z } from 'zod';
import { ACCOUNT_ROLES, isAccountRole, type AccountRole } from '@/lib/accountRoles';

export const ONBOARDING_ROLES = ACCOUNT_ROLES;
export type OnboardingRole = AccountRole;

export function isOnboardingRole(value: unknown): value is OnboardingRole {
  return isAccountRole(value);
}

export const MAJORS = [
  'Computer Science',
  'Business Administration',
  'Law',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Chemical Engineering',
  'Information Technology',
  'Data Science',
  'Finance',
  'Accounting',
  'Marketing',
  'Human Resources',
  'Economics',
  'Psychology',
  'Medicine',
  'Nursing',
  'Pharmacy',
  'Architecture',
  'Graphic Design',
  'Communications',
  'Education',
  'Environmental Science',
  'Agriculture',
  'Other',
] as const;

export const DEGREE_TYPES = [
  'Certificate',
  'Diploma',
  'Associate Degree',
  "Bachelor's Degree",
  'Honours Degree',
  'Postgraduate Diploma',
  "Master's Degree",
  'Doctoral Degree (PhD)',
  'Professional Degree',
] as const;

const CURRENT_YEAR = new Date().getFullYear();
export const ADMISSION_YEARS = Array.from(
  { length: 20 },
  (_, index) => CURRENT_YEAR - 10 + index,
);

export const studentSchema = z.object({
  school: z
    .string()
    .trim()
    .max(200, 'School name must be less than 200 characters')
    .optional(),
  major: z.string().min(1, 'Major is required'),
  degreeType: z.string().min(1, 'Degree type is required'),
  yearOfAdmission: z.string().optional(),
  expectedCompletion: z.string().optional(),
}).refine(
  ({ yearOfAdmission, expectedCompletion }) => {
    if (!yearOfAdmission || !expectedCompletion) return true;
    return Number(expectedCompletion) >= Number(yearOfAdmission);
  },
  { message: 'Expected completion cannot be before your admission year' },
);

export const counsellorSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'Full name is required')
    .max(100, 'Name must be less than 100 characters'),
  countryCode: z.string().min(1, 'Country code is required'),
  phoneNumber: z
    .string()
    .trim()
    .min(6, 'Enter a valid phone number')
    .max(20, 'Phone number must be less than 20 characters')
    .regex(/^[0-9 ()-]+$/, 'Phone number can only contain numbers, spaces, brackets, or hyphens'),
});
