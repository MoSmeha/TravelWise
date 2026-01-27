import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks, mockUser } from './setup.js';

vi.mock('../services/auth.service.js', () => ({
  register: vi.fn(),
  login: vi.fn(),
  rotateRefreshToken: vi.fn(),
  verifyEmailWithOTP: vi.fn(),
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
  generateVerificationOTP: vi.fn(),
}));

vi.mock('../services/email.service.js', () => ({
  sendVerificationEmail: vi.fn(),
  sendWelcomeEmail: vi.fn(),
}));

import { register, login, refresh, me } from '../controllers/auth.controller.js';
import {
  register as registerService,
  login as loginService,
  rotateRefreshToken,
  getUserById
} from '../services/auth.service.js';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
} from '../errors/auth.errors.js';

describe('Auth Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new user', async () => {
      const { req, res } = createMockContext();
      req.body = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
        username: 'newuser',
      };

      vi.mocked(registerService).mockResolvedValue({
        user: { ...mockUser, email: 'newuser@example.com' },
        verificationOTP: '123456',
      });

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 409 for duplicate email', async () => {
      const { req, res } = createMockContext();
      req.body = { email: 'existing@example.com', password: 'SecurePass123!', name: 'Test', username: 'testuser' };

      vi.mocked(registerService).mockRejectedValue(new UserAlreadyExistsError('Email already registered'));

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const { req, res } = createMockContext();
      req.body = { email: 'test@example.com', password: 'Password123!' };

      vi.mocked(loginService).mockResolvedValue({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-456',
        user: mockUser,
      });

      await login(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Login successful' }));
    });

    it('should return 401 for invalid credentials', async () => {
      const { req, res } = createMockContext();
      req.body = { email: 'test@example.com', password: 'wrongpassword' };

      vi.mocked(loginService).mockRejectedValue(new InvalidCredentialsError());

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 for unverified email', async () => {
      const { req, res } = createMockContext();
      req.body = { email: 'unverified@example.com', password: 'Password123!' };

      vi.mocked(loginService).mockRejectedValue(new EmailNotVerifiedError());

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should successfully refresh tokens', async () => {
      const { req, res } = createMockContext();
      req.body = { refreshToken: 'valid-refresh-token' };

      vi.mocked(rotateRefreshToken).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      await refresh(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Token refreshed successfully' }));
    });

    it('should return 401 for invalid refresh token', async () => {
      const { req, res } = createMockContext();
      req.body = { refreshToken: 'invalid-token' };

      vi.mocked(rotateRefreshToken).mockResolvedValue(null);

      await refresh(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user when authenticated', async () => {
      const { req, res } = createMockContext();
      req.user = { userId: mockUser.id };

      vi.mocked(getUserById).mockResolvedValue(mockUser);

      await me(req, res);

      expect(res.json).toHaveBeenCalledWith({ user: mockUser });
    });

    it('should return 401 when not authenticated', async () => {
      const { req, res } = createMockContext();
      req.user = undefined;

      await me(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
