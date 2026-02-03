import { User } from '../../generated/prisma/client.js';
import { userProvider } from './user.provider.js';
import { uploadToCloudinary } from '../shared/config/cloudinary.js';


export async function getUserById(userId: string): Promise<User | null> {
  return await userProvider.findById(userId);
}


export async function updateAvatar(userId: string, imageBuffer: Buffer): Promise<User> {

  const result = await uploadToCloudinary(
    imageBuffer,
    'travelwise/avatars',
    `user_${userId}` // Use consistent public_id for overwriting
  );


  return await userProvider.updateAvatar(userId, result.secure_url);
}


export function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}
