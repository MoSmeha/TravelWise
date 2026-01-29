import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
    AlertTriangle, 
    Hotel, 
    Lightbulb, 
    ShieldAlert
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
    StatusBar,
    Platform,
    UIManager
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DayAccordion, ItineraryHeader, BudgetGrid, TouristTrapCard, LocalTipCard, WarningCard } from '../components/itinerary';
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
  
  // Section expansion state
  const [expandTraps, setExpandTraps] = useState(false);
  const [expandTips, setExpandTips] = useState(false);
  const [expandWarnings, setExpandWarnings] = useState(false);

  // Enable LayoutAnimation for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
  }, []);

  // Helper for layout animation
  const toggleSection = (setter: React.Dispatch<React.SetStateAction<boolean>>) => {
    // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Handled by Reanimated in children
    setter(prev => !prev);
  };

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
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <ItineraryHeader 
        countryName={data.country?.name || 'Your Trip'}
        days={data.itinerary.numberOfDays}
        budget={data.itinerary.budgetUSD}
        airport={data.airport.name}
        totalCost={data.itinerary.totalEstimatedCostUSD}
      />

      <ScrollView className="flex-1 -mt-4 bg-gray-50 pt-6 rounded-t-[32px]" showsVerticalScrollIndicator={false}>
        
        {/* Budget Breakdown */}
        {data.itinerary.budgetBreakdown && (
          <BudgetGrid breakdown={data.itinerary.budgetBreakdown} />
        )}

        {/* Hotels Section */}
        {data.hotels && data.hotels.length > 0 && (
          <View className="px-5 mt-8">
            <View className="flex-row items-center mb-4">
              <Hotel size={18} color="#111827" />
              <Text className="text-base font-bold text-gray-900 ml-2">Recommended Stays</Text>
            </View>
            {data.hotels.map((hotel: HotelType) => (
              <View key={hotel.id} className="bg-white p-4 rounded-2xl mb-4 shadow-sm border border-gray-100">
                <Text className="text-lg font-bold text-gray-900">{hotel.name}</Text>
                <Text className="text-sm text-gray-500 mt-0.5">{hotel.neighborhood}</Text>

                <Text className="text-base font-bold text-emerald-600 mt-2">
                  ${hotel.pricePerNightUSD.min}-${hotel.pricePerNightUSD.max}/night
                </Text>
                <View className="flex-row flex-wrap gap-1.5 mt-3">
                  {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                    <View key={idx} className="bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                      <Text className="text-xs text-gray-600 font-medium">{amenity}</Text>
                    </View>
                  ))}
                </View>
                {hotel.warnings && (
                  <View className="mt-3 p-3 bg-amber-50 rounded-xl flex-row items-start">
                    <AlertTriangle size={14} color="#D97706" style={{ marginTop: 2 }} />
                    <Text className="text-sm text-amber-800 ml-2 flex-1 leading-5">{hotel.warnings}</Text>
                  </View>
                )}
                <TouchableOpacity
                  className="p-3.5 rounded-xl items-center mt-4 active:opacity-90"
                  style={{ backgroundColor: '#004e89' }}
                  onPress={() => handleHotelBook(hotel.bookingUrl)}
                >
                  <Text className="text-white text-sm font-bold">Details</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Daily Itinerary */}
        <View className="mt-6 mb-2 pt-6 border-t border-gray-200/60">
           <View className="px-5 mb-4">
             <Text className="text-lg font-bold text-gray-900">Daily Plan</Text>
             <Text className="text-sm text-gray-500">Your step-by-step guide</Text>
           </View>
          {data.days.map((day, index) => (
            <DayAccordion
              key={day.id || `day-${index}`}
              day={day}
              dayIndex={index}
              defaultExpanded={index === 0}
            />
          ))}
        </View>

        {/* Tourist Traps Section */}
        {data.touristTraps && data.touristTraps.length > 0 && (
          <View className="mt-8">
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => toggleSection(setExpandTraps)}
              className="flex-row items-center px-5 mb-3"
            >
              <ShieldAlert size={18} color="#DC2626" />
              <Text className="text-base font-bold text-gray-900 ml-2 flex-1">Tourist Traps to Avoid</Text>
              <Text className="text-xs text-red-600 font-medium ml-2">
                {expandTraps ? 'Collapse' : 'Expand All'}
              </Text>
            </TouchableOpacity>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: 20 }}
              className="flex-row"
            >
              {data.touristTraps.map((trap) => (
                <TouristTrapCard key={trap.id} trap={trap} isExpanded={expandTraps} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Local Tips Section */}
        {data.localTips && data.localTips.length > 0 && (
          <View className="mt-6">
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => toggleSection(setExpandTips)}
              className="flex-row items-center px-5 mb-3"
            >
              <Lightbulb size={18} color="#2563EB" />
              <Text className="text-base font-bold text-gray-900 ml-2 flex-1">Local Tips</Text>
              <Text className="text-xs text-blue-600 font-medium ml-2">
                {expandTips ? 'Collapse' : 'Expand All'}
              </Text>
            </TouchableOpacity>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: 20 }}
              className="flex-row"
            >
              {Array.from(new Set(data.localTips)).map((tip, idx) => (
                <LocalTipCard key={idx} tip={tip} isExpanded={expandTips} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Warnings Section */}
        {data.warnings && data.warnings.length > 0 && (
          <View className="mt-6 mb-8">
            <TouchableOpacity 
              activeOpacity={0.7}
              onPress={() => toggleSection(setExpandWarnings)}
              className="flex-row items-center px-5 mb-3"
            >
              <AlertTriangle size={18} color="#D97706" />
              <Text className="text-base font-bold text-gray-900 ml-2 flex-1">Important Warnings</Text>
              <Text className="text-xs text-amber-600 font-medium ml-2">
                {expandWarnings ? 'Collapse' : 'Expand All'}
              </Text>
            </TouchableOpacity>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={{ paddingHorizontal: 20 }}
              className="flex-row"
            >
              {data.warnings.map((warning) => (
                <WarningCard key={warning.id} warning={warning} isExpanded={expandWarnings} />
              ))}
            </ScrollView>
          </View>
        )}

        <View style={{ height: insets.bottom + 20 }} />

      </ScrollView>
    </View>
  );
}
