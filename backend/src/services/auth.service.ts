/**
 * Auth Service
 * Handles authentication business logic: password hashing, JWT generation, token management
 * Uses the auth provider for data access (provider-contract pattern)
 */

import argon2 from 'argon2';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import { authProvider } from '../providers/auth.provider.pg.js';
import { IAuthProvider, UserResponse, UserWithPassword } from '../provider-contract/auth.provider-contract.js';


const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';


// Token expiry times
const JWT_ACCESS_EXPIRY_SEC = 15 * 60; // 15 minutes
const JWT_REFRESH_EXPIRY_SEC = 7 * 24 * 60 * 60; // 7 days
const REFRESH_TOKEN_EXPIRY_MS = JWT_REFRESH_EXPIRY_SEC * 1000;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes


export interface JwtPayload {
  userId: string;
  email?: string;
  type: 'access' | 'refresh';
}

export interface RegisterResult {
  user: UserResponse;
  verificationOTP: string;
}

export interface LoginResult {
  user: UserResponse;
  accessToken: string;
  refreshToken: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}


export class AuthService {
  constructor(private provider: IAuthProvider = authProvider) {}


  /**
   * Register a new user
   * @returns The created user and verification token
   * @throws Error if email or username already exists
   */
  async register(input: RegisterInput): Promise<RegisterResult> {
    // Check for existing email
    const existingEmail = await this.provider.findUserByEmail(input.email);
    if (existingEmail) {
      throw new Error('EMAIL_EXISTS');
    }

    // Check for existing username
    const existingUsername = await this.provider.findUserByUsername(input.username);
    if (existingUsername) {
      throw new Error('USERNAME_EXISTS');
    }

    // Hash password
    const passwordHash = await this.hashPassword(input.password);

    // Generate avatar URL
    const avatarUrl = this.generateAvatarUrl(input.name);

    // Create user
    const user = await this.provider.createUser({
      email: input.email,
      passwordHash,
      name: input.name,
      username: input.username,
      avatarUrl,
    });

    // Generate verification OTP
    const verificationOTP = await this.generateVerificationOTP(user.id);

    console.log(`[AUTH] User registered: ${user.username} (${user.email})`);

    return { user, verificationOTP };
  }


  /**
   * Authenticate a user with email and password
   * @returns User info and tokens
   * @throws Error for invalid credentials or unverified email
   */
  async login(input: LoginInput): Promise<LoginResult> {
    // Find user by email
    const user = await this.provider.findUserByEmail(input.email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Verify password
    const isValid = await this.verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    // Check email verification
    if (!user.emailVerified) {
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(user.id, user.email || undefined);
    const refreshToken = await this.generateRefreshToken(user.id);

    console.log(`[AUTH] User logged in: ${user.username}`);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        createdAt: new Date(), // Not available from UserWithPassword, could be added
      },
      accessToken,
      refreshToken,
    };
  }


  /**
   * Rotate refresh token - invalidate old one and generate new one
   */
  async rotateRefreshToken(oldToken: string): Promise<TokenPair | null> {
    try {
      // Verify the old token
      let payload;
      try {
        payload = jwt.verify(oldToken, JWT_SECRET) as { tokenId: string; userId: string; type: string };
      } catch (err: any) {
        console.error('[AUTH] Refresh token verification failed:', err.message);
        return null;
      }

      if (payload.type !== 'refresh') {
        console.error('[AUTH] Invalid token type:', payload.type);
        return null;
      }

      // Hash the old token to look it up
      const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');

      // Find the token
      const existingToken = await this.provider.findRefreshToken(oldTokenHash);

      if (!existingToken) {
        console.error('[AUTH] Refresh token not found in DB (hash mismatch or deleted)');
        return null;
      }

      if (existingToken.expiresAt < new Date()) {
        console.error('[AUTH] Refresh token expired at:', existingToken.expiresAt);
        // Token not found or expired - delete if exists
        if (existingToken) {
          await this.provider.deleteRefreshToken(existingToken.id);
        }
        return null;
      }

      // Delete the old token
      await this.provider.deleteRefreshToken(existingToken.id);

      // Generate new tokens
      const accessToken = this.generateAccessToken(
        existingToken.userId,
        existingToken.user.email || undefined
      );
      const refreshToken = await this.generateRefreshToken(existingToken.userId);

      return { accessToken, refreshToken };
    } catch (error: any) {
      console.error('[AUTH] Unexpected error in rotateRefreshToken:', error.message);
      return null;
    }
  }

  /**
   * Generate access token
   */
  generateAccessToken(userId: string, email?: string): string {
    const payload: JwtPayload = {
      userId,
      email,
      type: 'access',
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY_SEC });
  }

  /**
   * Generate refresh token and store in database
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const tokenId = uuidv4();
    const token = jwt.sign(
      { tokenId, userId, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: JWT_REFRESH_EXPIRY_SEC }
    );

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.provider.createRefreshToken({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    });

    return token;
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token: string): JwtPayload | null {
    try {
      const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
      if (payload.type !== 'access') {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }


  /**
   * Generate 6-digit OTP for email verification
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate email verification OTP
   */
  async generateVerificationOTP(userId: string): Promise<string> {
    const otp = this.generateOTP();
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    await this.provider.createVerificationToken({
      userId,
      tokenHash: otpHash,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    return otp;
  }

  /**
   * Verify email using OTP
   */
  async verifyEmailWithOTP(email: string, otp: string): Promise<{ userId: string } | null> {
    // Find user by email first
    const user = await this.provider.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const verificationToken = await this.provider.findVerificationToken(otpHash);

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      // Delete expired token if exists
      if (verificationToken) {
        await this.provider.deleteVerificationToken(verificationToken.id);
      }
      return null;
    }

    // Check that the token belongs to the user
    if (verificationToken.userId !== user.id) {
      return null;
    }

    // Mark user as verified
    await this.provider.updateUserEmailVerified(user.id, true);

    // Delete the used token
    await this.provider.deleteVerificationToken(verificationToken.id);

    console.log(`[AUTH] Email verified for user: ${user.username}`);

    return { userId: user.id };
  }

  /**
   * Get user by email (for resend verification)
   */
  async getUserByEmail(email: string): Promise<UserWithPassword | null> {
    return this.provider.findUserByEmail(email);
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<UserResponse | null> {
    return this.provider.findUserById(id);
  }



  /**
   * Hash a password using Argon2
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }

  /**
   * Verify a password against a hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /**
   * Generate an avatar URL
   */
  generateAvatarUrl(name: string): string {
    const initials = name
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');

    const colors = ['4f46e5', '7c3aed', '2563eb', '0891b2', '059669', 'd97706', 'dc2626'];
    const colorIndex = Math.abs(
      name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % colors.length;
    const bgColor = colors[colorIndex];

    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=fff&size=256&bold=true`;
  }


  /**
   * Clean up expired tokens (can be called periodically)
   */
  async cleanupExpiredTokens(): Promise<{ refreshTokens: number; verificationTokens: number }> {
    const refreshTokens = await this.provider.deleteExpiredRefreshTokens();
    const verificationTokens = await this.provider.deleteExpiredVerificationTokens();
    return { refreshTokens, verificationTokens };
  }
}

export const authService = new AuthService();
