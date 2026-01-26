import { Post, Like, Comment, User, PostVisibility } from '../generated/prisma/client.js';


export interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}


export interface PostWithAuthor extends Post {
  author: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>;
  isLiked?: boolean;
}


export interface CommentWithAuthor extends Comment {
  author: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>;
}


export interface LikeWithUser extends Like {
  user: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>;
}

export interface IPostProvider {
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
  

  likePost(postId: string, userId: string): Promise<Like>;
  unlikePost(postId: string, userId: string): Promise<void>;
  getPostLikes(postId: string, cursor?: string, limit?: number): Promise<PaginatedResult<LikeWithUser>>;
  hasUserLikedPost(postId: string, userId: string): Promise<boolean>;
  

  addComment(postId: string, authorId: string, content: string): Promise<CommentWithAuthor>;
  getPostComments(postId: string, cursor?: string, limit?: number): Promise<PaginatedResult<CommentWithAuthor>>;
  softDeleteComment(commentId: string): Promise<void>;
  getCommentById(id: string): Promise<CommentWithAuthor | null>;
}
