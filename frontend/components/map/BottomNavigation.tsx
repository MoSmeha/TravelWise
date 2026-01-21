import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Bot, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import type { ItineraryResponse } from '../../types/api';

interface BottomNavigationProps {
  itineraryId: string;
  data: ItineraryResponse;
  isNavigating: boolean;
  onNavigateToItinerary: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  itineraryId,
  data,
  isNavigating,
  onNavigateToItinerary,
}) => {
  const router = useRouter();

  return (
    <View className="absolute bottom-0 left-0 right-0 flex-row bg-white px-6 py-5 border-t border-gray-100 gap-4 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] pb-8">
      <TouchableOpacity
        className="flex-1 bg-[#004e89] rounded-2xl flex-row items-center justify-center gap-2 shadow-lg border-gray-200 h-14"
        onPress={() => router.push({
          pathname: '/chat/new',
          params: { itineraryId }
        })}
      >
        <Bot size={24} color="#fff" strokeWidth={2.5} />
        <Text className="text-white text-base font-bold tracking-wide">AI Assistant</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className={`flex-1 bg-gray-100 rounded-2xl flex-row items-center justify-center gap-2 border border-gray-200 h-14 ${isNavigating ? 'opacity-50' : ''}`}
        onPress={onNavigateToItinerary}
        disabled={isNavigating}
      >
        {isNavigating ? (
          <ActivityIndicator size="small" color="#374151" />
        ) : (
          <>
            <MapPin size={22} color="#374151" strokeWidth={2.5} />
            <Text className="text-gray-700 text-base font-bold tracking-wide">Itinerary</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};
