export interface User {
  id: string;
  email?: string;
  name: string;
  username: string;
  phone?: string;
  avatarUrl?: string;
  emailVerified: boolean;  // Backend uses emailVerified, not isVerified
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterInput {
  email?: string;
  phone?: string;
  password: string;
  name: string;
  username: string;
}

export interface LoginInput {
  email?: string;
  phone?: string;
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
