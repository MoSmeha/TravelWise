import { EmailVerificationToken } from '../generated/prisma/client.js';
import prisma from '../lib/prisma.js';
import {
  CreateRefreshTokenData,
  CreateUserData,
  CreateVerificationTokenData,
  IAuthProvider,
  RefreshTokenWithUser,
  UserResponse,
  UserWithPassword,
} from '../provider-contract/auth.provider-contract.js';

class AuthPgProvider implements IAuthProvider {
  async findUserByEmail(email: string): Promise<UserWithPassword | null> {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        emailVerified: true,
        passwordHash: true,
      },
    });
  }

  async findUserByUsername(username: string): Promise<{ id: string } | null> {
    return prisma.user.findUnique({
      where: { username: username.toLowerCase() },
      select: { id: true },
    });
  }

  async findUserById(id: string): Promise<UserResponse | null> {
    return prisma.user.findUnique({
      where: { id },
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
  }

  async createUser(data: CreateUserData): Promise<UserResponse> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        name: data.name,
        username: data.username.toLowerCase(),
        avatarUrl: data.avatarUrl,
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
  }

  async updateUserEmailVerified(userId: string, verified: boolean): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { emailVerified: verified },
    });
  }

  async createRefreshToken(data: CreateRefreshTokenData): Promise<void> {
    await prisma.refreshToken.create({
      data: {
        tokenHash: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findRefreshToken(tokenHash: string): Promise<RefreshTokenWithUser | null> {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  }

  async deleteRefreshToken(id: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { id },
    });
  }

  async deleteExpiredRefreshTokens(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  // -------------------------------------------------------------------------
  // Email Verification Token Operations
  // -------------------------------------------------------------------------

  async createVerificationToken(data: CreateVerificationTokenData): Promise<void> {
    // First delete any existing tokens for this user
    await this.deleteUserVerificationTokens(data.userId);
    
    await prisma.emailVerificationToken.create({
      data: {
        tokenHash: data.tokenHash,
        userId: data.userId,
        expiresAt: data.expiresAt,
      },
    });
  }

  async findVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null> {
    return prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
  }

  async deleteVerificationToken(id: string): Promise<void> {
    await prisma.emailVerificationToken.delete({
      where: { id },
    });
  }

  async deleteUserVerificationTokens(userId: string): Promise<void> {
    await prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });
  }

  async deleteExpiredVerificationTokens(): Promise<number> {
    const result = await prisma.emailVerificationToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }
}

export const authProvider = new AuthPgProvider();

export { AuthPgProvider };
