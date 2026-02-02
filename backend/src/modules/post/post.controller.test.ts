import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockContext, resetAllMocks } from '../../tests/setup.js';

vi.mock('./post.service.js', () => ({
  createPost: vi.fn(),
  getFriendsFeed: vi.fn(),
  getPublicFeed: vi.fn(),
  getPostsByUser: vi.fn(),
  getPostById: vi.fn(),
  deletePost: vi.fn(),
  likePost: vi.fn(),
  unlikePost: vi.fn(),
  getPostLikes: vi.fn(),
  addComment: vi.fn(),
  getPostComments: vi.fn(),
  deleteComment: vi.fn(),
}));

import * as PostController from './post.controller.js';
import * as postService from './post.service.js';

const mockPost = { id: 'post-123', userId: 'user-123', imageUrl: 'https://example.com/img.jpg' };

describe('Post Controller', () => {
  beforeEach(() => {
    resetAllMocks();
  });

  describe('POST /api/posts', () => {
    it('should create a post', async () => {
      const { req, res } = createMockContext();
      req.body = { description: 'Test' };
      req.file = { buffer: Buffer.from('test') } as any;

      vi.mocked(postService.createPost).mockResolvedValue(mockPost as any);

      await PostController.createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should return 400 when no image', async () => {
      const { req, res } = createMockContext();
      req.body = { description: 'Test' };

      await PostController.createPost(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /api/posts/feed', () => {
    it('should return feed', async () => {
      const { req, res } = createMockContext();
      req.query = {};

      vi.mocked(postService.getFriendsFeed).mockResolvedValue({ data: [], nextCursor: null } as any);

      await PostController.getFeed(req, res);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('GET /api/posts/:id', () => {
    it('should return 404 when not found', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'non-existent' };

      vi.mocked(postService.getPostById).mockResolvedValue(null);

      await PostController.getPost(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('should delete post', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'post-123' };

      vi.mocked(postService.deletePost).mockResolvedValue(undefined);

      await PostController.deletePost(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Post deleted successfully' });
    });

    it('should return 403 when unauthorized', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'post-123' };

      vi.mocked(postService.deletePost).mockRejectedValue(new Error('Unauthorized to delete this post'));

      await PostController.deletePost(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('POST /api/posts/:id/like', () => {
    it('should like post', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'post-123' };

      vi.mocked(postService.likePost).mockResolvedValue(undefined);

      await PostController.likePost(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Post liked successfully' });
    });
  });

  describe('POST /api/posts/:id/comments', () => {
    it('should add comment', async () => {
      const { req, res } = createMockContext();
      req.params = { id: 'post-123' };
      req.body = { content: 'Nice!' };

      vi.mocked(postService.addComment).mockResolvedValue({ id: 'comment-1' } as any);

      await PostController.addComment(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});
