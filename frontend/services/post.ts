import api from './api-client';
import type { Post, Comment, PaginatedResponse, PostVisibility } from '../types/post';
import {
  PostSchema,
  CommentSchema,
  PaginatedPostResponseSchema,
  PaginatedCommentResponseSchema
} from '../types/schemas';

export const postService = {
  async getFeed(cursor?: string, limit: number = 10): Promise<PaginatedResponse<Post>> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const response = await api.get<PaginatedResponse<Post>>(`/posts/feed?${params}`);
    return PaginatedPostResponseSchema.parse(response.data);
  },

  async getDiscoverFeed(cursor?: string, limit: number = 10): Promise<PaginatedResponse<Post>> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const response = await api.get<PaginatedResponse<Post>>(`/posts/discover?${params}`);
    return PaginatedPostResponseSchema.parse(response.data);
  },

  async getUserPosts(userId: string, cursor?: string, limit: number = 10): Promise<PaginatedResponse<Post>> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const response = await api.get<PaginatedResponse<Post>>(`/posts/user/${userId}?${params}`);
    return PaginatedPostResponseSchema.parse(response.data);
  },

  async getPost(postId: string): Promise<Post> {
    const response = await api.get<{ data: Post }>(`/posts/${postId}`);
    return PostSchema.parse(response.data.data);
  },

  async createPost(imageUri: string, description?: string, visibility: PostVisibility = 'FRIENDS'): Promise<Post> {
    const formData = new FormData();
    
    const fileName = imageUri.split('/').pop() || 'image.jpg';
    const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    formData.append('image', {
      uri: imageUri,
      name: fileName,
      type: fileType,
    } as any);
    
    if (description) {
      formData.append('description', description);
    }
    formData.append('visibility', visibility);

    const response = await api.post<{ data: Post }>('/posts', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return PostSchema.parse(response.data.data);
  },

  async deletePost(postId: string): Promise<void> {
    await api.delete(`/posts/${postId}`);
  },

  async likePost(postId: string): Promise<void> {
    await api.post(`/posts/${postId}/like`);
  },

  async unlikePost(postId: string): Promise<void> {
    await api.delete(`/posts/${postId}/like`);
  },

  async getPostComments(postId: string, cursor?: string, limit: number = 20): Promise<PaginatedResponse<Comment>> {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    const response = await api.get<PaginatedResponse<Comment>>(`/posts/${postId}/comments?${params}`);
    return PaginatedCommentResponseSchema.parse(response.data);
  },

  async addComment(postId: string, content: string): Promise<Comment> {
    const response = await api.post<{ data: Comment }>(`/posts/${postId}/comments`, { content });
    return CommentSchema.parse(response.data.data);
  },

  async deleteComment(postId: string, commentId: string): Promise<void> {
    await api.delete(`/posts/${postId}/comments/${commentId}`);
  },
};
