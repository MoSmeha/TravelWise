import { ChevronDown, ChevronUp } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import type { ItineraryDay, Location } from '../../types/api';
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
  const mealCount = [day.meals?.breakfast, day.meals?.lunch, day.meals?.dinner].filter(Boolean).length;
  const totalItemCount = locationCount + mealCount;

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

  // Convert meal to location format for LocationItem component
  const mealToLocation = (meal: any, type: string): Location | null => {
    if (!meal) return null;
    
    return {
      id: meal.id,
      name: `${type}: ${meal.name}`,
      classification: 'HIDDEN_GEM' as const,
      category: meal.category,
      description: meal.description || `${meal.rating || 4}★ restaurant`,
      latitude: meal.latitude,
      longitude: meal.longitude,
      crowdLevel: 'MODERATE' as const,
      rating: meal.rating,
      totalRatings: meal.totalRatings,
      imageUrl: meal.imageUrl,
      imageUrls: meal.imageUrl ? [meal.imageUrl] : undefined,
      topReviews: [],
      costMinUSD: undefined,
      costMaxUSD: undefined,
      bestTimeToVisit: undefined,
      aiReasoning: undefined,
      scamWarning: undefined,
    };
  };

  // Build a realistic day schedule:
  // Breakfast → Morning activities (first half) → Lunch → Afternoon activities (second half) → Dinner
  const allItems: Location[] = [];
  
  // Split activities into morning (first half) and afternoon (second half)
  const midpoint = Math.ceil(day.locations.length / 2);
  const morningActivities = day.locations.slice(0, midpoint);
  const afternoonActivities = day.locations.slice(midpoint);

  // 1. Breakfast
  if (day.meals?.breakfast) {
    const breakfastLocation = mealToLocation(day.meals.breakfast, '🍳 Breakfast');
    if (breakfastLocation) allItems.push(breakfastLocation);
  }

  // 2. Morning activities (first half)
  allItems.push(...morningActivities);

  // 3. Lunch
  if (day.meals?.lunch) {
    const lunchLocation = mealToLocation(day.meals.lunch, '🥗 Lunch');
    if (lunchLocation) allItems.push(lunchLocation);
  }

  // 4. Afternoon activities (second half)
  allItems.push(...afternoonActivities);

  // 5. Dinner
  if (day.meals?.dinner) {
    const dinnerLocation = mealToLocation(day.meals.dinner, '🍽️ Dinner');
    if (dinnerLocation) allItems.push(dinnerLocation);
  }

  return (
    <View className="mb-4">

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
              {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
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
          {allItems.map((item, index) => (
            <LocationItem
              key={`${day.id || `day-${dayIndex}`}-${item.id}-${index}`}
              location={item}
              index={index}
              showConnector={index < allItems.length - 1}
            />
          ))}
        </View>
      </Animated.View>
    </View>
  );
};
