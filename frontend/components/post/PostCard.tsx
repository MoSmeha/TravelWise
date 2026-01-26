import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Globe, Users, Lock } from 'lucide-react-native';
import type { Post, PostVisibility } from '../../types/post';
import { useAuth } from '../../store/authStore';
import { useOnlineStatus } from '../../hooks/queries/useOnlineStatus';

const { width: screenWidth } = Dimensions.get('window');

interface PostCardProps {
  post: Post;
  onLike: () => void;
  onUnlike: () => void;
  onCommentPress: () => void;
  onDelete?: () => void;
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
  if (diffInDays < 7) return `${diffInDays}d`;
  return date.toLocaleDateString();
}

function getVisibilityConfig(visibility: PostVisibility) {
  switch (visibility) {
    case 'PUBLIC':
      return { icon: Globe, label: 'Public', color: '#22C55E', bgColor: 'bg-green-50' };
    case 'FRIENDS':
      return { icon: Users, label: 'Friends', color: '#3B82F6', bgColor: 'bg-blue-50' };
    case 'PRIVATE':
      return { icon: Lock, label: 'Private', color: '#6B7280', bgColor: 'bg-gray-100' };
    default:
      return { icon: Users, label: 'Friends', color: '#3B82F6', bgColor: 'bg-blue-50' };
  }
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onLike,
  onUnlike,
  onCommentPress,
  onDelete,
}) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const isOwner = user?.id === post.authorId;
  

  const { data: onlineStatus } = useOnlineStatus([post.authorId]);
  const isOnline = onlineStatus?.[post.authorId] || false;
  
  const visibilityConfig = getVisibilityConfig(post.visibility);
  const VisibilityIcon = visibilityConfig.icon;

  const handleLikePress = () => {
    if (post.isLiked) {
      onUnlike();
    } else {
      onLike();
    }
  };

  return (
    <View className="bg-white mb-2">

      <View className="flex-row items-center p-3">
        <View className="relative">
          <View className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
            {post.author.avatarUrl ? (
              <Image
                source={{ uri: post.author.avatarUrl }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full bg-[#004e89]/10 items-center justify-center">
                <Text className="text-[#004e89] font-bold text-lg">
                  {post.author.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {isOnline && (
            <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
          )}
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="font-semibold text-gray-900">{post.author.name}</Text>

            <View className={`flex-row items-center ml-2 px-1.5 py-0.5 rounded ${visibilityConfig.bgColor}`}>
              <VisibilityIcon size={10} color={visibilityConfig.color} />
              <Text className="text-[10px] ml-0.5 font-medium" style={{ color: visibilityConfig.color }}>
                {visibilityConfig.label}
              </Text>
            </View>
          </View>
          <Text className="text-gray-500 text-xs">@{post.author.username} · {formatTimeAgo(post.createdAt)}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity 
            onPress={() => setShowMenu(!showMenu)}
            className="p-2"
          >
            <MoreHorizontal size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>


      {showMenu && isOwner && (
        <View className="absolute right-4 top-12 bg-white rounded-lg shadow-lg z-10 border border-gray-100">
          <TouchableOpacity
            onPress={() => {
              setShowMenu(false);
              onDelete?.();
            }}
            className="flex-row items-center px-4 py-3"
          >
            <Trash2 size={18} color="#EF4444" />
            <Text className="text-red-500 ml-2 font-medium">Delete Post</Text>
          </TouchableOpacity>
        </View>
      )}


      <Image
        source={{ uri: post.imageUrl }}
        style={{ width: screenWidth, height: screenWidth }}
        resizeMode="cover"
      />


      <View className="flex-row items-center px-3 py-2">
        <TouchableOpacity
          onPress={handleLikePress}
          className="flex-row items-center mr-4"
        >
          <Heart
            size={24}
            color={post.isLiked ? '#EF4444' : '#374151'}
            fill={post.isLiked ? '#EF4444' : 'transparent'}
          />
          <Text className={`ml-1 font-medium ${post.isLiked ? 'text-red-500' : 'text-gray-700'}`}>
            {post.likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onCommentPress}
          className="flex-row items-center"
        >
          <MessageCircle size={24} color="#374151" />
          <Text className="ml-1 text-gray-700 font-medium">{post.commentsCount}</Text>
        </TouchableOpacity>
      </View>


      {post.description && (
        <View className="px-3 pb-3">
          <Text className="text-gray-900">
            <Text className="font-semibold">{post.author.username}</Text>{' '}
            {post.description}
          </Text>
        </View>
      )}
    </View>
  );
};
