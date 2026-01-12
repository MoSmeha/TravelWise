/**
 * Rate Limit Middleware
 * Protects authentication endpoints from brute force attacks
 */

import rateLimit from 'express-rate-limit';

/**
 * Login rate limiter
 * 5 attempts per 15 minutes per IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: 15 * 60, // seconds
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => {
    // Use IP address as key, with fallback
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Registration rate limiter
 * More lenient: 10 attempts per hour per IP
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 attempts
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again after an hour',
    retryAfter: 60 * 60, // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Resend verification rate limiter
 * 3 attempts per 10 minutes per IP
 */
export const resendVerificationRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 attempts
  message: {
    error: 'Too many resend attempts',
    message: 'Please try again after 10 minutes',
    retryAfter: 10 * 60, // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});

/**
 * Token refresh rate limiter
 * More lenient as it's used for normal app operation
 * 30 attempts per minute per IP
 */
export const refreshRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 attempts
  message: {
    error: 'Too many refresh attempts',
    message: 'Please try again shortly',
    retryAfter: 60, // seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});
