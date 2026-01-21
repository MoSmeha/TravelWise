import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';

interface User {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface UserSearchItemProps {
  user: User;
  isFriend: boolean;
  isPending: boolean;
  onSendRequest: (userId: string) => void;
  isLoading?: boolean;
}

export function UserSearchItem({ 
  user, 
  isFriend, 
  isPending, 
  onSendRequest, 
  isLoading = false 
}: UserSearchItemProps) {
  return (
    <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
      <Image 
        source={{ uri: user.avatarUrl || 'https://via.placeholder.com/50' }} 
        className="w-12 h-12 rounded-full bg-gray-200"
      />
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-gray-800">{user.name}</Text>
        <Text className="text-sm text-gray-500">@{user.username}</Text>
      </View>
      {!isFriend && !isPending && (
        <TouchableOpacity 
          onPress={() => onSendRequest(user.id)}
          className="px-4 py-2 bg-[#004e89] rounded-full"
          disabled={isLoading}
        >
          <Text className="text-white font-medium text-sm">Add</Text>
        </TouchableOpacity>
      )}
      {!isFriend && isPending && (
        <View className="px-4 py-2 bg-gray-100 rounded-full">
          <Text className="text-gray-500 font-medium text-sm">Pending</Text>
        </View>
      )}
      {isFriend && (
        <View className="px-4 py-2 bg-gray-100 rounded-full">
          <Text className="text-gray-500 font-medium text-sm">Friends</Text>
        </View>
      )}
    </View>
  );
}
