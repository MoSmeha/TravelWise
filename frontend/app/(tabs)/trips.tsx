import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useUserItineraries } from '../../hooks/queries/useItineraries';
import { useUser } from '../../hooks/queries/useUser';
import { TripCard } from '../../components/trips/TripCard';

export default function TripsScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: itineraries, isLoading, refetch, isRefetching } = useUserItineraries();

  const handlePress = (id: string, data: any) => {
    router.push({
      pathname: '/map',
      params: { itineraryId: id }
    });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TripCard
      trip={item}
      user={user}
      onPress={handlePress}
    />
  );

  return (
    <View className="flex-1 bg-gray-50 px-5 pt-16">
      <View className="flex-row justify-between items-start mb-6">
        <View>
          <Text className="text-[#094772] text-3xl font-extrabold tracking-tight">My Trips</Text>
          <Text className="text-gray-500 text-base mt-0.5">{itineraries ? itineraries.length : 0} saved itineraries</Text>
        </View>
        
        <View className="flex-row items-center gap-3">
            <TouchableOpacity 
                onPress={() => router.push('/new-trip')}
                className="bg-[#094772] w-10 h-10 rounded-full items-center justify-center shadow-sm"
            >
                <Text className="text-white font-bold text-xl leading-none pb-0.5">+</Text>
            </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={itineraries}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
            !isLoading ? (
                <View className="items-center justify-center mt-20">
                    <Text className="text-gray-500 text-lg">No trips yet.</Text>
                </View>
            ) : null
        }
      />
    </View>
  );
}
