import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Plane, Users } from 'lucide-react-native';
import { SegmentedTabs, TabOption } from '../../components/common/SegmentedTabs';
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

  const tabs: TabOption[] = useMemo(() => [
    {
      id: 'my-trips',
      label: 'My Trips',
      icon: Plane
    },
    {
      id: 'shared',
      label: 'Shared with me',
      icon: Users
    }
  ], []);

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
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-1 pb-4 bg-white border-b border-gray-200">
        <View className="flex-row justify-between items-start mb-4">
          <View>
            <Text className="text-[#094772] text-3xl font-extrabold">Trips</Text>
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
        <SegmentedTabs 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as 'my-trips' | 'shared')}
          containerClassName="mt-2"
        />
      </View>

      {/* Content */}
      {activeTab === 'my-trips' ? (
        <FlatList
          data={itineraries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: 100, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center justify-center py-20 px-10">
                <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-6">
                  <Plane size={40} color="#94a3b8" strokeWidth={1.5} />
                </View>
                <Text className="text-xl font-bold text-gray-900 mb-2">No trips planned yet</Text>
                <Text className="text-gray-500 text-center leading-6 mb-8">
                  It looks like you haven&apos;t created any trips yet. Start planning your next adventure!
                </Text>
                <TouchableOpacity 
                  onPress={() => router.push('/new-trip')}
                  className="bg-[#094772] px-6 py-3 rounded-full flex-row items-center"
                >
                  <Text className="text-white font-semibold">Create New Trip</Text>
                </TouchableOpacity>
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
    </SafeAreaView>
  );
}
