import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../hooks/queries/useUser';
import { useLogoutMutation } from '../../hooks/mutations/useAuthMutations';
import { useUserPosts, useLikePost, useUnlikePost, useDeletePost } from '../../hooks/queries/usePosts';
import { Ionicons } from '@expo/vector-icons';
import { Plus, Grid, Image as ImageIcon } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileInfo } from '../../components/profile/ProfileInfo';
import { PostCard } from '../../components/post/PostCard';
import { CreatePostModal } from '../../components/post/CreatePostModal';
import { CommentsSheet } from '../../components/post/CommentsSheet';
import type { Post } from '../../types/post';
import Toast from 'react-native-toast-message';

const { width: screenWidth } = Dimensions.get('window');
const imageSize = (screenWidth - 32 - 8) / 3; // 3 columns with gaps

export default function ProfileScreen() {
  const { data: user, isLoading, isError } = useUser();
  const logoutMutation = useLogoutMutation();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { 
    data: postsData, 
    isLoading: postsLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchPosts,
  } = useUserPosts(user?.id || '');

  const likePostMutation = useLikePost();
  const unlikePostMutation = useUnlikePost();
  const deletePostMutation = useDeletePost();

  const posts = postsData?.pages.flatMap(page => page.data) || [];

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: () => logoutMutation.mutate() 
        }
      ]
    );
  };

  const handleDeletePost = useCallback((postId: string) => {
    Alert.alert(
      "Delete Post",
      "Are you sure you want to delete this post?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deletePostMutation.mutateAsync(postId);
              Toast.show({ type: 'success', text1: 'Deleted', text2: 'Post deleted successfully' });
            } catch {
              Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to delete post' });
            }
          },
        },
      ]
    );
  }, [deletePostMutation]);

  const renderHeader = () => (
    <View>
      <ProfileHeader user={user} />

      <View className="px-6 -mt-6">
        <ProfileInfo user={user} />

        {/* Friends Interaction */}
        <TouchableOpacity 
          className="flex-row items-center justify-between bg-white p-4 rounded-xl border border-gray-100 mb-4 shadow-sm"
          onPress={() => router.push('/friends')}
        >
          <View className="flex-row items-center">
            <View className="bg-[#004e89]/10 p-2 rounded-full mr-3">
              <Ionicons name="people" size={20} color="#004e89" />
            </View>
            <Text className="text-gray-700 font-semibold text-base">Friends & Requests</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity 
          className="flex-row items-center justify-center bg-red-50 p-4 rounded-xl border border-red-100 mb-4"
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text className="text-red-600 font-semibold ml-2">Sign Out</Text>
        </TouchableOpacity>

        {/* Posts Section Header */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-lg font-bold text-gray-900">My Posts</Text>
          <View className="flex-row">
            <TouchableOpacity 
              onPress={() => setViewMode('grid')}
              className={`p-2 rounded-lg mr-2 ${viewMode === 'grid' ? 'bg-[#004e89]/20' : 'bg-gray-100'}`}
            >
              <Grid size={20} color={viewMode === 'grid' ? '#004e89' : '#6B7280'} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-[#004e89]/20' : 'bg-gray-100'}`}
            >
              <ImageIcon size={20} color={viewMode === 'list' ? '#004e89' : '#6B7280'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderGridItem = ({ item, index }: { item: Post; index: number }) => (
    <TouchableOpacity
      onPress={() => setSelectedPostForComments(item)}
      style={{ width: imageSize, height: imageSize, marginRight: (index + 1) % 3 === 0 ? 0 : 4, marginBottom: 4 }}
    >
      <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
    </TouchableOpacity>
  );

  const renderListItem = ({ item }: { item: Post }) => (
    <PostCard
      post={item}
      onLike={() => likePostMutation.mutate(item.id)}
      onUnlike={() => unlikePostMutation.mutate(item.id)}
      onCommentPress={() => setSelectedPostForComments(item)}
      onDelete={() => handleDeletePost(item.id)}
    />
  );

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-gray-500">Loading profile...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 justify-center items-center p-6">
          <Ionicons name="warning-outline" size={48} color="#EF4444" />
          <Text className="text-xl font-bold text-gray-800 mt-4">Unable to load profile</Text>
          <Text className="text-gray-500 text-center mt-2">There was an error fetching your profile information.</Text>
          <TouchableOpacity 
            className="mt-6 bg-blue-600 px-6 py-3 rounded-xl"
            onPress={() => logoutMutation.mutate()}
          >
            <Text className="text-white font-semibold">Login Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <FlatList
        data={posts}
        renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
        keyExtractor={(item) => item.id}
        numColumns={viewMode === 'grid' ? 3 : 1}
        key={viewMode} // Force re-render when switching modes
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          postsLoading ? (
            <View className="py-10 items-center">
              <ActivityIndicator size="large" color="#004e89" />
            </View>
          ) : (
            <View className="py-10 items-center px-6">
              <ImageIcon size={48} color="#9CA3AF" />
              <Text className="text-gray-400 mt-4 text-center">No posts yet</Text>
              <Text className="text-gray-400 text-sm text-center">Share your first travel moment!</Text>
            </View>
          )
        }
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="py-4" /> : null}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshing={postsLoading}
        onRefresh={refetchPosts}
      />

      {/* FAB for creating post */}
      <TouchableOpacity
        onPress={() => setShowCreateModal(true)}
        className="absolute bottom-6 right-6 bg-[#004e89] w-14 h-14 rounded-full items-center justify-center shadow-lg"
      >
        <Plus size={28} color="white" />
      </TouchableOpacity>

      {/* Create Post Modal */}
      <CreatePostModal 
        visible={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />

      {/* Comments Sheet */}
      {selectedPostForComments && (
        <CommentsSheet
          visible={!!selectedPostForComments}
          postId={selectedPostForComments.id}
          postAuthorId={selectedPostForComments.authorId}
          onClose={() => setSelectedPostForComments(null)}
        />
      )}
    </SafeAreaView>
  );
}
