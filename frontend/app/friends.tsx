import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
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
import { FriendItem } from '../components/friends/FriendItem';
import { FriendRequestItem } from '../components/friends/FriendRequestItem';
import { FriendsTabs } from '../components/friends/FriendsTabs';

type Tab = 'friends' | 'pending';

const EmptyState = ({ title, message, icon }: { title: string; message: string; icon: keyof typeof Ionicons.glyphMap }) => (
  <View className="items-center justify-center py-20 px-10">
    <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
      <Ionicons name={icon} size={40} color="#94a3b8" />
    </View>
    <Text className="text-gray-500 font-medium text-lg">{title}</Text>
    <Text className="text-gray-400 text-center mt-1">{message}</Text>
  </View>
);

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
    <FriendItem friend={item} />
  );

  const renderRequestItem = ({ item }: { item: FriendRequest }) => (
    <FriendRequestItem
      request={item}
      onAccept={handleAccept}
      onReject={handleReject}
      isAccepting={acceptMutation.isPending}
      isRejecting={rejectMutation.isPending}
    />
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
      <FriendsTabs 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        pendingCount={pendingRequests.length}
      />

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
              <EmptyState 
                title="No friends yet" 
                message="Start adding friends to share your trips!" 
                icon="people"
              />
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
              <EmptyState 
                title="No pending requests" 
                message="Friend requests will appear here" 
                icon="person-add"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
