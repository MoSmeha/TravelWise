
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


export interface UserResponse {
  id: string;
  email: string | null;
  name: string;
  username: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  createdAt: Date;
}

export interface UserWithPassword {
  id: string;
  email: string | null;
  name: string;
  username: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  passwordHash: string;
}

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


export interface IAuthProvider {
  
  findUserByEmail(email: string): Promise<UserWithPassword | null>;
  
  findUserByUsername(username: string): Promise<{ id: string } | null>;
  
  findUserById(id: string): Promise<UserResponse | null>;
  
  createUser(data: CreateUserData): Promise<UserResponse>;
  
  updateUserEmailVerified(userId: string, verified: boolean): Promise<void>;

  
  createRefreshToken(data: CreateRefreshTokenData): Promise<void>;
  
  findRefreshToken(tokenHash: string): Promise<RefreshTokenWithUser | null>;
  
  deleteRefreshToken(id: string): Promise<void>;
  
  deleteExpiredRefreshTokens(): Promise<number>;

  
  createVerificationToken(data: CreateVerificationTokenData): Promise<void>;
  
  findVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null>;
  
  deleteVerificationToken(id: string): Promise<void>;
  
  deleteUserVerificationTokens(userId: string): Promise<void>;
  
  deleteExpiredVerificationTokens(): Promise<number>;
}
