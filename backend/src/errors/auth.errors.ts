import { AppError } from '../utils/AppError.js';

export class UserAlreadyExistsError extends AppError {
  constructor(message = 'User already exists') {
    super(message, 409);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = 'Invalid credentials') {
    super(message, 401);
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message = 'Email not verified') {
    super(message, 403);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message = 'Invalid or expired token') {
    super(message, 401);
  }
}
