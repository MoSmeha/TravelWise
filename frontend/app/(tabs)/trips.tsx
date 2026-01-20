import { View, Text, FlatList, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import React from 'react';
import { useUserItineraries } from '../../hooks/queries/useItineraries';
import { useUser } from '../../hooks/queries/useUser';
import { Calendar, Wallet } from 'lucide-react-native';

const COUNTRY_IMAGES: Record<string, string> = {
  'Lebanon': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1000&auto=format&fit=crop',
  'France': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000&auto=format&fit=crop',
  'Italy': 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000&auto=format&fit=crop',
  'Japan': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  'default': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop',
};

const COUNTRY_CODES: Record<string, string> = {
  'Lebanon': 'lb',
  'France': 'fr',
  'Italy': 'it',
  'Japan': 'jp',
  'United States': 'us',
  'United Kingdom': 'gb',
  'Spain': 'es',
};

const getTagTailwindClasses = (tag: string) => {
  const styles = [
    { bg: 'bg-sky-100', text: 'text-sky-700' },
    { bg: 'bg-green-100', text: 'text-green-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-purple-100', text: 'text-purple-700' },
    { bg: 'bg-pink-100', text: 'text-pink-700' },
    { bg: 'bg-orange-100', text: 'text-orange-700' },
  ];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return styles[Math.abs(hash) % styles.length];
};



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

  const renderItem = ({ item }: { item: any }) => {
    const countryName = item.country || 'Unknown';
    const imageUri = COUNTRY_IMAGES[countryName] || COUNTRY_IMAGES['default'];
    const countryCode = COUNTRY_CODES[countryName] || 'un'; 
    const flagUrl = `https://flagcdn.com/w40/${countryCode}.png`;
    const dateString = new Date(item.createdAt).toLocaleDateString();

    return (
      <View className="mb-5 mx-1 rounded-2xl bg-[#f5f5f5] overflow-hidden shadow-sm elevation-2"> 
        {/* Image Section */}
        <View className="h-[180px] w-full relative">
          <Image 
            source={{ uri: imageUri }} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/20" />
          
          <View className="absolute bottom-4 left-4 z-10">
            <View className="flex-row items-center mb-2">
               {countryCode !== 'un' && (
                 <Image source={{ uri: flagUrl }} className="w-6 h-4 rounded-sm mr-2" />
               )}
               <Text className="text-white text-2xl font-bold">{item.country}</Text>
            </View>
            
            <View className="flex-row gap-2">
              <View className="flex-row items-center bg-white/20 px-2 py-1 rounded-lg">
                 <Calendar size={12} color="white" />
                 <Text className="text-white text-xs ml-1 font-semibold">{item.numberOfDays} days</Text>
              </View>
              
              <View className="flex-row items-center bg-white/20 px-2 py-1 rounded-lg">
                 <Wallet size={12} color="white" />
                 <Text className="text-white text-xs ml-1 font-semibold">${item.budgetUSD}</Text>
              </View>
            </View>
          </View>

          {/* User Profile Badge (Absolute positioned) */}
          <View className="absolute top-4 right-4 z-20">
             <View className="bg-white/90 p-0.5 rounded-full">
                {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} className="w-8 h-8 rounded-full" />
                ) : (
                    <View className="bg-purple-600 w-8 h-8 rounded-full items-center justify-center">
                        <Text className="text-white text-sm font-bold">
                            {user?.email ? user.email[0].toUpperCase() : 'U'}
                        </Text>
                    </View>
                )}
             </View>
          </View>
        </View>

        {/* Content Section */}
        <View className="px-4 py-4">
           {/* Tags */}
           <View className="flex-row flex-wrap gap-2 mb-4">
              {item.travelStyles?.map((style: string, index: number) => {
                  const { bg, text } = getTagTailwindClasses(style);
                  return (
                      <View key={index} className={`${bg} px-2.5 py-1 rounded-lg`}>
                          <Text className={`${text} text-[11px] font-bold capitalize`}>
                            {style.replace(/_/g, ' ')}
                          </Text>
                      </View>
                  );
              })}
           </View>
           
           {/* Footer */}
           <View className="flex-row justify-between items-center">
               <Text className="text-gray-400 text-xs">Created {dateString}</Text>
               <TouchableOpacity 
                  onPress={() => handlePress(item.id, item)}
                  className="bg-[#094772] px-4 py-2 rounded-xl"
               >
                   <Text className="text-white font-bold text-xs">View Details</Text>
               </TouchableOpacity>
           </View>
        </View>

      </View>
    );
  };

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
