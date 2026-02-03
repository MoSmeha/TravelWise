import { Like, PostVisibility } from '../../generated/prisma/client.js';
import prisma from '../shared/lib/prisma.js';
import {
  IPostProvider,
  PostWithAuthor,
  CommentWithAuthor,
  LikeWithUser,
  PaginatedResult,
} from './post.contract.js';

const DEFAULT_LIMIT = 10;


const authorSelect = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
};

export class PostgresPostProvider implements IPostProvider {


  async createPost(
    authorId: string,
    imageUrl: string,
    description: string | null,
    visibility: PostVisibility
  ): Promise<PostWithAuthor> {
    return prisma.post.create({
      data: {
        authorId,
        imageUrl,
        description,
        visibility,
      },
      include: {
        author: { select: authorSelect },
      },
    });
  }

  async getPostById(id: string): Promise<PostWithAuthor | null> {
    return prisma.post.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        author: { select: authorSelect },
      },
    });
  }

  async getPostsByUser(
    userId: string,
    cursor?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<PaginatedResult<PostWithAuthor>> {
    const posts = await prisma.post.findMany({
      where: {
        authorId: userId,
        deletedAt: null,
      },
      include: {
        author: { select: authorSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

    return { data, nextCursor, hasMore };
  }

  async getFriendsPosts(
    friendIds: string[],
    _currentUserId: string,
    cursor?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<PaginatedResult<PostWithAuthor>> {
    if (friendIds.length === 0) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: friendIds },
        visibility: { in: ['FRIENDS', 'PUBLIC'] },
        deletedAt: null,
      },
      include: {
        author: { select: authorSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

    return { data, nextCursor, hasMore };
  }

  async getPublicPosts(
    excludeUserId: string,
    cursor?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<PaginatedResult<PostWithAuthor>> {
    const posts = await prisma.post.findMany({
      where: {
        visibility: 'PUBLIC',
        deletedAt: null,
        authorId: { not: excludeUserId },
      },
      include: {
        author: { select: authorSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = posts.length > limit;
    const data = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

    return { data, nextCursor, hasMore };
  }

  async softDeletePost(id: string): Promise<void> {
    await prisma.post.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }



  async likePost(postId: string, userId: string): Promise<Like> {

    const [like] = await prisma.$transaction([
      prisma.like.create({
        data: { postId, userId },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
    return like;
  }

  async unlikePost(postId: string, userId: string): Promise<void> {

    await prisma.$transaction([
      prisma.like.delete({
        where: {
          postId_userId: { postId, userId },
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);
  }

  async getPostLikes(
    postId: string,
    cursor?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<PaginatedResult<LikeWithUser>> {

    const likes = await prisma.like.findMany({
      where: { postId },
      include: {
        user: { select: authorSelect },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor && {
        cursor: {
          postId_userId: {
            postId,
            userId: cursor,
          },
        },
        skip: 1,
      }),
    });

    const hasMore = likes.length > limit;
    const data = hasMore ? likes.slice(0, limit) : likes;
    const nextCursor = hasMore ? data[data.length - 1]?.userId ?? null : null;

    return { data, nextCursor, hasMore };
  }

  async hasUserLikedPost(postId: string, userId: string): Promise<boolean> {
    const like = await prisma.like.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });
    return like !== null;
  }



  async addComment(
    postId: string,
    authorId: string,
    content: string
  ): Promise<CommentWithAuthor> {

    const [comment] = await prisma.$transaction([
      prisma.comment.create({
        data: { postId, authorId, content },
        include: {
          author: { select: authorSelect },
        },
      }),
      prisma.post.update({
        where: { id: postId },
        data: { commentsCount: { increment: 1 } },
      }),
    ]);
    return comment;
  }

  async getPostComments(
    postId: string,
    cursor?: string,
    limit: number = DEFAULT_LIMIT
  ): Promise<PaginatedResult<CommentWithAuthor>> {
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        deletedAt: null,
      },
      include: {
        author: { select: authorSelect },
      },
      orderBy: { createdAt: 'asc' },
      take: limit + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasMore = comments.length > limit;
    const data = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? data[data.length - 1]?.id ?? null : null;

    return { data, nextCursor, hasMore };
  }

  async softDeleteComment(commentId: string): Promise<void> {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (comment) {
      await prisma.$transaction([
        prisma.comment.update({
          where: { id: commentId },
          data: { deletedAt: new Date() },
        }),
        prisma.post.update({
          where: { id: comment.postId },
          data: { commentsCount: { decrement: 1 } },
        }),
      ]);
    }
  }

  async getCommentById(id: string): Promise<CommentWithAuthor | null> {
    return prisma.comment.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        author: { select: authorSelect },
      },
    });
  }
}

export const postProvider = new PostgresPostProvider();
