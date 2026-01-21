import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface FriendItemProps {
  friend: User;
  onChatPress?: (friend: User) => void;
}

export function FriendItem({ friend, onChatPress }: FriendItemProps) {
  return (
    <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
      <Image 
        source={{ uri: friend.avatarUrl || 'https://via.placeholder.com/50' }} 
        className="w-12 h-12 rounded-full bg-gray-200"
      />
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-gray-800">{friend.name}</Text>
        <Text className="text-sm text-gray-500">@{friend.username}</Text>
      </View>
      {onChatPress && (
        <TouchableOpacity className="p-2" onPress={() => onChatPress(friend)}>
          <Ionicons name="chatbubble-outline" size={24} color="#4F46E5" />
        </TouchableOpacity>
      )}
    </View>
  );
}
