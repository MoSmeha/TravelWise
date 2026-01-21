import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FriendRequest {
  id: string;
  requester?: {
    name?: string;
    username?: string;
    avatarUrl?: string;
  };
}

interface FriendRequestItemProps {
  request: FriendRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
}

export function FriendRequestItem({ 
  request, 
  onAccept, 
  onReject,
  isAccepting = false,
  isRejecting = false 
}: FriendRequestItemProps) {
  return (
    <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
      <Image 
        source={{ uri: request.requester?.avatarUrl || 'https://via.placeholder.com/50' }} 
        className="w-12 h-12 rounded-full bg-gray-200"
      />
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-gray-800">{request.requester?.name}</Text>
        <Text className="text-sm text-gray-500">@{request.requester?.username}</Text>
      </View>
      <View className="flex-row">
        <TouchableOpacity 
          onPress={() => onReject(request.id)}
          className="p-2 bg-gray-100 rounded-full mr-2"
          disabled={isRejecting}
        >
          <Ionicons name="close" size={20} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => onAccept(request.id)}
          className="p-2 bg-indigo-100 rounded-full"
          disabled={isAccepting}
        >
          <Ionicons name="checkmark" size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
