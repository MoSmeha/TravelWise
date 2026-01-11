/**
 * Auth Routes
 * Authentication endpoints with validation and rate limiting
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
} from '../middleware/rate-limit.middleware';
import { validate } from '../middleware/validate';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from '../schemas/auth.schema';

const router = Router();

// POST /api/auth/register - Register new user
router.post(
  '/register',
  registerRateLimiter,
  validate(registerSchema),
  authController.register
);

// POST /api/auth/login - Login (rate-limited)
router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  authController.login
);

// POST /api/auth/refresh - Refresh access token
router.post(
  '/refresh',
  refreshRateLimiter,
  validate(refreshTokenSchema),
  authController.refresh
);

// POST /api/auth/verify-email - Verify email with token
router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  authController.verifyEmail
);

// GET /api/auth/verify-email - Verify email via browser link
router.get('/verify-email', authController.verifyEmail);

// POST /api/auth/resend-verification - Resend verification email
router.post(
  '/resend-verification',
  resendVerificationRateLimiter,
  validate(resendVerificationSchema),
  authController.resendVerification
);

// GET /api/auth/me - Get current user (protected)
router.get('/me', authenticate, authController.me);

export default router;
