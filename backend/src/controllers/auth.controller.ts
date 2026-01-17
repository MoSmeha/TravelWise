import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import {
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from '../schemas/auth.schema';
import { authService } from '../services/auth.service';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/email.service';

//POST /api/auth/register

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as RegisterInput;

    const { user, verificationOTP } = await authService.register(input);

    // Send verification email
    if (user.email) {
      await sendVerificationEmail(user.email, user.name, verificationOTP);
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user,
    });
  } catch (error: any) {
    if (error.message === 'EMAIL_EXISTS') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    if (error.message === 'USERNAME_EXISTS') {
      res.status(409).json({ error: 'Username already taken' });
      return;
    }
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
}

//POST /api/auth/login

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as LoginInput;

    const result = await authService.login(input);

    res.json({
      message: 'Login successful',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        username: result.user.username,
        avatarUrl: result.user.avatarUrl,
        emailVerified: result.user.emailVerified,
      },
    });
  } catch (error: any) {
    if (error.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    if (error.message === 'EMAIL_NOT_VERIFIED') {
      res.status(403).json({
        error: 'Email not verified',
        message: 'Please verify your email address before logging in',
      });
      return;
    }
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
}

//POST /api/auth/refresh
//Refresh access token using refresh token
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as RefreshTokenInput;

    const tokens = await authService.rotateRefreshToken(input.refreshToken);

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

//POST /api/auth/verify-email
//Verify email using OTP
export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body as VerifyEmailInput;

    const result = await authService.verifyEmailWithOTP(email, otp);

    if (!result) {
      res.status(400).json({ error: 'Invalid or expired OTP' });
      return;
    }

    // Get user info for welcome email
    const user = await authService.getUserById(result.userId);
    if (user?.email) {
      await sendWelcomeEmail(user.email, user.name);
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

    const user = await authService.getUserByEmail(input.email);

    if (!user) {
      // Don't reveal if email exists or not
      res.json({ message: 'If that email exists, a verification email has been sent' });
      return;
    }

    if (user.emailVerified) {
      res.status(400).json({ error: 'Email already verified' });
      return;
    }

    const verificationOTP = await authService.generateVerificationOTP(user.id);
    await sendVerificationEmail(user.email!, user.name, verificationOTP);

    res.json({ message: 'Verification email sent' });
  } catch (error: any) {
    console.error('Resend verification error:', error.message);
    res.status(500).json({
      error: 'Failed to resend verification email',
      message: error.message,
    });
  }
}

// ============================================================================
// User Info
// ============================================================================

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

    const user = await authService.getUserById(req.user.userId);

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
