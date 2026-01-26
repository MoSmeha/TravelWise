import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
    AlertTriangle, 
    ArrowLeft, 
    DollarSign, 
    Hotel, 
    Lightbulb, 
    Plane, 
    ShieldAlert,
    Utensils,
    Car,
    Ticket
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DayAccordion } from '../components/itinerary/DayAccordion';
import { useItineraryStore } from '../store/itineraryStore';
import type { Hotel as HotelType, ItineraryResponse } from '../types/api';

import { useItineraryDetails } from '../hooks/queries/useItineraries';

export default function ItineraryScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  

  const itineraryId = typeof params.itineraryId === 'string' ? params.itineraryId : null;
  

  const { data: fetchedData, isLoading } = useItineraryDetails(itineraryId || '');
  
  const [passedData, setPassedData] = useState<ItineraryResponse | null>(null);
  

  const setActiveItinerary = useItineraryStore((state) => state.setActiveItinerary);

  useEffect(() => {

    if (params.data) {
      try {
        const parsed = JSON.parse(params.data as string);
        setPassedData(parsed);
        
        if (parsed.itinerary?.id) {
          setActiveItinerary(parsed.itinerary.id);
        }
      } catch (error) {
        console.error('Error parsing data:', error);
      }
    } else if (itineraryId) {
      setActiveItinerary(itineraryId);
    }
  }, [params.data, itineraryId, setActiveItinerary]);

  const handleHotelBook = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open booking link');
    });
  };


  const data = (fetchedData as ItineraryResponse) || passedData;

  if (isLoading && !passedData && !data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <ActivityIndicator size="large" color="#094772" />
        <Text className="mt-3 text-gray-500">Loading itinerary...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50">
        <Text className="mt-3 text-gray-500">No itinerary data found</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-4 bg-[#094772] px-6 py-2 rounded-full"
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">

      <View 
        className="bg-white border-b border-gray-200"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-3 p-1"
          >
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">Itinerary</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>

        <View className="bg-white mx-4 mt-4 p-5 rounded-2xl">
          <View className="flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900">
                {data.country?.name || 'Your'} Trip
              </Text>
              <Text className="text-base text-gray-500 mt-1">
                {data.itinerary.numberOfDays} days - ${data.itinerary.budgetUSD} budget
              </Text>
            </View>
            <View className="bg-[#094772] px-3 py-1.5 rounded-full">
              <Text className="text-white text-xs font-semibold">AI Generated</Text>
            </View>
          </View>
          
          <View className="flex-row items-center mt-3">
            <Plane size={16} color="#0284C7" />
            <Text className="text-sm text-sky-600 ml-2">
              Arriving at {data.airport.name} ({data.airport.code})
            </Text>
          </View>
          
          {data.itinerary.totalEstimatedCostUSD && (
            <View className="flex-row items-center mt-2 pt-3 border-t border-gray-100">
              <DollarSign size={18} color="#22C55E" />
              <Text className="text-lg font-bold text-green-600 ml-1">
                Est. Total: ${data.itinerary.totalEstimatedCostUSD} USD
              </Text>
            </View>
          )}
        </View>


        {data.itinerary.budgetBreakdown && (
          <View className="bg-white mx-4 mt-3 p-4 rounded-2xl">
            <Text className="text-base font-bold mb-3 text-gray-800">Budget Breakdown</Text>
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <View className="flex-row items-center">
                <Utensils size={16} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-2">Food</Text>
              </View>
              <Text className="text-sm font-semibold text-green-600">${data.itinerary.budgetBreakdown.food}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <View className="flex-row items-center">
                <Ticket size={16} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-2">Activities</Text>
              </View>
              <Text className="text-sm font-semibold text-green-600">${data.itinerary.budgetBreakdown.activities}</Text>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <View className="flex-row items-center">
                <Car size={16} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-2">Transport</Text>
              </View>
              <Text className="text-sm font-semibold text-green-600">${data.itinerary.budgetBreakdown.transport}</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <View className="flex-row items-center">
                <Hotel size={16} color="#6B7280" />
                <Text className="text-sm text-gray-700 ml-2">Accommodation</Text>
              </View>
              <Text className="text-sm font-semibold text-green-600">${data.itinerary.budgetBreakdown.accommodation}</Text>
            </View>
          </View>
        )}


        {data.hotels && data.hotels.length > 0 && (
          <View className="mx-4 mt-4">
            <View className="flex-row items-center mb-3">
              <Hotel size={18} color="#374151" />
              <Text className="text-base font-bold text-gray-800 ml-2">Recommended Hotels</Text>
            </View>
            {data.hotels.map((hotel: HotelType) => (
              <View key={hotel.id} className="bg-white p-4 rounded-2xl mb-3">
                <Text className="text-lg font-bold text-gray-900">{hotel.name}</Text>
                <Text className="text-sm text-gray-500 mt-0.5">{hotel.neighborhood}</Text>

                <Text className="text-base font-bold text-green-600 mt-2">
                  ${hotel.pricePerNightUSD.min}-${hotel.pricePerNightUSD.max}/night
                </Text>
                <View className="flex-row flex-wrap gap-1.5 mt-2">
                  {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                    <View key={idx} className="bg-gray-100 px-2.5 py-1 rounded-full">
                      <Text className="text-xs text-gray-700">{amenity}</Text>
                    </View>
                  ))}
                </View>
                {hotel.warnings && (
                  <View className="mt-3 p-3 bg-amber-50 rounded-xl flex-row items-start">
                    <AlertTriangle size={16} color="#D97706" />
                    <Text className="text-sm text-amber-800 ml-2 flex-1">{hotel.warnings}</Text>
                  </View>
                )}
                <TouchableOpacity
                  className="bg-[#094772] p-3.5 rounded-xl items-center mt-3"
                  onPress={() => handleHotelBook(hotel.bookingUrl)}
                >
                  <Text className="text-white text-sm font-semibold">Book on Booking.com</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}


        {data.touristTraps && data.touristTraps.length > 0 && (
          <View className="bg-red-50 mx-4 mt-3 p-4 rounded-2xl">
            <View className="flex-row items-center mb-3">
              <ShieldAlert size={18} color="#DC2626" />
              <Text className="text-base font-bold text-gray-800 ml-2">Tourist Traps to Avoid</Text>
            </View>
            {data.touristTraps.map((trap) => (
              <View key={trap.id} className="mb-3 last:mb-0">
                <Text className="text-sm font-semibold text-red-800">{trap.name}</Text>
                <Text className="text-sm text-red-700 mt-0.5">{trap.reason}</Text>
              </View>
            ))}
          </View>
        )}


        {data.localTips && data.localTips.length > 0 && (
          <View className="bg-blue-50 mx-4 mt-3 p-4 rounded-2xl">
            <View className="flex-row items-center mb-3">
              <Lightbulb size={18} color="#2563EB" />
              <Text className="text-base font-bold text-gray-800 ml-2">Local Tips</Text>
            </View>
            {data.localTips.map((tip, idx) => (
              <Text key={idx} className="text-sm text-blue-800 mb-2 last:mb-0 leading-5">{tip}</Text>
            ))}
          </View>
        )}


        {data.warnings && data.warnings.length > 0 && (
          <View className="bg-amber-50 mx-4 mt-3 p-4 rounded-2xl">
            <View className="flex-row items-center mb-3">
              <AlertTriangle size={18} color="#D97706" />
              <Text className="text-base font-bold text-gray-800 ml-2">Important Warnings</Text>
            </View>
            {data.warnings.map((warning) => (
              <View key={warning.id} className="mb-3 last:mb-0">
                <Text className="text-sm font-semibold text-amber-800">{warning.title}</Text>
                <Text className="text-sm text-amber-700 mt-0.5">{warning.description}</Text>
              </View>
            ))}
          </View>
        )}


        <View className="mt-4">
          {data.days.map((day, index) => (
            <DayAccordion
              key={day.id || `day-${index}`}
              day={day}
              dayIndex={index}
              defaultExpanded={index === 0}
            />
          ))}
        </View>


        <View style={{ height: insets.bottom + 20 }} />

      </ScrollView>
    </View>
  );
}
