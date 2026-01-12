/**
 * Auth Zod Schemas
 * Validation schemas for authentication endpoints
 */

import { z } from 'zod';

/**
 * Username validation - Instagram-style
 * 3-30 characters, alphanumeric, underscores, periods allowed
 * Cannot start/end with period, no consecutive periods
 */
const usernameRegex = /^(?!.*\.\.)[a-zA-Z0-9][a-zA-Z0-9_.]{1,28}[a-zA-Z0-9]$/;

/**
 * Password validation
 * Minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number
 */
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(passwordRegex, 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number'),
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .trim(),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(usernameRegex, 'Username can only contain letters, numbers, underscores, and periods. Cannot start/end with period.'),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Schema for token refresh
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

/**
 * Schema for email verification
 */
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;

/**
 * Schema for resend verification email
 */
export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
