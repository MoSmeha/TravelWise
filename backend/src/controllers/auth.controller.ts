import { Request, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from '../schemas/auth.schema';
import {
  generateAccessToken,
  generateAvatarUrl,
  generateRefreshToken,
  generateVerificationToken,
  hashPassword,
  rotateRefreshToken,
  verifyEmailToken,
  verifyPassword,
} from '../services/auth.service';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/email.service';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as RegisterInput;

    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existingEmail) {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    
    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username.toLowerCase() },
    });
    if (existingUsername) {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    
    // Hash password
    const passwordHash = await hashPassword(input.password);
    
    // Generate avatar URL
    const avatarUrl = generateAvatarUrl(input.name);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        username: input.username.toLowerCase(),
        avatarUrl,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    
    console.log(`✅ User registered: ${user.username} (${user.email})`);
    
    // Send verification email if email provided
    if (user.email) {
      const verificationToken = await generateVerificationToken(user.id);
      await sendVerificationEmail(user.email, user.name, verificationToken);
    }
    
    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user,
    });
  } catch (error: any) {
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
}

/**
 * POST /api/auth/login
 * Login with email and password
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as LoginInput;
    
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // Verify password
    const isValid = await verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // Check email verification
    if (!user.emailVerified) {
      res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address before logging in',
        userId: user.id,
      });
      return;
    }
    
    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email || undefined);
    const refreshToken = await generateRefreshToken(user.id);
    
    console.log(`✅ User logged in: ${user.username}`);
    
    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as RefreshTokenInput;
    
    const tokens = await rotateRefreshToken(input.refreshToken);
    
    if (!tokens) {
      res.status(401).json({ error: 'Invalid or expired refresh token' });
      return;
    }
    
    res.json({
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    console.error('Token refresh error:', error.message);
    res.status(500).json({ error: 'Token refresh failed', message: error.message });
  }
}

/**
 * POST /api/auth/verify-email
 * Verify email using token
 */
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    // Support both POST body and GET query param
    const token = (req.body as VerifyEmailInput).token || req.query.token as string;
    
    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }
    
    const result = await verifyEmailToken(token);
    
    if (!result) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }
    
    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { email: true, name: true },
    });
    
    if (user?.email) {
      await sendWelcomeEmail(user.email, user.name);
    }
    
    console.log(`✅ Email verified for user: ${result.userId}`);
    
    // If accessed via GET (browser link), redirect or show HTML
    if (req.method === 'GET') {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Email Verified - TravelWise</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);">
          <div style="background: white; padding: 40px; border-radius: 16px; text-align: center; max-width: 400px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);">
            <div style="font-size: 64px; margin-bottom: 20px;">✅</div>
            <h1 style="color: #1f2937; margin: 0 0 10px 0;">Email Verified!</h1>
            <p style="color: #6b7280; margin: 0 0 20px 0;">Your email has been verified successfully. You can now log in to TravelWise.</p>
            <p style="color: #9ca3af; font-size: 14px;">You can close this window.</p>
          </div>
        </body>
        </html>
      `);
      return;
    }
    
    res.json({
      message: 'Email verified successfully',
      userId: result.userId,
    });
  } catch (error: any) {
    console.error('Email verification error:', error.message);
    res.status(500).json({ error: 'Email verification failed', message: error.message });
  }
}

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
export async function resendVerification(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as ResendVerificationInput;
    
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });
    
    if (!user) {
      // Don't reveal if email exists or not
      res.json({ message: 'If that email exists, a verification email has been sent' });
      return;
    }
    
    if (user.emailVerified) {
      res.status(400).json({ error: 'Email already verified' });
      return;
    }
    
    const verificationToken = await generateVerificationToken(user.id);
    await sendVerificationEmail(user.email!, user.name, verificationToken);
    
    res.json({ message: 'Verification email sent' });
  } catch (error: any) {
    console.error('Resend verification error:', error.message);
    res.status(500).json({ error: 'Failed to resend verification email', message: error.message });
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({ user });
  } catch (error: any) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Failed to get user', message: error.message });
  }
}
