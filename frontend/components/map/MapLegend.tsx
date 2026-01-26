import React, { useState } from 'react';
import { View, Text, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { BlurView } from 'expo-blur';
import { DAY_COLORS } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';



interface MapLegendProps {
  days: number;
}

export function MapLegend({ days }: MapLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  if (days <= 0) return null;

  return (
    <View className="absolute top-[120px] left-4 z-10 overflow-hidden rounded-xl shadow-sm border border-gray-200/50">
      <BlurView intensity={80} tint="light">
        <TouchableOpacity 
          onPress={toggleExpand}
          activeOpacity={0.7}
          className="flex-row items-center justify-between px-3 py-2 space-x-2"
        >
          <View className="flex-row items-center space-x-1">
            <Ionicons name="map-outline" size={16} color="#666" />
            <Text className="font-semibold text-s text-gray-700"> Routes</Text>
          </View>
          <Ionicons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#666" 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View className="px-3 pb-3 pt-1 space-y-2">
            {Array.from({ length: days }).map((_, index) => (
              <View key={index} className="flex-row items-center space-x-2">
                <View 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: DAY_COLORS[index % DAY_COLORS.length] }} 
                />
                <Text className="text-xs text-gray-600 font-medium">
                   -Day {index + 1}
                </Text>
              </View>
            ))}
          </View>
        )}
      </BlurView>
    </View>
  );
}
