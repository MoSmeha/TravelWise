import React from 'react';
import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUnreadNotificationCount } from '../hooks/queries/useNotifications';

export const NotificationBell = () => {
  const router = useRouter();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  return (
    <TouchableOpacity 
      onPress={() => router.push('/notifications')}
      className="p-2 relative"
    >
      <Ionicons name="notifications-outline" size={24} color="#000" />
      
      {unreadCount > 0 && (
        <View className="absolute top-1 right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center">
          <Text className="text-white text-[10px] font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
