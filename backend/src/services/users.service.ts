import { User } from '../generated/prisma/client.js';
import { userProvider } from '../providers/user.provider.pg.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import { IUserProvider } from '../provider-contract/user.provider-contract.js';

class UsersService {
  private provider: IUserProvider;

  constructor(provider: IUserProvider = userProvider) {
    this.provider = provider;
  }

  async getUserById(userId: string): Promise<User | null> {
    return this.provider.findById(userId);
  }

  /**
   * Update user's avatar by uploading to Cloudinary
   * @param userId - The user's ID
   * @param imageBuffer - The image file buffer
   * @returns Updated user with new avatar URL
   */
  async updateAvatar(userId: string, imageBuffer: Buffer): Promise<User> {
    // Upload to Cloudinary with user-specific folder
    const result = await uploadToCloudinary(
      imageBuffer,
      'travelwise/avatars',
      `user_${userId}` // Use consistent public_id for overwriting
    );

    // Update user's avatar URL in database
    return this.provider.updateAvatar(userId, result.secure_url);
  }

  /**
   * Get sanitized user data (without sensitive fields)
   */
  sanitizeUser(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

export const usersService = new UsersService();
