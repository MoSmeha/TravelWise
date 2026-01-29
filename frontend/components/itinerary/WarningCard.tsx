import { AlertTriangle } from 'lucide-react-native';
import React from 'react';
import { View, Text } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  withTiming
} from 'react-native-reanimated';
import type { Warning } from '../../types/api';

interface WarningCardProps {
  warning: Warning;
  isExpanded: boolean;
}

export const WarningCard: React.FC<WarningCardProps> = ({ warning, isExpanded }) => {
  const contentStyle = useAnimatedStyle(() => ({
    maxHeight: withTiming(isExpanded ? 300 : 0, { duration: 300 }),
    opacity: withTiming(isExpanded ? 1 : 0, { duration: 300 }),
    marginTop: withTiming(isExpanded ? 12 : 0, { duration: 300 }),
  }));

  return (
    <View className="bg-white rounded-2xl mr-4 border border-amber-200 shadow-sm w-80 overflow-hidden">
      <View className="p-4 bg-amber-50/30">
        <View className="flex-row items-center">
          <View className="bg-amber-100 p-2 rounded-full mr-3 shadow-sm">
            <AlertTriangle size={20} color="#D97706" />
          </View>
          <Text className="text-base font-bold text-gray-900 flex-1 leading-5" numberOfLines={2}>
            {warning.title}
          </Text>
        </View>

        <Animated.View style={[contentStyle, { overflow: 'hidden' }]}>
          <Text className="text-sm text-gray-700 leading-6 bg-amber-50 p-3 rounded-xl border border-amber-100">
            {warning.description}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
};
