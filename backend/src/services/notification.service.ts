import prisma from '../lib/prisma.js';
import { NotificationType } from '../generated/prisma/client.js';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  postId?: string;
  commentId?: string;
  friendshipId?: string;
  accepterId?: string;
  requesterId?: string;
}

/**
 * Create a new notification
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: any,
  postId?: string,
  commentId?: string
) {
  // Check if we should group notifications (e.g. multiple likes on same post)
  // For now, simple implementation
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data || {},
      postId,
      commentId,
      read: false,
    },
  });
}

/**
 * Get notifications for a user
 */
export async function getNotifications(
  userId: string,
  unreadOnly: boolean = false,
  page: number = 1,
  limit: number = 20
) {
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(unreadOnly ? { read: false } : {}),
  };

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        post: {
          select: {
            id: true,
            imageUrl: true,
          }
        },
        comment: {
            select: {
                id: true,
                content: true
            }
        }
      }
    }),
    prisma.notification.count({
      where,
    }),
  ]);

  return {
    data: notifications,
    pagination: {
      page,
      limit,
      total,
      hasMore: skip + notifications.length < total,
    },
  };
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== userId) {
    throw new Error('Notification not found or unauthorized');
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      userId,
      read: false,
    },
    data: { read: true },
  });
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}
