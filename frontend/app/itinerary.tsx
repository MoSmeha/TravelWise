import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { LocationItem } from '../components/itinerary/LocationItem';
import { useAskQuestion } from '../hooks/mutations/useItinerary';
import { useItineraryStore } from '../store/itineraryStore';
import type { Hotel, ItineraryResponse } from '../types/api';

export default function ItineraryScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<ItineraryResponse | null>(null);
  
  // Itinerary store for persisting active itinerary
  const setActiveItinerary = useItineraryStore((state) => state.setActiveItinerary);
  
  // React Query Hooks


  useEffect(() => {
    if (params.data) {
      try {
        const parsed = JSON.parse(params.data as string);
        setData(parsed);
        
        // Set active itinerary in store for checklist tab access
        if (parsed.itinerary?.id) {
          setActiveItinerary(parsed.itinerary.id);
        }
      } catch (error) {
        console.error('Error parsing data:', error);
        Alert.alert('Error', 'Failed to load itinerary data');
      }
    }
  }, [params.data, setActiveItinerary]);
  


  const handleHotelBook = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open booking link');
    });
  };

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-100">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-2 text-gray-500">Loading itinerary...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="bg-white p-5 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <Text className="text-2xl font-bold text-gray-900">{data.country?.name || 'Your'} Trip</Text>
            <View className="bg-purple-500 px-2.5 py-1 rounded-md">
              <Text className="text-white text-xs font-semibold">🤖 AI</Text>
            </View>
          </View>
          <Text className="text-base text-gray-600 mt-1">
            {data.itinerary.numberOfDays} days • ${data.itinerary.budgetUSD} budget
          </Text>
          <Text className="text-sm text-sky-500 mt-1.5">
            ✈️ Arriving at {data.airport.name} ({data.airport.code})
          </Text>
          {data.itinerary.totalEstimatedCostUSD && (
            <Text className="text-lg font-semibold text-green-500 mt-2">
              💰 Est. Total: ${data.itinerary.totalEstimatedCostUSD} USD
            </Text>
          )}
        </View>

        {/* Budget Breakdown */}
        {data.itinerary.budgetBreakdown && (
          <View className="bg-white m-4 p-4 rounded-xl">
            <Text className="text-lg font-bold mb-3 text-gray-800">Budget Breakdown</Text>
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-sm text-gray-800">🍽️ Food:</Text>
              <Text className="text-sm font-semibold text-green-500">${data.itinerary.budgetBreakdown.food}</Text>
            </View>
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-sm text-gray-800">🎯 Activities:</Text>
              <Text className="text-sm font-semibold text-green-500">${data.itinerary.budgetBreakdown.activities}</Text>
            </View>
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-sm text-gray-800">🚗 Transport:</Text>
              <Text className="text-sm font-semibold text-green-500">${data.itinerary.budgetBreakdown.transport}</Text>
            </View>
            <View className="flex-row justify-between mb-1.5">
              <Text className="text-sm text-gray-800">🏨 Accommodation:</Text>
              <Text className="text-sm font-semibold text-green-500">${data.itinerary.budgetBreakdown.accommodation}</Text>
            </View>
          </View>
        )}

        {/* Route Summary */}
        {data.routeSummary && (
          <View className="bg-sky-100 m-4 mt-0 p-4 rounded-xl">
            <Text className="text-lg font-bold mb-3 text-gray-800">🗺️ Route Overview</Text>
            <Text className="text-sm text-sky-700 leading-5">{data.routeSummary}</Text>
          </View>
        )}

        {/* Hotels Section */}
        {data.hotels && data.hotels.length > 0 && (
          <View className="m-4 mt-0">
            <Text className="text-lg font-bold mb-3 text-gray-800">🏨 Recommended Hotels</Text>
            {data.hotels.map((hotel: Hotel) => (
              <View key={hotel.id} className="bg-white p-4 rounded-xl mb-3 border-l-4 border-l-purple-500">
                <Text className="text-lg font-bold text-gray-900">{hotel.name}</Text>
                <Text className="text-xs text-gray-600 mt-0.5">{hotel.neighborhood}</Text>

                <Text className="text-base font-semibold text-green-500 mt-2">
                  ${hotel.pricePerNightUSD.min}-${hotel.pricePerNightUSD.max}/night
                </Text>
                <View className="flex-row flex-wrap gap-1.5 mt-2.5">
                  {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                    <View key={idx} className="bg-indigo-100 px-2 py-1 rounded-md">
                      <Text className="text-xs text-indigo-700">{amenity}</Text>
                    </View>
                  ))}
                </View>
                {hotel.warnings && (
                  <View className="mt-2.5 p-2 bg-yellow-100 rounded-md">
                    <Text className="text-xs text-yellow-800">⚠️ {hotel.warnings}</Text>
                  </View>
                )}
                <TouchableOpacity
                  className="bg-purple-500 p-3 rounded-lg items-center mt-3"
                  onPress={() => handleHotelBook(hotel.bookingUrl)}
                >
                  <Text className="text-white text-sm font-semibold">Book on Booking.com →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Tourist Traps to Avoid */}
        {data.touristTraps && data.touristTraps.length > 0 && (
          <View className="bg-red-100 m-4 mt-0 p-4 rounded-xl">
            <Text className="text-lg font-bold mb-3 text-gray-800">🚫 Tourist Traps to Avoid</Text>
            {data.touristTraps.map((trap) => (
              <View key={trap.id} className="mb-2.5 pb-2.5 border-b border-red-200 last:border-0 last:mb-0 last:pb-0">
                <Text className="text-base font-semibold text-red-800">{trap.name}</Text>
                <Text className="text-xs text-red-700 mt-0.5">{trap.reason}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Local Tips */}
        {data.localTips && data.localTips.length > 0 && (
          <View className="bg-blue-100 m-4 mt-0 p-4 rounded-xl">
            <Text className="text-lg font-bold mb-3 text-gray-800">💡 Local Tips</Text>
            {data.localTips.map((tip, idx) => (
              <Text key={idx} className="text-sm text-blue-800 mb-1.5 last:mb-0">• {tip}</Text>
            ))}
          </View>
        )}

        {/* Warnings */}
        {data.warnings && data.warnings.length > 0 && (
          <View className="bg-yellow-100 m-4 mt-0 p-4 rounded-xl">
            <Text className="text-lg font-bold mb-3 text-gray-800">⚠️ Important Warnings</Text>
            {data.warnings.map((warning) => (
              <View key={warning.id} className="mb-2.5 last:mb-0">
                <Text className="text-sm font-semibold text-yellow-800">{warning.title}</Text>
                <Text className="text-xs text-yellow-700 mt-0.5">{warning.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Daily Itinerary */}
        {data.days.map((day, index) => (
          <View key={day.id || `day-${index}`} className="mb-4">
            <Text className="text-xl font-bold px-4 pt-4 pb-1 text-gray-900">Day {day.dayNumber}</Text>
            {day.description && (
              <Text className="text-base text-gray-600 px-4 pb-1">{day.description}</Text>
            )}
            {day.routeDescription && (
              <Text className="text-xs text-sky-700 px-4 pb-3 italic">🗺️ {day.routeDescription}</Text>
            )}

            {day.locations.map((location, locIndex) => (
              <LocationItem key={`${day.id || `day-${index}`}-${location.id}-${locIndex}`} location={location} index={locIndex} />
            ))}
          </View>
        ))}

        {/* Legend */}
        <View className="bg-white m-4 p-4 rounded-xl">
          <Text className="text-base font-bold mb-3">Legend</Text>
          <View className="flex-row items-center mb-2">
            <View className="w-3 h-3 rounded-full mr-3 bg-green-500" />
            <Text className="text-sm text-gray-600">Hidden Gem - Authentic local spot</Text>
          </View>
          <View className="flex-row items-center mb-2">
            <View className="w-3 h-3 rounded-full mr-3 bg-orange-500" />
            <Text className="text-sm text-gray-600">Conditional - Good at specific times</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded-full mr-3 bg-red-500" />
            <Text className="text-sm text-gray-600">Tourist Trap - Avoid</Text>
          </View>
        </View>


      </ScrollView>

      {/* Bottom Navigation */}
      <View className="flex-row bg-white p-4 border-t border-gray-200 gap-3">
        <TouchableOpacity
          className="flex-1 p-3.5 bg-blue-500 rounded-xl items-center"
          onPress={() => router.back()}
        >
          <Text className="text-white text-base font-semibold">← Back to Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 p-3.5 bg-blue-500 rounded-xl items-center"
          onPress={() => router.push({
            pathname: '/checklist',
            params: { itineraryId: data.itinerary.id }
          })}
        >
          <Text className="text-white text-base font-semibold">📋 Checklist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 p-3.5 bg-gray-500 rounded-xl items-center"
          onPress={() => router.push('/')}
        >
          <Text className="text-white text-base font-semibold">New Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
