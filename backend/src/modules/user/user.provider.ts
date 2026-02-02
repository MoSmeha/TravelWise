import { User } from '../../generated/prisma/client.js';
import prisma from '../../lib/prisma.js';
import { IUserProvider } from './user.contract.js';

export class PostgresUserProvider implements IUserProvider {
  async findById(userId: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async updateAvatar(userId: string, avatarUrl: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
    });
  }

  async updateUser(userId: string, data: Partial<Pick<User, 'name' | 'avatarUrl'>>): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}

export const userProvider = new PostgresUserProvider();
