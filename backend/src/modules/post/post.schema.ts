

import { z } from 'zod';


const visibilityEnum = z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']);


export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});


export const createPostSchema = z.object({
  description: z.string().max(2000).optional(),
  visibility: visibilityEnum.optional().default('FRIENDS'),
});


export const postIdParamSchema = z.object({
  id: z.string().cuid('Invalid post ID format'),
});


export const userIdParamSchema = z.object({
  userId: z.string().cuid('Invalid user ID format'),
});


export const commentIdParamSchema = z.object({
  commentId: z.string().cuid('Invalid comment ID format'),
});


export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
});


export const deleteCommentSchema = postIdParamSchema.merge(commentIdParamSchema);


export type PaginationInput = z.infer<typeof paginationSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type PostIdParam = z.infer<typeof postIdParamSchema>;
export type UserIdParam = z.infer<typeof userIdParamSchema>;
export type CommentIdParam = z.infer<typeof commentIdParamSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;
export type DeleteCommentParams = z.infer<typeof deleteCommentSchema>;

