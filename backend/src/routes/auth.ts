

import { Router } from 'express';
import {
  register,
  login,
  refresh,
  verifyEmail,
  resendVerification,
  me,
} from '../modules/auth/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
  resendVerificationRateLimiter,
} from '../middleware/rate-limit.middleware.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from '../modules/auth/auth.schema.js';

const router = Router();


router.post(
  '/register',
  registerRateLimiter,
  validate(registerSchema),
  register
);


router.post(
  '/login',
  loginRateLimiter,
  validate(loginSchema),
  login
);


router.post(
  '/refresh',
  refreshRateLimiter,
  validate(refreshTokenSchema),
  refresh
);


router.post(
  '/verify-email',
  validate(verifyEmailSchema),
  verifyEmail
);


router.post(
  '/resend-verification',
  resendVerificationRateLimiter,
  validate(resendVerificationSchema),
  resendVerification
);


router.get('/me', authenticate, me);

export default router;
