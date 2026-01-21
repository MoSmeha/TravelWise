import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Send, Trash2 } from 'lucide-react-native';
import { usePostComments, useAddComment, useDeleteComment } from '../../hooks/queries/usePosts';
import { useAuth } from '../../store/authStore';
import type { Comment } from '../../types/post';
import Toast from 'react-native-toast-message';

interface CommentsSheetProps {
  visible: boolean;
  postId: string;
  postAuthorId: string;
  onClose: () => void;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d`;
}

export const CommentsSheet: React.FC<CommentsSheetProps> = ({
  visible,
  postId,
  postAuthorId,
  onClose,
}) => {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const inputRef = useRef<TextInput>(null);

  const {
    data: commentsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePostComments(postId);

  const addCommentMutation = useAddComment();
  const deleteCommentMutation = useDeleteComment();

  const comments = commentsData?.pages.flatMap((page) => page.data) || [];

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim()) return;

    try {
      await addCommentMutation.mutateAsync({ postId, content: newComment.trim() });
      setNewComment('');
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.error || 'Failed to add comment',
      });
    }
  }, [newComment, postId, addCommentMutation]);

  const handleDelete = useCallback(
    async (commentId: string) => {
      try {
        await deleteCommentMutation.mutateAsync({ postId, commentId });
        Toast.show({
          type: 'success',
          text1: 'Deleted',
          text2: 'Comment removed',
        });
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.response?.data?.error || 'Failed to delete comment',
        });
      }
    },
    [postId, deleteCommentMutation]
  );

  const renderComment = ({ item }: { item: Comment }) => {
    const canDelete = item.authorId === user?.id || postAuthorId === user?.id;

    return (
      <View className="flex-row p-3 border-b border-gray-50">
        <View className="w-9 h-9 rounded-full bg-gray-200 overflow-hidden">
          {item.author.avatarUrl ? (
            <Image
              source={{ uri: item.author.avatarUrl }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-indigo-100 items-center justify-center">
              <Text className="text-indigo-600 font-bold">
                {item.author.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1 ml-3">
          <View className="flex-row items-center">
            <Text className="font-semibold text-gray-900">{item.author.username}</Text>
            <Text className="text-gray-400 text-xs ml-2">{formatTimeAgo(item.createdAt)}</Text>
          </View>
          <Text className="text-gray-700 mt-1">{item.content}</Text>
        </View>
        {canDelete && (
          <TouchableOpacity
            onPress={() => handleDelete(item.id)}
            className="p-2"
            disabled={deleteCommentMutation.isPending}
          >
            <Trash2 size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={onClose}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">Comments</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Comments List */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#4F46E5" />
          </View>
        ) : (
          <FlatList
            data={comments}
            renderItem={renderComment}
            keyExtractor={(item) => item.id}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isFetchingNextPage ? (
                <ActivityIndicator size="small" color="#4F46E5" className="py-4" />
              ) : null
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-20">
                <Text className="text-gray-400">No comments yet</Text>
                <Text className="text-gray-400 text-sm">Be the first to comment!</Text>
              </View>
            }
            contentContainerStyle={{ flexGrow: 1 }}
          />
        )}

        {/* Input */}
        <View className="flex-row items-center px-4 py-3 border-t border-gray-100 bg-white">
          <TextInput
            ref={inputRef}
            value={newComment}
            onChangeText={setNewComment}
            placeholder="Add a comment..."
            placeholderTextColor="#9CA3AF"
            className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-gray-900"
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!newComment.trim() || addCommentMutation.isPending}
            className="ml-2 p-2"
          >
            {addCommentMutation.isPending ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Send
                size={24}
                color={newComment.trim() ? '#4F46E5' : '#9CA3AF'}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
