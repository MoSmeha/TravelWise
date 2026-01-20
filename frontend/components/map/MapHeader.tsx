import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface MapHeaderProps {
  countryName: string;
  numberOfDays: number;
  locationCount: number;
  itineraryId: string;
}

export const MapHeader: React.FC<MapHeaderProps> = ({
  countryName,
  numberOfDays,
  locationCount,
  itineraryId,
}) => {
  const router = useRouter();

  return (
    <SafeAreaView edges={['top']} className="bg-white shadow-sm z-10 pb-2">
      <View className="flex-row items-center justify-between px-4 pt-2">
        <TouchableOpacity
          className="w-10 h-10 items-center justify-center mr-2"
          onPress={() => router.back()}
        >
          <ArrowLeft size={28} color="#000" />
        </TouchableOpacity>

        <View className="flex-1">
          <Text className="text-xl font-extrabold text-gray-900" numberOfLines={1}>
            {`${countryName || 'Trip'} Adventure`}
          </Text>
          <Text className="text-sm text-gray-500 font-medium">
            {numberOfDays} days • {locationCount} places
          </Text>
        </View>

        <TouchableOpacity
          className="bg-[#004e89] px-4 py-2 rounded-lg shadow-sm"
          onPress={() => router.push({
            pathname: '/checklist',
            params: { itineraryId }
          })}
        >
          <Text className="text-white text-sm font-bold">Checklist</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
