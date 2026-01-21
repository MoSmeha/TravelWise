import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postService } from '../../services/api';
import type { Post, Comment, PaginatedResponse, PostVisibility } from '../../types/post';

// Query Keys
export const postKeys = {
  all: ['posts'] as const,
  feed: () => [...postKeys.all, 'feed'] as const,
  discover: () => [...postKeys.all, 'discover'] as const,
  userPosts: (userId: string) => [...postKeys.all, 'user', userId] as const,
  post: (id: string) => [...postKeys.all, id] as const,
  comments: (postId: string) => [...postKeys.all, postId, 'comments'] as const,
};

/**
 * Infinite query for friends' posts feed
 */
export function useFriendsFeed() {
  return useInfiniteQuery({
    queryKey: postKeys.feed(),
    queryFn: ({ pageParam }) => postService.getFeed(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
}

/**
 * Infinite query for discover/public posts feed
 */
export function useDiscoverFeed() {
  return useInfiniteQuery({
    queryKey: postKeys.discover(),
    queryFn: ({ pageParam }) => postService.getDiscoverFeed(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
}

/**
 * Infinite query for a user's posts
 */
export function useUserPosts(userId: string) {
  return useInfiniteQuery({
    queryKey: postKeys.userPosts(userId),
    queryFn: ({ pageParam }) => postService.getUserPosts(userId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!userId,
  });
}

/**
 * Query for a single post
 */
export function usePost(postId: string) {
  return useQuery({
    queryKey: postKeys.post(postId),
    queryFn: () => postService.getPost(postId),
    enabled: !!postId,
  });
}

/**
 * Infinite query for post comments
 */
export function usePostComments(postId: string) {
  return useInfiniteQuery({
    queryKey: postKeys.comments(postId),
    queryFn: ({ pageParam }) => postService.getPostComments(postId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!postId,
  });
}

/**
 * Mutation for creating a post
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageUri, description, visibility }: { 
      imageUri: string; 
      description?: string; 
      visibility?: PostVisibility;
    }) => postService.createPost(imageUri, description, visibility),
    onSuccess: () => {
      // Invalidate feed and user posts
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * Mutation for deleting a post
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}

/**
 * Mutation for liking a post with optimistic update
 */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postService.likePost(postId),
    onMutate: async (postId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: postKeys.feed() });

      // Snapshot current data
      const previousFeed = queryClient.getQueryData(postKeys.feed());

      // Optimistically update feed
      queryClient.setQueryData(postKeys.feed(), (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: PaginatedResponse<Post>) => ({
            ...page,
            data: page.data.map((post: Post) =>
              post.id === postId
                ? { ...post, isLiked: true, likesCount: post.likesCount + 1 }
                : post
            ),
          })),
        };
      });

      return { previousFeed };
    },
    onError: (_err, _postId, context) => {
      // Rollback on error
      if (context?.previousFeed) {
        queryClient.setQueryData(postKeys.feed(), context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
    },
  });
}

/**
 * Mutation for unliking a post with optimistic update
 */
export function useUnlikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postService.unlikePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.feed() });

      const previousFeed = queryClient.getQueryData(postKeys.feed());

      queryClient.setQueryData(postKeys.feed(), (old: any) => {
        if (!old?.pages) return old;
        return {
          ...old,
          pages: old.pages.map((page: PaginatedResponse<Post>) => ({
            ...page,
            data: page.data.map((post: Post) =>
              post.id === postId
                ? { ...post, isLiked: false, likesCount: Math.max(0, post.likesCount - 1) }
                : post
            ),
          })),
        };
      });

      return { previousFeed };
    },
    onError: (_err, _postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(postKeys.feed(), context.previousFeed);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
    },
  });
}

/**
 * Mutation for adding a comment
 */
export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      postService.addComment(postId, content),
    onSuccess: (_data, variables) => {
      // Invalidate comments for this post
      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });
      // Invalidate feed to update comment count
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
    },
  });
}

/**
 * Mutation for deleting a comment
 */
export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
      postService.deleteComment(postId, commentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
    },
  });
}
