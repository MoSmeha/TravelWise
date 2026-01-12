import { View, Text, FlatList, TouchableOpacity, ImageBackground, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useUserItineraries } from '../../hooks/queries/useItineraries';
import { useAuth } from '../../store/authStore';
import { Calendar, Wallet } from 'lucide-react-native';

export default function TripsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { data: itineraries, isLoading, refetch, isRefetching } = useUserItineraries();

  const handlePress = (id: string, data: any) => {
    // Navigate to map with data, similar to how it was done before
    // If the data is fully available here, we pass it, or just ID.
    // The previous implementation passed ID.
    router.push({
      pathname: '/map',
      params: { itineraryId: id }
    });
  };

  const renderItem = ({ item }: { item: any }) => {
    // Mock image for now or use one based on country name partial match if possible
    // Using a reliable Unsplash ID for a travel vibe
    const imageUri = 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop';

    // Format Date: "Created 2h ago" is complex to calc exactly without library like date-fns
    // Simple fallback: Locale Date
    const dateString = new Date(item.createdAt).toLocaleDateString();

    return (
      <View style={{ marginBottom: 24, marginHorizontal: 4, borderRadius: 32, backgroundColor: 'white', overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
        
        {/* Image Section */}
        <View style={{ height: 250, width: '100%', position: 'relative' }}>
          <ImageBackground 
            source={{ uri: imageUri }} 
            style={{ width: '100%', height: '100%', justifyContent: 'flex-end', padding: 16 }}
            resizeMode="cover"
          >
            {/* Overlay Gradient equivalent (darken bottom) */}
            <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
            
            <View style={{ zIndex: 10 }}>
              <Text style={{ color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 12 }}>{item.country}</Text>
              
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 }}>
                   <Calendar size={14} color="white" />
                   <Text style={{ color: 'white', fontSize: 14, marginLeft: 8, fontWeight: '500' }}>{item.numberOfDays} days</Text>
                </View>
                
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999 }}>
                   <Wallet size={14} color="white" />
                   <Text style={{ color: 'white', fontSize: 14, marginLeft: 8, fontWeight: '500' }}>${item.budgetUSD}</Text>
                </View>
              </View>
            </View>
          </ImageBackground>

          {/* User Profile Badge (Absolute positioned) */}
          <View style={{ position: 'absolute', bottom: -24, right: 32, zIndex: 20 }}>
             <View style={{ backgroundColor: 'white', padding: 4, borderRadius: 9999 }}>
                <View style={{ backgroundColor: '#A855F7', width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'white' }}>
                    <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
                        {user?.email ? user.email[0].toUpperCase() : 'N'}
                    </Text>
                </View>
             </View>
          </View>
        </View>

        {/* Content Section */}
        <View className="px-5 pt-8 pb-5">
           {/* Tags */}
           <View className="flex-row flex-wrap gap-2 mb-6">
              {item.travelStyles?.map((style: string, index: number) => (
                  <View key={index} className="bg-gray-100 px-4 py-2 rounded-full">
                      <Text className="text-[#4B5563] font-semibold capitalize">{style}</Text>
                  </View>
              ))}
           </View>
           
           {/* Footer */}
           <View className="flex-row justify-between items-center">
               <Text className="text-gray-400">Created {dateString}</Text>
               <TouchableOpacity 
                  onPress={() => handlePress(item.id, item)}
                  className="border border-gray-200 px-6 py-3 rounded-2xl"
               >
                   <Text className="text-[#0f172a] font-bold text-base">View Details</Text>
               </TouchableOpacity>
           </View>
        </View>

      </View>
    );
  };

  return (
    <View className="flex-1 bg-[#F3F0E9] px-5 pt-16">
      <View className="flex-row justify-between items-start mb-6">
        <View>
          <Text className="text-[#0f172a] text-4xl font-extrabold tracking-tight">My Trips</Text>
          <Text className="text-gray-500 text-lg mt-1">{itineraries ? itineraries.length : 0} saved itineraries</Text>
        </View>
        
        <TouchableOpacity 
            onPress={() => router.push('/new-trip')}
            className="bg-[#0f172a] px-5 py-2.5 rounded-full"
        >
            <Text className="text-white font-bold">New Trip</Text>
        </TouchableOpacity>
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
