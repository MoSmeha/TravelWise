import { ShieldAlert } from 'lucide-react-native';
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming
} from 'react-native-reanimated';
import type { TouristTrap } from '../../types/api';

interface TouristTrapCardProps {
  trap: TouristTrap;
  isExpanded: boolean;
}

export const TouristTrapCard: React.FC<TouristTrapCardProps> = ({ trap, isExpanded }) => {
  // A better way for height animation with reanimated in a simple way for text content
  // using max-height is often sufficient for text blocks.
  const contentStyle = useAnimatedStyle(() => ({
    maxHeight: withTiming(isExpanded ? 300 : 0, { duration: 300 }),
    opacity: withTiming(isExpanded ? 1 : 0, { duration: 300 }),
    marginTop: withTiming(isExpanded ? 12 : 0, { duration: 300 }),
  }));

  return (
    <View className="bg-white rounded-2xl mr-4 border border-red-100 shadow-sm w-80 overflow-hidden">
      <View className="p-4 bg-red-50/30">
        <View className="flex-row items-center">
          <View className="bg-red-100 p-2 rounded-full mr-3 shadow-sm">
            <ShieldAlert size={20} color="#DC2626" />
          </View>
          <Text className="text-base font-bold text-gray-900 flex-1 leading-5" numberOfLines={2}>
            {trap.name}
          </Text>
        </View>

        <Animated.View style={[contentStyle, { overflow: 'hidden' }]}>
            <Text className="text-sm text-gray-600 leading-6 bg-white/50 p-3 rounded-xl border border-red-50/50">
              {trap.reason}
            </Text>
        </Animated.View>
      </View>
    </View>
  );
};
