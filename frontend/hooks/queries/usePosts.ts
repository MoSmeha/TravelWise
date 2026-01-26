import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { postService } from '../../services/api';
import type { Post, Comment, PaginatedResponse, PostVisibility } from '../../types/post';


export const postKeys = {
  all: ['posts'] as const,
  feed: () => [...postKeys.all, 'feed'] as const,
  discover: () => [...postKeys.all, 'discover'] as const,
  userPosts: (userId: string) => [...postKeys.all, 'user', userId] as const,
  post: (id: string) => [...postKeys.all, id] as const,
  comments: (postId: string) => [...postKeys.all, postId, 'comments'] as const,
};


export function useFriendsFeed() {
  return useInfiniteQuery({
    queryKey: postKeys.feed(),
    queryFn: ({ pageParam }) => postService.getFeed(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
}


export function useDiscoverFeed() {
  return useInfiniteQuery({
    queryKey: postKeys.discover(),
    queryFn: ({ pageParam }) => postService.getDiscoverFeed(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
  });
}


export function useUserPosts(userId: string) {
  return useInfiniteQuery({
    queryKey: postKeys.userPosts(userId),
    queryFn: ({ pageParam }) => postService.getUserPosts(userId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!userId,
  });
}


export function usePost(postId: string) {
  return useQuery({
    queryKey: postKeys.post(postId),
    queryFn: () => postService.getPost(postId),
    enabled: !!postId,
  });
}


export function usePostComments(postId: string) {
  return useInfiniteQuery({
    queryKey: postKeys.comments(postId),
    queryFn: ({ pageParam }) => postService.getPostComments(postId, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!postId,
  });
}


export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ imageUri, description, visibility }: { 
      imageUri: string; 
      description?: string; 
      visibility?: PostVisibility;
    }) => postService.createPost(imageUri, description, visibility),
    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}


export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postService.deletePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.all });
    },
  });
}


export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postService.likePost(postId),
    onMutate: async (postId) => {

      await queryClient.cancelQueries({ queryKey: postKeys.feed() });
      await queryClient.cancelQueries({ queryKey: postKeys.discover() });


      const previousFeed = queryClient.getQueryData(postKeys.feed());
      const previousDiscover = queryClient.getQueryData(postKeys.discover());


      const updateFeedData = (old: any) => {
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
      };


      queryClient.setQueryData(postKeys.feed(), updateFeedData);
      queryClient.setQueryData(postKeys.discover(), updateFeedData);

      return { previousFeed, previousDiscover };
    },
    onError: (_err, _postId, context) => {

      if (context?.previousFeed) {
        queryClient.setQueryData(postKeys.feed(), context.previousFeed);
      }
      if (context?.previousDiscover) {
        queryClient.setQueryData(postKeys.discover(), context.previousDiscover);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
      queryClient.invalidateQueries({ queryKey: postKeys.discover() });
    },
  });
}


export function useUnlikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (postId: string) => postService.unlikePost(postId),
    onMutate: async (postId) => {
      await queryClient.cancelQueries({ queryKey: postKeys.feed() });
      await queryClient.cancelQueries({ queryKey: postKeys.discover() });

      const previousFeed = queryClient.getQueryData(postKeys.feed());
      const previousDiscover = queryClient.getQueryData(postKeys.discover());

      const updateFeedData = (old: any) => {
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
      };

      queryClient.setQueryData(postKeys.feed(), updateFeedData);
      queryClient.setQueryData(postKeys.discover(), updateFeedData);

      return { previousFeed, previousDiscover };
    },
    onError: (_err, _postId, context) => {
      if (context?.previousFeed) {
        queryClient.setQueryData(postKeys.feed(), context.previousFeed);
      }
      if (context?.previousDiscover) {
        queryClient.setQueryData(postKeys.discover(), context.previousDiscover);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
      queryClient.invalidateQueries({ queryKey: postKeys.discover() });
    },
  });
}


export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, content }: { postId: string; content: string }) =>
      postService.addComment(postId, content),
    onSuccess: (_data, variables) => {

      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });

      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
      queryClient.invalidateQueries({ queryKey: postKeys.discover() });
    },
  });
}


export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, commentId }: { postId: string; commentId: string }) =>
      postService.deleteComment(postId, commentId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: postKeys.comments(variables.postId) });
      queryClient.invalidateQueries({ queryKey: postKeys.feed() });
      queryClient.invalidateQueries({ queryKey: postKeys.discover() });
    },
  });
}
