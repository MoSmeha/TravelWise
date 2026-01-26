import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { AppError } from '../utils/AppError.js';
import { InvalidTokenError } from '../errors/auth.errors.js';
import {
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from '../schemas/auth.schema.js';
import {
  register as registerUser,
  login as loginUser,
  rotateRefreshToken,
  verifyEmailWithOTP,
  getUserById,
  getUserByEmail,
  generateVerificationOTP,
} from '../services/auth.service.js';
import { sendVerificationEmail, sendWelcomeEmail } from '../services/email.service.js';



export async function register(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as RegisterInput;

    const { user, verificationOTP } = await registerUser(input);

    // Send verification email
    if (user.email) {
      await sendVerificationEmail(user.email, user.name, verificationOTP);
    }

    res.status(201).json({
      message: 'Registration successful. Please check your email to verify your account.',
      user,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Registration error:', error.message);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
}



export async function login(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as LoginInput;

    const result = await loginUser(input);

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
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
}


export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as RefreshTokenInput;

    const tokens = await rotateRefreshToken(input.refreshToken);

    if (!tokens) {
      throw new InvalidTokenError();
    }

    res.json({
      message: 'Token refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Token refresh error:', error.message);
    res.status(500).json({ error: 'Token refresh failed', message: error.message });
  }
}


export async function verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const { email, otp } = req.body as VerifyEmailInput;

    const result = await verifyEmailWithOTP(email, otp);

    if (!result) {
      throw new AppError('Invalid or expired OTP', 400);
    }

    // Get user info for welcome email
    const user = await getUserById(result.userId);
    if (user?.email) {
      await sendWelcomeEmail(user.email, user.name);
    }

    res.json({
      message: 'Email verified successfully',
      userId: result.userId,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Email verification error:', error.message);
    res.status(500).json({ error: 'Email verification failed', message: error.message });
  }
}


export async function resendVerification(req: Request, res: Response): Promise<void> {
  try {
    const input = req.body as ResendVerificationInput;

    const user = await getUserByEmail(input.email);

    if (!user) {
      // Don't reveal if email exists or not
      res.json({ message: 'If that email exists, a verification email has been sent' });
      return;
    }

    if (user.emailVerified) {
      throw new AppError('Email already verified', 400);
    }

    const verificationOTP = await generateVerificationOTP(user.id);
    await sendVerificationEmail(user.email!, user.name, verificationOTP);

    res.json({ message: 'Verification email sent' });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Resend verification error:', error.message);
    res.status(500).json({
      error: 'Failed to resend verification email',
      message: error.message,
    });
  }
}




export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await getUserById(req.user.userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Failed to get user', message: error.message });
  }
}
