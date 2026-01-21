import { PostVisibility } from '../generated/prisma/client.js';
import { postProvider } from '../providers/post.provider.pg.js';
import { friendshipProvider } from '../providers/friendship.provider.pg.js';
import { notificationService } from './notification.service.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import {
  IPostProvider,
  PostWithAuthor,
  PaginatedResult,
  CommentWithAuthor,
  LikeWithUser,
} from '../provider-contract/post.provider-contract.js';

class PostService {
  private provider: IPostProvider;

  constructor(provider: IPostProvider = postProvider) {
    this.provider = provider;
  }

  /**
   * Create a new post with image upload to Cloudinary
   */
  async createPost(
    authorId: string,
    imageBuffer: Buffer,
    description: string | null,
    visibility: PostVisibility = 'FRIENDS'
  ): Promise<PostWithAuthor> {
    // Upload image to Cloudinary
    const result = await uploadToCloudinary(imageBuffer, 'travelwise/posts');
    
    // Create post in database
    const post = await this.provider.createPost(
      authorId,
      result.secure_url,
      description,
      visibility
    );

    return { ...post, isLiked: false };
  }

  /**
   * Get a post by ID with isLiked status for current user
   */
  async getPostById(postId: string, currentUserId: string): Promise<PostWithAuthor | null> {
    const post = await this.provider.getPostById(postId);
    if (!post) return null;

    const isLiked = await this.provider.hasUserLikedPost(postId, currentUserId);
    return { ...post, isLiked };
  }

  /**
   * Get posts by a specific user
   */
  async getPostsByUser(
    userId: string,
    currentUserId: string,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResult<PostWithAuthor>> {
    const result = await this.provider.getPostsByUser(userId, cursor, limit);
    
    // Add isLiked status for each post
    const postsWithLikeStatus = await Promise.all(
      result.data.map(async (post) => {
        const isLiked = await this.provider.hasUserLikedPost(post.id, currentUserId);
        return { ...post, isLiked };
      })
    );

    return {
      ...result,
      data: postsWithLikeStatus,
    };
  }

  /**
   * Get friends' posts feed
   * Only returns posts from accepted friends with FRIENDS or PUBLIC visibility
   */
  async getFriendsFeed(
    userId: string,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResult<PostWithAuthor>> {
    // Get list of accepted friends
    const friends = await friendshipProvider.getFriends(userId);
    const friendIds = friends.map((friend) => friend.id);

    if (friendIds.length === 0) {
      return { data: [], nextCursor: null, hasMore: false };
    }

    const result = await this.provider.getFriendsPosts(friendIds, userId, cursor, limit);
    
    // Add isLiked status for each post
    const postsWithLikeStatus = await Promise.all(
      result.data.map(async (post) => {
        const isLiked = await this.provider.hasUserLikedPost(post.id, userId);
        return { ...post, isLiked };
      })
    );

    return {
      ...result,
      data: postsWithLikeStatus,
    };
  }

  /**
   * Get public posts feed (discover feed)
   * Returns all PUBLIC posts from all users except current user
   */
  async getPublicFeed(
    userId: string,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResult<PostWithAuthor>> {
    const result = await this.provider.getPublicPosts(userId, cursor, limit);
    
    // Add isLiked status for each post
    const postsWithLikeStatus = await Promise.all(
      result.data.map(async (post) => {
        const isLiked = await this.provider.hasUserLikedPost(post.id, userId);
        return { ...post, isLiked };
      })
    );

    return {
      ...result,
      data: postsWithLikeStatus,
    };
  }

  /**
   * Delete a post (soft delete)
   */
  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.provider.getPostById(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }

    if (post.authorId !== userId) {
      throw new Error('Unauthorized to delete this post');
    }

    await this.provider.softDeletePost(postId);
  }

  /**
   * Like a post and create notification
   */
  async likePost(postId: string, userId: string): Promise<void> {
    const post = await this.provider.getPostById(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }

    // Check if already liked
    const alreadyLiked = await this.provider.hasUserLikedPost(postId, userId);
    if (alreadyLiked) {
      throw new Error('Already liked this post');
    }

    // Create like
    await this.provider.likePost(postId, userId);

    // Create notification for post author (if not self-like)
    if (post.authorId !== userId) {
      await notificationService.createNotification(
        post.authorId,
        'POST_LIKE',
        'New Like',
        'Someone liked your post',
        { postId },
        postId,
        undefined
      );
    }
  }

  /**
   * Unlike a post
   */
  async unlikePost(postId: string, userId: string): Promise<void> {
    const post = await this.provider.getPostById(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }

    // Check if user has liked the post
    const hasLiked = await this.provider.hasUserLikedPost(postId, userId);
    if (!hasLiked) {
      throw new Error('You have not liked this post');
    }

    await this.provider.unlikePost(postId, userId);
  }

  /**
   * Get likes for a post
   */
  async getPostLikes(
    postId: string,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResult<LikeWithUser>> {
    return this.provider.getPostLikes(postId, cursor, limit);
  }

  /**
   * Add a comment to a post and create notification
   */
  async addComment(
    postId: string,
    authorId: string,
    content: string
  ): Promise<CommentWithAuthor> {
    const post = await this.provider.getPostById(postId);
    
    if (!post) {
      throw new Error('Post not found');
    }

    // Create comment
    const comment = await this.provider.addComment(postId, authorId, content);

    // Create notification for post author (if not self-comment)
    if (post.authorId !== authorId) {
      await notificationService.createNotification(
        post.authorId,
        'POST_COMMENT',
        'New Comment',
        'Someone commented on your post',
        { postId, commentId: comment.id },
        postId,
        comment.id
      );
    }

    return comment;
  }

  /**
   * Get comments for a post
   */
  async getPostComments(
    postId: string,
    cursor?: string,
    limit?: number
  ): Promise<PaginatedResult<CommentWithAuthor>> {
    return this.provider.getPostComments(postId, cursor, limit);
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.provider.getCommentById(commentId);
    
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Can delete if you're the comment author or the post author
    const post = await this.provider.getPostById(comment.postId);
    if (comment.authorId !== userId && post?.authorId !== userId) {
      throw new Error('Unauthorized to delete this comment');
    }

    await this.provider.softDeleteComment(commentId);
  }
}

export const postService = new PostService();
