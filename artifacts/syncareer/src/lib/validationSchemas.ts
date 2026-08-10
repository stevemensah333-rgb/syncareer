import { z } from 'zod';

/**
 * Centralized validation schemas for the application
 */

// Email validation
export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address');

// Password validation
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Weak password (for confirmation, not creation)
export const weakPasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters');

// Phone validation
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number');

// Optional phone
export const optionalPhoneSchema = phoneSchema.optional().or(z.literal(''));

// Name validation
export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes');

// URL validation
export const urlSchema = z
  .string()
  .url('Please enter a valid URL')
  .optional()
  .or(z.literal(''));

// Signup form
export const signupFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: nameSchema,
  agreeToTerms: z.boolean().refine(v => v === true, 'You must agree to the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type SignupFormData = z.infer<typeof signupFormSchema>;

// Login form
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

// Profile form
export const profileFormSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  bio: z.string().max(500, 'Bio must not exceed 500 characters').optional(),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

// Student details form
export const studentDetailsSchema = z.object({
  school: z.string().min(2, 'School name is required'),
  degree_type: z.string().min(1, 'Degree type is required'),
  major: z.string().min(2, 'Major is required'),
  year_of_admission: z.number().min(1900).max(new Date().getFullYear()),
  expected_completion: z.number().min(2024).max(new Date().getFullYear() + 10),
});

export type StudentDetailsData = z.infer<typeof studentDetailsSchema>;

// Contact form
export const contactFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(100),
  message: z.string().min(10, 'Message must be at least 10 characters').max(5000),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// Feedback form
export const feedbackFormSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  feedback: z.string().min(5, 'Feedback must be at least 5 characters').max(1000),
  email: emailSchema.optional(),
});

export type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

/**
 * Generic form error formatter
 */
export function getFormErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) {
    const firstIssue = error.issues[0]!;
    return firstIssue.message || 'Invalid input';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An error occurred';
}

/**
 * Validate form data
 */
export async function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Promise<{ success: boolean; data?: T; errors?: Record<string, string> }> {
  try {
    const validated = await schema.parseAsync(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        errors[path] = issue.message;
      });
      return { success: false, errors };
    }
    return {
      success: false,
      errors: { general: 'Validation failed' },
    };
  }
}
