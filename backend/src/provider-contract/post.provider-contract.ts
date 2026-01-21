import { Post, Like, Comment, User, PostVisibility } from '../generated/prisma/client.js';

// Types for paginated responses
export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// Post with author info
export interface PostWithAuthor extends Post {
  author: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>;
  isLiked?: boolean; // Will be set by service based on current user
}

// Comment with author info
export interface CommentWithAuthor extends Comment {
  author: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>;
}

// Like with user info
export interface LikeWithUser extends Like {
  user: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>;
}

export interface IPostProvider {
  // Post CRUD
  createPost(
    authorId: string,
    imageUrl: string,
    description: string | null,
    visibility: PostVisibility
  ): Promise<PostWithAuthor>;
  
  getPostById(id: string): Promise<PostWithAuthor | null>;
  
  getPostsByUser(
    userId: string,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResult<PostWithAuthor>>;
  
  getFriendsPosts(
    friendIds: string[],
    currentUserId: string,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResult<PostWithAuthor>>;
  
  getPublicPosts(
    excludeUserId: string,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResult<PostWithAuthor>>;
  
  softDeletePost(id: string): Promise<void>;
  
  // Likes - with atomic counter updates
  likePost(postId: string, userId: string): Promise<Like>;
  unlikePost(postId: string, userId: string): Promise<void>;
  getPostLikes(postId: string, cursor?: string, limit?: number): Promise<PaginatedResult<LikeWithUser>>;
  hasUserLikedPost(postId: string, userId: string): Promise<boolean>;
  
  // Comments - with atomic counter updates
  addComment(postId: string, authorId: string, content: string): Promise<CommentWithAuthor>;
  getPostComments(postId: string, cursor?: string, limit?: number): Promise<PaginatedResult<CommentWithAuthor>>;
  softDeleteComment(commentId: string): Promise<void>;
  getCommentById(id: string): Promise<CommentWithAuthor | null>;
}
