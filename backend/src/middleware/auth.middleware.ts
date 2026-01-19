/**
 * Auth Middleware
 * JWT verification and user authentication for protected routes
 */

import { NextFunction, Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { authService } from '../services/auth.service.js';

/**
 * Extended Request interface with user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email?: string;
  };
}

export type AuthRequest = AuthenticatedRequest;

/**
 * Authenticate middleware
 * Verifies JWT access token from Authorization header
 * Attaches user info to req.user
 */
export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authorization header missing or invalid' });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    const payload = authService.verifyAccessToken(token);
    
    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired access token' });
      return;
    }
    
    // Optionally verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, emailVerified: true },
    });
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    req.user = {
      userId: payload.userId,
      email: payload.email,
    };
    
    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Require verified email middleware
 * Must be used after authenticate middleware
 */
export async function requireVerified(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { emailVerified: true, email: true },
    });
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    // Only require verification if user has an email
    if (user.email && !user.emailVerified) {
      res.status(403).json({ 
        error: 'Email not verified',
        message: 'Please verify your email address to access this resource',
      });
      return;
    }
    
    next();
  } catch (error: any) {
    console.error('Require verified middleware error:', error.message);
    res.status(500).json({ error: 'Verification check failed' });
  }
}

/**
 * Optional auth middleware
 * Attaches user info if token is valid, but doesn't require it
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyAccessToken(token);
      
      if (payload) {
        req.user = {
          userId: payload.userId,
          email: payload.email,
        };
      }
    }
    
    next();
  } catch {
    // Silently continue without user
    next();
  }
}
