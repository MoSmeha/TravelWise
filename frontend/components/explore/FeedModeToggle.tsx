import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Users, Globe } from 'lucide-react-native';

type FeedMode = 'friends' | 'discover';

interface FeedModeToggleProps {
  feedMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

export function FeedModeToggle({ feedMode, onModeChange }: FeedModeToggleProps) {
  return (
    <View className="flex-row bg-gray-100 rounded-xl p-1">
      <TouchableOpacity
        onPress={() => onModeChange('friends')}
        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${feedMode === 'friends' ? 'bg-[#004e89]' : ''}`}
      >
        <Users size={16} color={feedMode === 'friends' ? '#ffffff' : '#6b7280'} />
        <Text className={`ml-2 font-semibold ${feedMode === 'friends' ? 'text-white' : 'text-gray-500'}`}>
          Friends
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => onModeChange('discover')}
        className={`flex-1 flex-row items-center justify-center py-2.5 rounded-lg ${feedMode === 'discover' ? 'bg-[#004e89]' : ''}`}
      >
        <Globe size={16} color={feedMode === 'discover' ? '#ffffff' : '#6b7280'} />
        <Text className={`ml-2 font-semibold ${feedMode === 'discover' ? 'text-white' : 'text-gray-500'}`}>
          Discover
        </Text>
      </TouchableOpacity>
    </View>
  );
}
