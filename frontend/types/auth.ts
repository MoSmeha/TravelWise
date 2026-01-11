export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl?: string;
  emailVerified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  username: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string; // Access Token
  refreshToken: string;
}

// Registration response (no tokens - email verification required)
export interface RegisterResponse {
  message: string;
  user: User;
}

export interface VerifyEmailInput {
  token: string;
}

export interface ResendVerificationInput {
  email: string;
}
