

import rateLimit from 'express-rate-limit';


export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: 15 * 60, 
  },
  standardHeaders: true, 
  legacyHeaders: false, 
  skipSuccessfulRequests: true, 
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});


export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, 
  max: 10, 
  message: {
    error: 'Too many registration attempts',
    message: 'Please try again after an hour',
    retryAfter: 60 * 60, 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});


export const resendVerificationRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, 
  max: 3, 
  message: {
    error: 'Too many resend attempts',
    message: 'Please try again after 10 minutes',
    retryAfter: 10 * 60, 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});


export const refreshRateLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 30, 
  message: {
    error: 'Too many refresh attempts',
    message: 'Please try again shortly',
    retryAfter: 60, 
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
});
