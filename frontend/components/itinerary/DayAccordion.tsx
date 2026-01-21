import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import type { ItineraryDay } from '../../types/api';
import { LocationItem } from './LocationItem';

interface DayAccordionProps {
  day: ItineraryDay;
  dayIndex: number;
  defaultExpanded?: boolean;
}

export const DayAccordion: React.FC<DayAccordionProps> = ({
  day,
  dayIndex,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const animatedHeight = useRef(new Animated.Value(defaultExpanded ? 1 : 0)).current;

  const locationCount = day.locations.length;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: isExpanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, animatedHeight]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <View className="mb-4">
      {/* Day Header - Collapsible */}
      <TouchableOpacity
        className="flex-row items-center justify-between bg-white mx-4 p-4 rounded-xl"
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-lg font-bold text-gray-900">
              Day {day.dayNumber}
            </Text>
            <Text className="text-sm text-gray-500 ml-3">
              {locationCount} {locationCount === 1 ? 'place' : 'places'}
            </Text>
          </View>
          {day.description && (
            <Text className="text-sm text-gray-600 mt-1" numberOfLines={isExpanded ? undefined : 1}>
              {day.description}
            </Text>
          )}
        </View>
        <View className="ml-3">
          {isExpanded ? (
            <ChevronUp size={24} color="#6B7280" />
          ) : (
            <ChevronDown size={24} color="#6B7280" />
          )}
        </View>
      </TouchableOpacity>

      {/* Expanded Content with Animation */}
      <Animated.View
        style={{
          opacity: animatedHeight,
          maxHeight: animatedHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 5000],
          }),
          overflow: 'hidden',
        }}
      >
        <View className="mt-2">
          {day.locations.map((location, locIndex) => (
            <LocationItem
              key={`${day.id || `day-${dayIndex}`}-${location.id}-${locIndex}`}
              location={location}
              index={locIndex}
              showConnector={locIndex < locationCount - 1}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};
