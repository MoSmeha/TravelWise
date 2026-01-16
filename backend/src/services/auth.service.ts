/**
 * Auth Service
 * Handles authentication business logic: password hashing, JWT generation, token management
 * Uses the auth provider for data access (provider-contract pattern)
 */

import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RegisterInput, LoginInput } from '../schemas/auth.schema';
import { authProvider } from '../providers/auth.provider.pg';
import { IAuthProvider, UserResponse, UserWithPassword } from '../provider-contract/auth.provider-contract';


const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Token expiry times
const JWT_ACCESS_EXPIRY_SEC = 15 * 60; // 15 minutes
const JWT_REFRESH_EXPIRY_SEC = 7 * 24 * 60 * 60; // 7 days
const REFRESH_TOKEN_EXPIRY_MS = JWT_REFRESH_EXPIRY_SEC * 1000;
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours


export interface JwtPayload {
  userId: string;
  email?: string;
  type: 'access' | 'refresh';
}

export interface RegisterResult {
  user: UserResponse;
  verificationToken: string;
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

    // Generate verification token
    const verificationToken = await this.generateVerificationToken(user.id);

    console.log(`[AUTH] User registered: ${user.username} (${user.email})`);

    return { user, verificationToken };
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
      const payload = jwt.verify(oldToken, JWT_SECRET) as { tokenId: string; userId: string; type: string };

      if (payload.type !== 'refresh') {
        return null;
      }

      // Hash the old token to look it up
      const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');

      // Find the token
      const existingToken = await this.provider.findRefreshToken(oldTokenHash);

      if (!existingToken || existingToken.expiresAt < new Date()) {
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
    } catch {
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
   * Generate email verification token
   */
  async generateVerificationToken(userId: string): Promise<string> {
    const token = uuidv4() + uuidv4(); // Extra long for security
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await this.provider.createVerificationToken({
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS),
    });

    return token;
  }

  /**
   * Verify email using token
   */
  async verifyEmail(token: string): Promise<{ userId: string } | null> {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const verificationToken = await this.provider.findVerificationToken(tokenHash);

    if (!verificationToken || verificationToken.expiresAt < new Date()) {
      // Delete expired token if exists
      if (verificationToken) {
        await this.provider.deleteVerificationToken(verificationToken.id);
      }
      return null;
    }

    // Mark user as verified
    await this.provider.updateUserEmailVerified(verificationToken.userId, true);

    // Delete the used token
    await this.provider.deleteVerificationToken(verificationToken.id);

    console.log(`[AUTH] Email verified for user: ${verificationToken.userId}`);

    return { userId: verificationToken.userId };
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
   * Get verification link URL
   */
  getVerificationLink(token: string): string {
    return `${APP_URL}/api/auth/verify-email?token=${token}`;
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
