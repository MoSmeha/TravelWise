/**
 * Auth Service
 * Handles password hashing, JWT generation, and token management
 */

import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';

// Environment variables with defaults
const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-change-in-production';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// Token expiry in seconds
const JWT_ACCESS_EXPIRY_SEC = 15 * 60; // 15 minutes
const JWT_REFRESH_EXPIRY_SEC = 7 * 24 * 60 * 60; // 7 days
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Token expiry in milliseconds (for database storage)
const REFRESH_TOKEN_EXPIRY_MS = JWT_REFRESH_EXPIRY_SEC * 1000;

/**
 * JWT payload interface
 */
export interface JwtPayload {
  userId: string;
  email?: string;
  type: 'access' | 'refresh';
}

/**
 * Hash a password using Argon2
 */
export async function hashPassword(password: string): Promise<string> {
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
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

/**
 * Generate an avatar URL using ui-avatars.com
 */
export function generateAvatarUrl(name: string): string {
  const initials = name
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
  
  // Use a nice color palette
  const colors = ['4f46e5', '7c3aed', '2563eb', '0891b2', '059669', 'd97706', 'dc2626'];
  const colorIndex = Math.abs(name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
  const bgColor = colors[colorIndex];
  
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${bgColor}&color=fff&size=256&bold=true`;
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(userId: string, email?: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'access',
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY_SEC });
}

/**
 * Generate JWT refresh token and store in database
 */
export async function generateRefreshToken(userId: string): Promise<string> {
  const tokenId = uuidv4();
  const token = jwt.sign({ tokenId, userId, type: 'refresh' }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRY_SEC });
  
  // Hash the token for storage
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Store in database
  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
    },
  });
  
  return token;
}

/**
 * Verify JWT access token
 */
export function verifyAccessToken(token: string): JwtPayload | null {
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
 * Rotate refresh token - invalidate old one and generate new one
 */
export async function rotateRefreshToken(oldToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
  try {
    // Verify the old token
    const payload = jwt.verify(oldToken, JWT_SECRET) as { tokenId: string; userId: string; type: string };
    
    if (payload.type !== 'refresh') {
      return null;
    }
    
    // Hash the old token
    const oldTokenHash = crypto.createHash('sha256').update(oldToken).digest('hex');
    
    // Find and delete the old token
    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash: oldTokenHash },
      include: { user: true },
    });
    
    if (!existingToken || existingToken.expiresAt < new Date()) {
      // Token not found or expired - delete if exists
      if (existingToken) {
        await prisma.refreshToken.delete({ where: { id: existingToken.id } });
      }
      return null;
    }
    
    // Delete the old token
    await prisma.refreshToken.delete({ where: { id: existingToken.id } });
    
    // Generate new tokens
    const accessToken = generateAccessToken(existingToken.userId, existingToken.user.email || undefined);
    const refreshToken = await generateRefreshToken(existingToken.userId);
    
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

/**
 * Generate email verification token
 */
export async function generateVerificationToken(userId: string): Promise<string> {
  const token = uuidv4() + uuidv4(); // Extra long for security
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  // Delete any existing verification tokens for this user
  await prisma.emailVerificationToken.deleteMany({ where: { userId } });
  
  // Create new token
  await prisma.emailVerificationToken.create({
    data: {
      tokenHash,
      userId,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS),
    },
  });
  
  return token;
}

/**
 * Verify email verification token
 */
export async function verifyEmailToken(token: string): Promise<{ userId: string } | null> {
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  const verificationToken = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
  });
  
  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    // Delete expired token if exists
    if (verificationToken) {
      await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
    }
    return null;
  }
  
  // Mark user as verified
  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerified: true },
  });
  
  // Delete the used token
  await prisma.emailVerificationToken.delete({ where: { id: verificationToken.id } });
  
  return { userId: verificationToken.userId };
}

/**
 * Clean up expired tokens (can be called periodically)
 */
export async function cleanupExpiredTokens(): Promise<void> {
  const now = new Date();
  
  await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });
  
  await prisma.emailVerificationToken.deleteMany({
    where: { expiresAt: { lt: now } },
  });
}

/**
 * Get verification link
 */
export function getVerificationLink(token: string): string {
  return `${APP_URL}/api/auth/verify-email?token=${token}`;
}
