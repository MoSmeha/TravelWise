import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, Wallet, Check, X, UserPlus } from 'lucide-react-native';
import { useSharedItineraries, useAcceptInvitation, useRejectInvitation } from '../../hooks/queries/useItineraryShares';
import type { ItineraryShare } from '../../types/schemas';

const COUNTRY_IMAGES: Record<string, string> = {
  'Lebanon': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1000&auto=format&fit=crop',
  'France': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000&auto=format&fit=crop',
  'Italy': 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000&auto=format&fit=crop',
  'Japan': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  'default': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop',
};

export function SharedItinerariesList() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'pending' | 'accepted'>('pending');
  const { data: allShares, isLoading, refetch, isRefetching } = useSharedItineraries();
  const acceptInvitation = useAcceptInvitation();
  const rejectInvitation = useRejectInvitation();

  // Filter by status based on active tab
  const shares = allShares?.filter(share => 
    activeTab === 'pending' ? share.status === 'PENDING' : share.status === 'ACCEPTED'
  ) || [];

  const handleAccept = async (shareId: string) => {
    try {
      await acceptInvitation.mutateAsync(shareId);
    } catch (error) {
      console.error('Accept error:', error);
    }
  };

  const handleReject = async (shareId: string) => {
    try {
      await rejectInvitation.mutateAsync(shareId);
    } catch (error) {
      console.error('Reject error:', error);
    }
  };

  const handleViewItinerary = (itineraryId: string) => {
    router.push({
      pathname: '/map',
      params: { itineraryId }
    });
  };

  const renderShare = ({ item }: { item: ItineraryShare }) => {
    const countryName = item.itinerary?.country || 'Unknown';
    const imageUri = COUNTRY_IMAGES[countryName] || COUNTRY_IMAGES['default'];
    const isPending = item.status === 'PENDING';

    return (
      <TouchableOpacity
        onPress={() => !isPending && handleViewItinerary(item.itineraryId)}
        disabled={isPending}
        className="mb-4 mx-1 rounded-2xl bg-white overflow-hidden shadow-sm elevation-2"
      >
        {/* Image Section */}
        <View className="h-[140px] w-full relative">
          <Image 
            source={{ uri: imageUri }} 
            className="w-full h-full"
            resizeMode="cover"
          />
          <View className="absolute inset-0 bg-black/30" />
          
          <View className="absolute bottom-3 left-3">
            <Text className="text-white text-xl font-bold">{item.itinerary?.country}</Text>
            <View className="flex-row gap-2 mt-1">
              <View className="flex-row items-center bg-white/20 px-2 py-1 rounded-lg">
                <Calendar size={10} color="white" />
                <Text className="text-white text-xs ml-1 font-semibold">
                  {item.itinerary?.numberOfDays} days
                </Text>
              </View>
              {item.itinerary?.budgetUSD && (
                <View className="flex-row items-center bg-white/20 px-2 py-1 rounded-lg">
                  <Wallet size={10} color="white" />
                  <Text className="text-white text-xs ml-1 font-semibold">
                    ${item.itinerary.budgetUSD}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Permission Badge */}
          <View className="absolute top-3 right-3">
            <View className={`px-2 py-1 rounded-lg ${item.permission === 'OWNER' ? 'bg-purple-600' : 'bg-blue-600'}`}>
              <Text className="text-white text-xs font-bold">
                {item.permission === 'OWNER' ? 'Owner' : 'Viewer'}
              </Text>
            </View>
          </View>
        </View>

        {/* Content Section */}
        <View className="px-4 py-3">
          {/* Inviter Info */}
          <View className="flex-row items-center mb-3">
            <Image
              source={{ uri: item.inviter?.avatarUrl || 'https://via.placeholder.com/32' }}
              className="w-8 h-8 rounded-full bg-gray-200"
            />
            <Text className="ml-2 text-gray-600 text-sm">
              Shared by <Text className="font-semibold text-gray-800">{item.inviter?.name}</Text>
            </Text>
          </View>

          {/* Action Buttons for Pending */}
          {isPending && (
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => handleAccept(item.id)}
                disabled={acceptInvitation.isPending}
                className="flex-1 flex-row items-center justify-center bg-green-600 py-2.5 rounded-xl"
              >
                {acceptInvitation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Check size={16} color="white" />
                    <Text className="text-white font-bold text-sm ml-1">Accept</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleReject(item.id)}
                disabled={rejectInvitation.isPending}
                className="flex-1 flex-row items-center justify-center bg-red-500 py-2.5 rounded-xl"
              >
                {rejectInvitation.isPending ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <X size={16} color="white" />
                    <Text className="text-white font-bold text-sm ml-1">Decline</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* View Button for Accepted */}
          {!isPending && (
            <TouchableOpacity
              onPress={() => handleViewItinerary(item.itineraryId)}
              className="bg-[#094772] py-2.5 rounded-xl"
            >
              <Text className="text-white font-bold text-sm text-center">View Itinerary</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Tabs */}
      <View className="flex-row bg-white border-b border-gray-200 px-5">
        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          className={`flex-1 items-center py-4 border-b-2 ${activeTab === 'pending' ? 'border-[#094772]' : 'border-transparent'}`}
        >
          <Text className={`font-semibold ${activeTab === 'pending' ? 'text-[#094772]' : 'text-gray-500'}`}>
            Pending ({allShares?.filter(s => s.status === 'PENDING').length || 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveTab('accepted')}
          className={`flex-1 items-center py-4 border-b-2 ${activeTab === 'accepted' ? 'border-[#094772]' : 'border-transparent'}`}
        >
          <Text className={`font-semibold ${activeTab === 'accepted' ? 'text-[#094772]' : 'text-gray-500'}`}>
            Shared ({allShares?.filter(s => s.status === 'ACCEPTED').length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#094772" />
          <Text className="text-gray-500 mt-4">Loading shared itineraries...</Text>
        </View>
      ) : shares.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <UserPlus size={64} color="#D1D5DB" />
          <Text className="text-gray-800 text-lg font-semibold mt-4 text-center">
            {activeTab === 'pending' ? 'No Pending Invitations' : 'No Shared Itineraries'}
          </Text>
          <Text className="text-gray-500 mt-2 text-center">
            {activeTab === 'pending'
              ? 'When friends share itineraries with you, they\'ll appear here'
              : 'Accepted shared itineraries will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={shares}
          renderItem={renderShare}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
        />
      )}
    </View>
  );
}
