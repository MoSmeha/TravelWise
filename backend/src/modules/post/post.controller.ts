import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware.js';
import {
  createPost as createNewPost,
  getFriendsFeed as fetchFriendsFeed,
  getPublicFeed as fetchPublicFeed,
  getPostsByUser as fetchUserPosts,
  getPostById as fetchPostById,
  deletePost as removePost,
  likePost as like,
  unlikePost as unlike,
  getPostLikes as fetchPostLikes,
  addComment as createComment,
  getPostComments as fetchPostComments,
  deleteComment as removeComment,
} from './post.service.js';
import { PostVisibility } from '../../generated/prisma/client.js';


export async function createPost(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { description, visibility } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const post = await createNewPost(
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


export async function getFeed(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { cursor, limit } = req.query;

    const result = await fetchFriendsFeed(
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


export async function getPublicFeed(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { cursor, limit } = req.query;

    const result = await fetchPublicFeed(
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


export async function getUserPosts(req: AuthRequest, res: Response) {
  try {
    const currentUserId = req.user!.userId;
    const { userId } = req.params;
    const { cursor, limit } = req.query;

    const result = await fetchUserPosts(
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


export async function getPost(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const post = await fetchPostById(id, userId);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    return res.json({ data: post });
  } catch (error: any) {
    console.error('[PostController] Error getting post:', error);
    return res.status(500).json({ error: 'Failed to get post' });
  }
}


export async function deletePost(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await removePost(id, userId);
    
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


export async function likePost(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await like(id, userId);
    
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


export async function unlikePost(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await unlike(id, userId);
    
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


export async function getPostLikes(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { cursor, limit } = req.query;

    const result = await fetchPostLikes(
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


export async function addComment(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { content } = req.body;

    const comment = await createComment(id, userId, content);
    
    return res.status(201).json({ data: comment });
  } catch (error: any) {
    console.error('[PostController] Error adding comment:', error);
    if (error.message === 'Post not found') {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Failed to add comment' });
  }
}


export async function getPostComments(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const { cursor, limit } = req.query;

    const result = await fetchPostComments(
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


export async function deleteComment(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.userId;
    const { commentId } = req.params;

    await removeComment(commentId, userId);
    
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
