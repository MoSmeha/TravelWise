import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type Tab = 'friends' | 'pending';

interface FriendsTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  pendingCount: number;
}

export function FriendsTabs({ activeTab, onTabChange, pendingCount }: FriendsTabsProps) {
  return (
    <View className="flex-row border-b border-gray-100 bg-white">
      <TouchableOpacity 
        onPress={() => onTabChange('friends')}
        className={`flex-1 items-center justify-center py-3 border-b-2 ${activeTab === 'friends' ? 'border-indigo-600' : 'border-transparent'}`}
      >
        <Text className={`font-medium ${activeTab === 'friends' ? 'text-indigo-600' : 'text-gray-500'}`}>
          Your Friends
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => onTabChange('pending')}
        className={`flex-1 items-center justify-center py-3 border-b-2 ${activeTab === 'pending' ? 'border-indigo-600' : 'border-transparent'}`}
      >
        <Text className={`font-medium ${activeTab === 'pending' ? 'text-indigo-600' : 'text-gray-500'}`}>
          Requests
          {pendingCount > 0 && <Text className="text-indigo-600 ml-1"> ({pendingCount})</Text>}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
