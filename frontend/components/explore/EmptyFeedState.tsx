import React from 'react';
import { View, Text } from 'react-native';
import { Image as ImageIcon } from 'lucide-react-native';

type FeedMode = 'friends' | 'discover';

interface EmptyFeedStateProps {
  feedMode: FeedMode;
}

export function EmptyFeedState({ feedMode }: EmptyFeedStateProps) {
  return (
    <View className="items-center justify-center py-20 px-10">
      <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
        <ImageIcon size={40} color="#94a3b8" />
      </View>
      <Text className="text-gray-500 font-medium text-lg">
        {feedMode === 'friends' ? 'No posts yet' : 'No public posts yet'}
      </Text>
      <Text className="text-gray-400 text-center mt-1">
        {feedMode === 'friends' 
          ? 'Add some friends to see their posts here!'
          : 'Be the first to share a public post!'
        }
      </Text>
    </View>
  );
}
