import { PostVisibility } from '../generated/prisma/client.js';
import { postProvider } from '../providers/post.provider.pg.js';
import { friendshipProvider } from '../providers/friendship.provider.pg.js';
import { createNotification } from './notification.service.js';
import { uploadToCloudinary } from '../config/cloudinary.js';
import {
  PostWithAuthor,
  PaginatedResult,
  CommentWithAuthor,
  LikeWithUser,
} from '../provider-contract/post.provider-contract.js';

/**
 * Create a new post with image upload to Cloudinary
 */
export async function createPost(
  authorId: string,
  imageBuffer: Buffer,
  description: string | null,
  visibility: PostVisibility = 'FRIENDS'
): Promise<PostWithAuthor> {
  // Upload image to Cloudinary
  const result = await uploadToCloudinary(imageBuffer, 'travelwise/posts');
  
  // Create post in database
  const post = await postProvider.createPost(
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
export async function getPostById(postId: string, currentUserId: string): Promise<PostWithAuthor | null> {
  const post = await postProvider.getPostById(postId);
  if (!post) return null;

  const isLiked = await postProvider.hasUserLikedPost(postId, currentUserId);
  return { ...post, isLiked };
}

/**
 * Get posts by a specific user
 */
export async function getPostsByUser(
  userId: string,
  currentUserId: string,
  cursor?: string,
  limit?: number
): Promise<PaginatedResult<PostWithAuthor>> {
  const result = await postProvider.getPostsByUser(userId, cursor, limit);
  
  // Add isLiked status for each post
  const postsWithLikeStatus = await Promise.all(
    result.data.map(async (post) => {
      const isLiked = await postProvider.hasUserLikedPost(post.id, currentUserId);
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
export async function getFriendsFeed(
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

  const result = await postProvider.getFriendsPosts(friendIds, userId, cursor, limit);
  
  // Add isLiked status for each post
  const postsWithLikeStatus = await Promise.all(
    result.data.map(async (post) => {
      const isLiked = await postProvider.hasUserLikedPost(post.id, userId);
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
export async function getPublicFeed(
  userId: string,
  cursor?: string,
  limit?: number
): Promise<PaginatedResult<PostWithAuthor>> {
  const result = await postProvider.getPublicPosts(userId, cursor, limit);
  
  // Add isLiked status for each post
  const postsWithLikeStatus = await Promise.all(
    result.data.map(async (post) => {
      const isLiked = await postProvider.hasUserLikedPost(post.id, userId);
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
export async function deletePost(postId: string, userId: string): Promise<void> {
  const post = await postProvider.getPostById(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }

  if (post.authorId !== userId) {
    throw new Error('Unauthorized to delete this post');
  }

  await postProvider.softDeletePost(postId);
}

/**
 * Like a post and create notification
 */
export async function likePost(postId: string, userId: string): Promise<void> {
  const post = await postProvider.getPostById(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }

  // Check if already liked
  const alreadyLiked = await postProvider.hasUserLikedPost(postId, userId);
  if (alreadyLiked) {
    throw new Error('Already liked this post');
  }

  // Create like
  await postProvider.likePost(postId, userId);

  // Create notification for post author (if not self-like)
  if (post.authorId !== userId) {
    await createNotification(
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
export async function unlikePost(postId: string, userId: string): Promise<void> {
  const post = await postProvider.getPostById(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }

  // Check if user has liked the post
  const hasLiked = await postProvider.hasUserLikedPost(postId, userId);
  if (!hasLiked) {
    throw new Error('You have not liked this post');
  }

  await postProvider.unlikePost(postId, userId);
}

/**
 * Get likes for a post
 */
export async function getPostLikes(
  postId: string,
  cursor?: string,
  limit?: number
): Promise<PaginatedResult<LikeWithUser>> {
  return postProvider.getPostLikes(postId, cursor, limit);
}

/**
 * Add a comment to a post and create notification
 */
export async function addComment(
  postId: string,
  authorId: string,
  content: string
): Promise<CommentWithAuthor> {
  const post = await postProvider.getPostById(postId);
  
  if (!post) {
    throw new Error('Post not found');
  }

  // Create comment
  const comment = await postProvider.addComment(postId, authorId, content);

  // Create notification for post author (if not self-comment)
  if (post.authorId !== authorId) {
    await createNotification(
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
export async function getPostComments(
  postId: string,
  cursor?: string,
  limit?: number
): Promise<PaginatedResult<CommentWithAuthor>> {
  return postProvider.getPostComments(postId, cursor, limit);
}

/**
 * Delete a comment (soft delete)
 */
export async function deleteComment(commentId: string, userId: string): Promise<void> {
  const comment = await postProvider.getCommentById(commentId);
  
  if (!comment) {
    throw new Error('Comment not found');
  }

  // Can delete if you're the comment author or the post author
  const post = await postProvider.getPostById(comment.postId);
  if (comment.authorId !== userId && post?.authorId !== userId) {
    throw new Error('Unauthorized to delete this comment');
  }

  await postProvider.softDeleteComment(commentId);
}
