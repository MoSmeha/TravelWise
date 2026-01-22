import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware.js';
import {
  createPost,
  getFriendsFeed,
  getPublicFeed,
  getPostsByUser,
  getPostById,
  deletePost,
  likePost,
  unlikePost,
  getPostLikes,
  addComment,
  getPostComments,
  deleteComment,
} from '../services/post.service.js';
import { PostVisibility } from '../generated/prisma/client.js';

export class PostController {
  /**
   * Create a new post
   * POST /api/posts
   * Expects multipart/form-data with 'image' field
   */
  static async createPost(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { description, visibility } = req.body;

      if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
      }

      const post = await createPost(
        userId,
        req.file.buffer,
        description || null,
        (visibility as PostVisibility) || 'FRIENDS'
      );

      return res.status(201).json({ data: post });
    } catch (error: any) {
      console.error('[PostController] Error creating post:', error);
      return res.status(500).json({ error: 'Failed to create post' });
    }
  }

  /**
   * Get friends' posts feed
   * GET /api/posts/feed
   */
  static async getFeed(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { cursor, limit } = req.query;

      const result = await getFriendsFeed(
        userId,
        cursor as string | undefined,
        limit ? parseInt(limit as string, 10) : undefined
      );

      return res.json(result);
    } catch (error: any) {
      console.error('[PostController] Error getting feed:', error);
      return res.status(500).json({ error: 'Failed to get feed' });
    }
  }

  /**
   * Get public posts feed (discover)
   * GET /api/posts/discover
   */
  static async getPublicFeed(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { cursor, limit } = req.query;

      const result = await getPublicFeed(
        userId,
        cursor as string | undefined,
        limit ? parseInt(limit as string, 10) : undefined
      );

      return res.json(result);
    } catch (error: any) {
      console.error('[PostController] Error getting public feed:', error);
      return res.status(500).json({ error: 'Failed to get public feed' });
    }
  }

  /**
   * Get posts by a specific user
   * GET /api/posts/user/:userId
   */
  static async getUserPosts(req: AuthRequest, res: Response) {
    try {
      const currentUserId = req.user!.userId;
      const { userId } = req.params;
      const { cursor, limit } = req.query;

      const result = await getPostsByUser(
        userId,
        currentUserId,
        cursor as string | undefined,
        limit ? parseInt(limit as string, 10) : undefined
      );

      return res.json(result);
    } catch (error: any) {
      console.error('[PostController] Error getting user posts:', error);
      return res.status(500).json({ error: 'Failed to get posts' });
    }
  }

  /**
   * Get a specific post
   * GET /api/posts/:id
   */
  static async getPost(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const post = await getPostById(id, userId);
      
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }

      return res.json({ data: post });
    } catch (error: any) {
      console.error('[PostController] Error getting post:', error);
      return res.status(500).json({ error: 'Failed to get post' });
    }
  }

  /**
   * Delete a post
   * DELETE /api/posts/:id
   */
  static async deletePost(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await deletePost(id, userId);
      
      return res.json({ message: 'Post deleted successfully' });
    } catch (error: any) {
      console.error('[PostController] Error deleting post:', error);
      if (error.message === 'Post not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Unauthorized to delete this post') {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to delete post' });
    }
  }

  /**
   * Like a post
   * POST /api/posts/:id/like
   */
  static async likePost(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await likePost(id, userId);
      
      return res.json({ message: 'Post liked successfully' });
    } catch (error: any) {
      console.error('[PostController] Error liking post:', error);
      if (error.message === 'Post not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Already liked this post') {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to like post' });
    }
  }

  /**
   * Unlike a post
   * DELETE /api/posts/:id/like
   */
  static async unlikePost(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      await unlikePost(id, userId);
      
      return res.json({ message: 'Post unliked successfully' });
    } catch (error: any) {
      console.error('[PostController] Error unliking post:', error);
      if (error.message === 'Post not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'You have not liked this post') {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to unlike post' });
    }
  }

  /**
   * Get likes for a post
   * GET /api/posts/:id/likes
   */
  static async getPostLikes(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { cursor, limit } = req.query;

      const result = await getPostLikes(
        id,
        cursor as string | undefined,
        limit ? parseInt(limit as string, 10) : undefined
      );

      return res.json(result);
    } catch (error: any) {
      console.error('[PostController] Error getting likes:', error);
      return res.status(500).json({ error: 'Failed to get likes' });
    }
  }

  /**
   * Add a comment to a post
   * POST /api/posts/:id/comments
   */
  static async addComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { content } = req.body;

      const comment = await addComment(id, userId, content);
      
      return res.status(201).json({ data: comment });
    } catch (error: any) {
      console.error('[PostController] Error adding comment:', error);
      if (error.message === 'Post not found') {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to add comment' });
    }
  }

  /**
   * Get comments for a post
   * GET /api/posts/:id/comments
   */
  static async getPostComments(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { cursor, limit } = req.query;

      const result = await getPostComments(
        id,
        cursor as string | undefined,
        limit ? parseInt(limit as string, 10) : undefined
      );

      return res.json(result);
    } catch (error: any) {
      console.error('[PostController] Error getting comments:', error);
      return res.status(500).json({ error: 'Failed to get comments' });
    }
  }

  /**
   * Delete a comment
   * DELETE /api/posts/:id/comments/:commentId
   */
  static async deleteComment(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.userId;
      const { commentId } = req.params;

      await deleteComment(commentId, userId);
      
      return res.json({ message: 'Comment deleted successfully' });
    } catch (error: any) {
      console.error('[PostController] Error deleting comment:', error);
      if (error.message === 'Comment not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Unauthorized to delete this comment') {
        return res.status(403).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to delete comment' });
    }
  }
}
