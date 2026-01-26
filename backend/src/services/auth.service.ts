

import argon2 from 'argon2';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RegisterInput, LoginInput } from '../schemas/auth.schema.js';
import { authProvider } from '../providers/auth.provider.pg.js';
import { UserResponse, UserWithPassword } from '../provider-contract/auth.provider-contract.js';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
} from '../errors/auth.errors.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super-duper-secret-se-factory';


const JWT_ACCESS_EXPIRY_SEC = 30 * 60;
const JWT_REFRESH_EXPIRY_SEC = 7 * 24 * 60 * 60;
const REFRESH_TOKEN_EXPIRY_MS = JWT_REFRESH_EXPIRY_SEC * 1000;
const OTP_EXPIRY_MS = 10 * 60 * 1000;

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


export async function register(input: RegisterInput): Promise<RegisterResult> {

  const existingEmail = await authProvider.findUserByEmail(input.email);
  if (existingEmail) {
    throw new UserAlreadyExistsError('Email already registered');
  }


  const existingUsername = await authProvider.findUserByUsername(input.username);
  if (existingUsername) {
    throw new UserAlreadyExistsError('Username already taken');
  }


  const passwordHash = await hashPassword(input.password);


  const avatarUrl = generateAvatarUrl(input.name);


  const user = await authProvider.createUser({
    email: input.email,
    passwordHash,
    name: input.name,
    username: input.username,
    avatarUrl,
  });


  const verificationOTP = await generateVerificationOTP(user.id);

  console.log(`[AUTH] User registered: ${user.username} (${user.email})`);

  return { user, verificationOTP };
}


export async function login(input: LoginInput): Promise<LoginResult> {

  const user = await authProvider.findUserByEmail(input.email);
  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }


  const isValid = await verifyPassword(input.password, user.passwordHash);
  if (!isValid) {
    throw new InvalidCredentialsError();
  }


  if (!user.emailVerified) {
    throw new EmailNotVerifiedError();
  }


  const accessToken = generateAccessToken(user.id, user.email || undefined);
  const refreshToken = await generateRefreshToken(user.id);

  console.log(`[AUTH] User logged in: ${user.username}`);

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      avatarUrl: user.avatarUrl,
      emailVerified: user.emailVerified,
      createdAt: new Date(),
    },
    accessToken,
    refreshToken,
  };
}


export async function rotateRefreshToken(oldToken: string): Promise<TokenPair | null> {
  try {

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


    const oldTokenHash = createHash('sha256').update(oldToken).digest('hex');


    const existingToken = await authProvider.findRefreshToken(oldTokenHash);

    if (!existingToken) {
      console.error('[AUTH] Refresh token not found in DB (hash mismatch or deleted)');
      return null;
    }

    if (existingToken.expiresAt < new Date()) {
      console.error('[AUTH] Refresh token expired at:', existingToken.expiresAt);

      if (existingToken) {
        await authProvider.deleteRefreshToken(existingToken.id);
      }
      return null;
    }


    await authProvider.deleteRefreshToken(existingToken.id);


    const accessToken = generateAccessToken(
      existingToken.userId,
      existingToken.user.email || undefined
    );
    const refreshToken = await generateRefreshToken(existingToken.userId);

    return { accessToken, refreshToken };
  } catch (error: any) {
    console.error('[AUTH] Unexpected error in rotateRefreshToken:', error.message);
    return null;
  }
}


export function generateAccessToken(userId: string, email?: string): string {
  const payload: JwtPayload = {
    userId,
    email,
    type: 'access',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY_SEC });
}


export async function generateRefreshToken(userId: string): Promise<string> {
  const tokenId = uuidv4();
  const token = jwt.sign(
    { tokenId, userId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRY_SEC }
  );

  const tokenHash = createHash('sha256').update(token).digest('hex');

  await authProvider.createRefreshToken({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
  });

  return token;
}


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



export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


export async function generateVerificationOTP(userId: string): Promise<string> {
  const otp = generateOTP();
  const otpHash = createHash('sha256').update(otp).digest('hex');

  await authProvider.createVerificationToken({
    userId,
    tokenHash: otpHash,
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
  });

  return otp;
}


export async function verifyEmailWithOTP(email: string, otp: string): Promise<{ userId: string } | null> {

  const user = await authProvider.findUserByEmail(email);
  if (!user) {
    return null;
  }

  const otpHash = createHash('sha256').update(otp).digest('hex');
  const verificationToken = await authProvider.findVerificationToken(otpHash);

  if (!verificationToken || verificationToken.expiresAt < new Date()) {
    // Delete expired token if exists
    if (verificationToken) {
      await authProvider.deleteVerificationToken(verificationToken.id);
    }
    return null;
  }

  // Check that the token belongs to the user
  if (verificationToken.userId !== user.id) {
    return null;
  }

  // Mark user as verified
  await authProvider.updateUserEmailVerified(user.id, true);

  // Delete the used token
  await authProvider.deleteVerificationToken(verificationToken.id);

  console.log(`[AUTH] Email verified for user: ${user.username}`);

  return { userId: user.id };
}

/**
 * Get user by email (for resend verification)
 */
export async function getUserByEmail(email: string): Promise<UserWithPassword | null> {
  return authProvider.findUserByEmail(email);
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<UserResponse | null> {
  return authProvider.findUserById(id);
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
 * Generate an avatar URL
 */
export function generateAvatarUrl(name: string): string {
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
export async function cleanupExpiredTokens(): Promise<{ refreshTokens: number; verificationTokens: number }> {
  const refreshTokens = await authProvider.deleteExpiredRefreshTokens();
  const verificationTokens = await authProvider.deleteExpiredVerificationTokens();
  return { refreshTokens, verificationTokens };
}
