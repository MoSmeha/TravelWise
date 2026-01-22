import { User } from '../generated/prisma/client.js';
import { userProvider } from '../providers/user.provider.pg.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

/**
 * Get user by ID using provider
 */
export async function getUserById(userId: string): Promise<User | null> {
  return await userProvider.findById(userId);
}

/**
 * Update user's avatar by uploading to Cloudinary
 * @param userId - The user's ID
 * @param imageBuffer - The image file buffer
 * @returns Updated user with new avatar URL
 */
export async function updateAvatar(userId: string, imageBuffer: Buffer): Promise<User> {
  // Upload to Cloudinary with user-specific folder
  const result = await uploadToCloudinary(
    imageBuffer,
    'travelwise/avatars',
    `user_${userId}` // Use consistent public_id for overwriting
  );

  // Update user's avatar URL in database
  return await userProvider.updateAvatar(userId, result.secure_url);
}

/**
 * Get sanitized user data (without sensitive fields)
 */
export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}
