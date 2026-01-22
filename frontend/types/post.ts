/**
 * Post-related type definitions
 */

export type PostVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';

export interface PostAuthor {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface Post {
  id: string;
  authorId: string;
  author: PostAuthor;
  imageUrl: string;
  description?: string | null;
  visibility: PostVisibility;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: PostAuthor;
  content: string;
  createdAt: string;
}

export interface LikeUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

export interface Like {
  postId: string;
  userId: string;
  user: LikeUser;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreatePostInput {
  description?: string;
  visibility?: PostVisibility;
}
