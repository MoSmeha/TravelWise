import { Lightbulb } from 'lucide-react-native';
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming
} from 'react-native-reanimated';

interface LocalTipCardProps {
  tip: string;
  isExpanded: boolean;
}

export const LocalTipCard: React.FC<LocalTipCardProps> = ({ tip, isExpanded }) => {
  const contentStyle = useAnimatedStyle(() => ({
    maxHeight: withTiming(isExpanded ? 300 : 0, { duration: 300 }),
    opacity: withTiming(isExpanded ? 1 : 0, { duration: 300 }),
    marginTop: withTiming(isExpanded ? 12 : 0, { duration: 300 }),
  }));

  return (
    <View className="bg-white rounded-2xl mr-4 border border-blue-100 shadow-sm w-80 overflow-hidden">
      <View className="p-4 bg-blue-50/30">
        <View className="flex-row items-center">
          <View className="bg-blue-100 p-2 rounded-full mr-3 shadow-sm">
            <Lightbulb size={20} color="#2563EB" />
          </View>
          <Text className="text-base font-medium text-blue-900 flex-1 italic leading-5" numberOfLines={2}>
            Local Insight
          </Text>
        </View>

        <Animated.View style={[contentStyle, { overflow: 'hidden' }]}>
          <Text className="text-sm text-blue-800 leading-6 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 italic">
            &quot;{tip}&quot;
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};
