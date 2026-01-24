import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { useUserItineraries } from '../../hooks/queries/useItineraries';
import { useUser } from '../../hooks/queries/useUser';
import { TripCard } from '../../components/trips/TripCard';
import { useDeleteItinerary } from '../../hooks/queries/useItineraryShares';
import { InviteFriendsModal } from '../../components/itinerary/InviteFriendsModal';
import { SharedItinerariesList } from '../../components/itinerary/SharedItinerariesList';
import { ManageCollaboratorsModal } from '../../components/itinerary/ManageCollaboratorsModal';

export default function TripsScreen() {
  const router = useRouter();
  const { data: user } = useUser();
  const { data: itineraries, isLoading, refetch, isRefetching } = useUserItineraries();
  const deleteItinerary = useDeleteItinerary();
  
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [collaboratorsModalVisible, setCollaboratorsModalVisible] = useState(false);
  const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-trips' | 'shared'>('my-trips');

  const handlePress = (id: string, data: any) => {
    router.push({
      pathname: '/map',
      params: { itineraryId: id }
    });
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Itinerary',
      'Are you sure you want to delete this itinerary? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteItinerary.mutateAsync(id);
              Alert.alert('Success', 'Itinerary deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete itinerary');
              console.error('Delete error:', error);
            }
          }
        }
      ]
    );
  };

  const handleInvite = (id: string) => {
    setSelectedItineraryId(id);
    setInviteModalVisible(true);
  };

  const handleManageCollaborators = (id: string) => {
    setSelectedItineraryId(id);
    setCollaboratorsModalVisible(true);
  };

  const renderItem = ({ item }: { item: any }) => (
    <TripCard
      trip={item}
      user={user}
      onPress={handlePress}
      onDelete={handleDelete}
      onInvite={handleInvite}
      onManageCollaborators={handleManageCollaborators}
    />
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-5 pt-16 pb-4 bg-white border-b border-gray-200">
        <View className="flex-row justify-between items-start mb-4">
          <View>
            <Text className="text-[#094772] text-3xl font-extrabold tracking-tight">Trips</Text>
            <Text className="text-gray-500 text-base mt-0.5">
              {activeTab === 'my-trips' 
                ? `${itineraries ? itineraries.length : 0} saved itineraries`
                : 'Shared with you'}
            </Text>
          </View>
          
          {activeTab === 'my-trips' && (
            <TouchableOpacity 
              onPress={() => router.push('/new-trip')}
              className="bg-[#094772] w-10 h-10 rounded-full items-center justify-center shadow-sm"
            >
              <Text className="text-white font-bold text-xl leading-none pb-0.5">+</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View className="flex-row">
          <TouchableOpacity
            onPress={() => setActiveTab('my-trips')}
            className={`flex-1 items-center pb-3 border-b-2 ${activeTab === 'my-trips' ? 'border-[#094772]' : 'border-transparent'}`}
          >
            <Text className={`font-semibold ${activeTab === 'my-trips' ? 'text-[#094772]' : 'text-gray-500'}`}>
              My Trips
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('shared')}
            className={`flex-1 items-center pb-3 border-b-2 ${activeTab === 'shared' ? 'border-[#094772]' : 'border-transparent'}`}
          >
            <Text className={`font-semibold ${activeTab === 'shared' ? 'text-[#094772]' : 'text-gray-500'}`}>
              Shared with Me
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {activeTab === 'my-trips' ? (
        <FlatList
          data={itineraries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
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
      ) : (
        <SharedItinerariesList />
      )}
      
      {/* Invite Friends Modal */}
      {selectedItineraryId && (
        <InviteFriendsModal
          visible={inviteModalVisible}
          itineraryId={selectedItineraryId}
          onClose={() => {
            setInviteModalVisible(false);
            setSelectedItineraryId(null);
          }}
        />
      )}

      {/* Manage Collaborators Modal */}
      {selectedItineraryId && (
        <ManageCollaboratorsModal
          visible={collaboratorsModalVisible}
          itineraryId={selectedItineraryId}
          onClose={() => {
            setCollaboratorsModalVisible(false);
            setSelectedItineraryId(null);
          }}
        />
      )}
    </View>
  );
}
