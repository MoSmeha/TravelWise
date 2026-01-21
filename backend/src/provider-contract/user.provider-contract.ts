import { User } from '../generated/prisma/client.js';

export interface IUserProvider {
  findById(userId: string): Promise<User | null>;
  updateAvatar(userId: string, avatarUrl: string): Promise<User>;
  updateUser(userId: string, data: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<User>;
}
