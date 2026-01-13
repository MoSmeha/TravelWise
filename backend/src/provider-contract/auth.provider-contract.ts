/**
 * Auth Provider Contract
 * Defines the interface for authentication-related data operations
 * This follows the Dependency Inversion Principle - controllers/services depend on this interface,
 * not on concrete implementations (like Prisma/PostgreSQL)
 */

// ============================================================================
// Input Types (for creating/updating data)
// ============================================================================
/**
 * Mirrors the EmailVerificationToken model from Prisma schema.
 * Keep in sync with: prisma/schema.prisma
 */

export interface EmailVerificationToken {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  username: string;
  avatarUrl: string;
}

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface CreateVerificationTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

// ============================================================================
// Output Types (what the provider returns)
// ============================================================================

/**
 * User response - excludes sensitive fields like passwordHash
 */
export interface UserResponse {
  id: string;
  email: string | null;
  name: string;
  username: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

/**
 * User with password hash - for authentication checks
 */
export interface UserWithPassword {
  id: string;
  email: string | null;
  name: string;
  username: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  passwordHash: string;
}

/**
 * Refresh token with associated user
 */
export interface RefreshTokenWithUser {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string | null;
  };
}

// ============================================================================
// Provider Contract Interface
// ============================================================================

export interface IAuthProvider {
  // -------------------------------------------------------------------------
  // User Operations
  // -------------------------------------------------------------------------
  
  /**
   * Find user by email address
   */
  findUserByEmail(email: string): Promise<UserWithPassword | null>;
  
  /**
   * Find user by username (case-insensitive)
   */
  findUserByUsername(username: string): Promise<{ id: string } | null>;
  
  /**
   * Find user by ID with public fields only
   */
  findUserById(id: string): Promise<UserResponse | null>;
  
  /**
   * Create a new user
   */
  createUser(data: CreateUserData): Promise<UserResponse>;
  
  /**
   * Update user's email verified status
   */
  updateUserEmailVerified(userId: string, verified: boolean): Promise<void>;

  // -------------------------------------------------------------------------
  // Refresh Token Operations
  // -------------------------------------------------------------------------
  
  /**
   * Create a new refresh token
   */
  createRefreshToken(data: CreateRefreshTokenData): Promise<void>;
  
  /**
   * Find refresh token by hash (includes user data)
   */
  findRefreshToken(tokenHash: string): Promise<RefreshTokenWithUser | null>;
  
  /**
   * Delete a refresh token by ID
   */
  deleteRefreshToken(id: string): Promise<void>;
  
  /**
   * Delete all expired refresh tokens (cleanup)
   */
  deleteExpiredRefreshTokens(): Promise<number>;

  // -------------------------------------------------------------------------
  // Email Verification Token Operations
  // -------------------------------------------------------------------------
  
  /**
   * Create a new verification token (deletes any existing for user first)
   */
  createVerificationToken(data: CreateVerificationTokenData): Promise<void>;
  
  /**
   * Find verification token by hash
   */
  findVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null>;
  
  /**
   * Delete a verification token by ID
   */
  deleteVerificationToken(id: string): Promise<void>;
  
  /**
   * Delete all verification tokens for a user
   */
  deleteUserVerificationTokens(userId: string): Promise<void>;
  
  /**
   * Delete all expired verification tokens (cleanup)
   */
  deleteExpiredVerificationTokens(): Promise<number>;
}
