import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';

import { 
  useFriends, 
  usePendingRequests, 
  useAcceptFriendRequest,
  useRejectFriendRequest,
  User,
  FriendRequest
} from '../hooks/queries/useFriends';

type Tab = 'friends' | 'pending';

export default function FriendsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  
  // React Query hooks
  const { data: friends = [], isLoading: friendsLoading, refetch: refetchFriends } = useFriends();
  const { data: pendingRequests = [], isLoading: pendingLoading, refetch: refetchPending } = usePendingRequests();
  
  // Mutations
  const acceptMutation = useAcceptFriendRequest();
  const rejectMutation = useRejectFriendRequest();

  const handleAccept = async (id: string) => {
    try {
      await acceptMutation.mutateAsync(id);
      Toast.show({
        type: 'success',
        text1: 'Accepted',
        text2: 'You are now friends!'
      });
    } catch (error: any) {
       Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.error || 'Failed to accept request'
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectMutation.mutateAsync(id);
      Toast.show({
        type: 'info',
        text1: 'Rejected',
        text2: 'Friend request rejected'
      });
    } catch (error: any) {
       Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.error || 'Failed to reject request'
      });
    }
  };

  const renderFriendItem = ({ item }: { item: User }) => (
    <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
      <Image 
        source={{ uri: item.avatarUrl || 'https://via.placeholder.com/50' }} 
        className="w-12 h-12 rounded-full bg-gray-200"
      />
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
        <Text className="text-sm text-gray-500">@{item.username}</Text>
      </View>
      <TouchableOpacity className="p-2">
        <Ionicons name="chatbubble-outline" size={24} color="#4F46E5" />
      </TouchableOpacity>
    </View>
  );

  const renderRequestItem = ({ item }: { item: FriendRequest }) => (
    <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
      <Image 
        source={{ uri: item.requester?.avatarUrl || 'https://via.placeholder.com/50' }} 
        className="w-12 h-12 rounded-full bg-gray-200"
      />
      <View className="ml-4 flex-1">
        <Text className="text-base font-semibold text-gray-800">{item.requester?.name}</Text>
        <Text className="text-sm text-gray-500">@{item.requester?.username}</Text>
      </View>
      <View className="flex-row">
        <TouchableOpacity 
          onPress={() => handleReject(item.id)}
          className="p-2 bg-gray-100 rounded-full mr-2"
          disabled={rejectMutation.isPending}
        >
          <Ionicons name="close" size={20} color="#EF4444" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => handleAccept(item.id)}
          className="p-2 bg-indigo-100 rounded-full"
          disabled={acceptMutation.isPending}
        >
          <Ionicons name="checkmark" size={20} color="#4F46E5" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Friends</Text>
        <View className="w-6" />
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 py-2 border-b border-gray-100">
        <TouchableOpacity 
          onPress={() => setActiveTab('friends')}
          className={`mr-6 pb-2 border-b-2 ${activeTab === 'friends' ? 'border-indigo-600' : 'border-transparent'}`}
        >
          <Text className={`font-medium ${activeTab === 'friends' ? 'text-indigo-600' : 'text-gray-500'}`}>
            Your Friends
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setActiveTab('pending')}
          className={`mr-6 pb-2 border-b-2 ${activeTab === 'pending' ? 'border-indigo-600' : 'border-transparent'}`}
        >
          <Text className={`font-medium ${activeTab === 'pending' ? 'text-indigo-600' : 'text-gray-500'}`}>
            Requests
            {pendingRequests.length > 0 && <Text className="text-indigo-600 ml-1"> ({pendingRequests.length})</Text>}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View className="flex-1 bg-gray-50">
        {activeTab === 'friends' && (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={friendsLoading}
            onRefresh={refetchFriends}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Text className="text-gray-400">No friends yet</Text>
              </View>
            }
          />
        )}

        {activeTab === 'pending' && (
          <FlatList
            data={pendingRequests}
            renderItem={renderRequestItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshing={pendingLoading}
            onRefresh={refetchPending}
            ListEmptyComponent={
              <View className="items-center justify-center py-20">
                <Text className="text-gray-400">No pending requests</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
