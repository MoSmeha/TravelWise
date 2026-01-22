import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { OnlineIndicator } from '../OnlineIndicator';
import type { Conversation } from '../../hooks/queries/useMessages';
import type { User } from '../../hooks/queries/useFriends';

interface FriendWithConversation extends User {
  conversation?: Conversation;
  unreadCount?: number;
}

interface FriendConversationItemProps {
  friend: FriendWithConversation;
  isOnline: boolean;
  onPress: () => void;
  isLoading?: boolean;
  formatTime: (dateString: string) => string;
}

export function FriendConversationItem({ 
  friend, 
  isOnline, 
  onPress, 
  isLoading = false,
  formatTime
}: FriendConversationItemProps) {
  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={onPress}
      className="flex-row p-4 items-center border-b border-gray-100"
      disabled={isLoading}
    >
      <View style={{ position: 'relative' }}>
        {friend.avatarUrl ? (
          <Image 
            source={{ uri: friend.avatarUrl }} 
            className="w-12 h-12 rounded-full"
          />
        ) : (
          <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center">
            <Text className="text-indigo-600 font-bold text-lg">
              {friend.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <OnlineIndicator isOnline={isOnline} size="medium" />
      </View>
      
      <View className="flex-1 ml-4">
        <Text className="text-gray-900 font-semibold text-base">
          {friend.name}
        </Text>
        {friend.conversation?.lastMessage ? (
          <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>
            {friend.conversation.lastMessage.content}
          </Text>
        ) : (
          <Text className="text-gray-400 text-sm mt-0.5">
            @{friend.username}
          </Text>
        )}
      </View>

      <View className="items-end">
        {friend.conversation?.lastMessage && (
          <Text className="text-gray-400 text-xs">
            {formatTime(friend.conversation.lastMessage.createdAt)}
          </Text>
        )}
        {(friend.unreadCount || 0) > 0 && (
          <View className="bg-indigo-600 rounded-full min-w-[20px] h-5 items-center justify-center mt-1 px-1.5">
            <Text className="text-white text-xs font-bold">
              {friend.unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
