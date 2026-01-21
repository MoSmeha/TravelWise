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
    <View className="flex-row px-4 py-2 border-b border-gray-100">
      <TouchableOpacity 
        onPress={() => onTabChange('friends')}
        className={`mr-6 pb-2 border-b-2 ${activeTab === 'friends' ? 'border-indigo-600' : 'border-transparent'}`}
      >
        <Text className={`font-medium ${activeTab === 'friends' ? 'text-indigo-600' : 'text-gray-500'}`}>
          Your Friends
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => onTabChange('pending')}
        className={`mr-6 pb-2 border-b-2 ${activeTab === 'pending' ? 'border-indigo-600' : 'border-transparent'}`}
      >
        <Text className={`font-medium ${activeTab === 'pending' ? 'text-indigo-600' : 'text-gray-500'}`}>
          Requests
          {pendingCount > 0 && <Text className="text-indigo-600 ml-1"> ({pendingCount})</Text>}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
