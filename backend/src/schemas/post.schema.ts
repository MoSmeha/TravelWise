/**
 * Post Zod Schemas
 * Validation schemas for post-related endpoints
 */

import { z } from 'zod';

// Visibility enum values
const visibilityEnum = z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']);

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

/**
 * Schema for creating a post
 * POST /api/posts
 */
export const createPostSchema = z.object({
  description: z.string().max(2000).optional(),
  visibility: visibilityEnum.optional().default('FRIENDS'),
});

/**
 * Schema for post ID in params
 */
export const postIdParamSchema = z.object({
  id: z.string().cuid('Invalid post ID format'),
});

/**
 * Schema for user ID in params
 */
export const userIdParamSchema = z.object({
  userId: z.string().cuid('Invalid user ID format'),
});

/**
 * Schema for comment ID in params
 */
export const commentIdParamSchema = z.object({
  commentId: z.string().cuid('Invalid comment ID format'),
});

/**
 * Schema for adding a comment
 * POST /api/posts/:id/comments
 */
export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
});

// Combine schemas for delete comment route which needs both IDs
export const deleteCommentSchema = postIdParamSchema.merge(commentIdParamSchema);

// Type exports for use in controllers
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type PostIdParam = z.infer<typeof postIdParamSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type CommentIdParam = z.infer<typeof commentIdParamSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type DeleteCommentParams = z.infer<typeof deleteCommentSchema>;

