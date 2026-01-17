import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { 
  useNotifications, 
  useMarkAllNotificationsRead,
  Notification 
} from '../hooks/queries/useNotifications';

export default function NotificationsScreen() {
  const router = useRouter();
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const handleNotificationPress = (notification: Notification) => {
    // Handle navigation based on type
    if (notification.type === 'FRIEND_REQUEST' || notification.type === 'FRIEND_ACCEPTED') {
      router.push('/friends');
    }
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const renderItem = ({ item }: { item: Notification }) => {
    let iconName: any = 'notifications';
    let iconColor = '#6B7280';
    let bgColor = 'bg-gray-100';

    if (item.type === 'FRIEND_REQUEST') {
      iconName = 'person-add';
      iconColor = '#4F46E5';
      bgColor = 'bg-indigo-100';
    } else if (item.type === 'FRIEND_ACCEPTED') {
      iconName = 'checkmark-circle';
      iconColor = '#10B981';
      bgColor = 'bg-green-100';
    }

    return (
      <TouchableOpacity 
        onPress={() => handleNotificationPress(item)}
        className={`flex-row p-4 border-b border-gray-100 ${!item.read ? 'bg-blue-50' : 'bg-white'}`}
      >
        <View className={`w-10 h-10 rounded-full ${bgColor} items-center justify-center`}>
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View className="ml-3 flex-1">
          <Text className={`text-base text-gray-900 ${!item.read ? 'font-semibold' : 'font-normal'}`}>
            {item.title}
          </Text>
          <Text className="text-sm text-gray-600 mt-1">{item.message}</Text>
          <Text className="text-xs text-gray-400 mt-2">
            {new Date(item.createdAt).toLocaleDateString()} {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </Text>
        </View>
        {!item.read && (
          <View className="w-2 h-2 rounded-full bg-red-500 mt-2" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="px-4 py-3 border-b border-gray-100 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900">Notifications</Text>
        <TouchableOpacity onPress={handleMarkAllRead} disabled={markAllReadMutation.isPending}>
          <Text className="text-indigo-600 text-sm font-medium">Read All</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-10">
            <Ionicons name="notifications-off-outline" size={48} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-center">No notifications yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
