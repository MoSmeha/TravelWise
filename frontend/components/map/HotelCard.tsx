import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import type { Hotel } from '../../types/api';

interface HotelCardProps {
  hotel: Hotel;
  onClose: () => void;
  onBook: (url: string) => void;
}

export const HotelCard: React.FC<HotelCardProps> = ({ hotel, onClose, onBook }) => {
  return (
    <View className="absolute bottom-0 left-4 right-4 bg-white rounded-2xl p-4 shadow-lg">
      <TouchableOpacity
        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 items-center justify-center z-10"
        onPress={onClose}
      >
        <Text className="text-gray-500 text-base">✕</Text>
      </TouchableOpacity>

      <View className="self-start px-3 py-1 rounded-full mb-2 bg-violet-500">
        <Text className="text-white text-xs font-semibold">🏨 HOTEL</Text>
      </View>

      <Text className="text-xl font-bold text-gray-900 pr-8 mb-1">{hotel.name}</Text>
      <Text className="text-sm text-gray-500 mb-2">{hotel.neighborhood}</Text>
      
      {hotel.description && (
        <Text className="text-sm text-gray-600 mb-3">
          {hotel.description}
        </Text>
      )}

      <View className="bg-green-50 px-3 py-2 rounded-lg self-start mb-3">
        <Text className="text-green-700 text-sm font-semibold">
          ${hotel.pricePerNightUSD.min}-${hotel.pricePerNightUSD.max}/night
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-1.5 mb-3">
        {hotel.amenities.slice(0, 4).map((amenity, idx) => (
          <View key={idx} className="bg-indigo-50 px-2 py-1 rounded-md">
            <Text className="text-indigo-700 text-xs">{amenity}</Text>
          </View>
        ))}
      </View>

      {hotel.warnings && (
        <View className="bg-amber-50 p-3 rounded-xl mb-3">
          <Text className="text-amber-700 text-sm">⚠️ {hotel.warnings}</Text>
        </View>
      )}

      <TouchableOpacity
        className="bg-violet-500 p-3 rounded-xl items-center"
        onPress={() => onBook(hotel.bookingUrl)}
      >
        <Text className="text-white font-semibold">Book on Booking.com →</Text>
      </TouchableOpacity>
    </View>
  );
};
