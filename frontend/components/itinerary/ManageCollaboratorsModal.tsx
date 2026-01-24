import React from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { X, UserMinus, Shield, Eye } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../ui/ToastMessage';
import { useItineraryCollaborators, useRemoveCollaborator } from '../../hooks/queries/useItineraryShares';
import type { ItineraryShare } from '../../services/itinerary-share';

interface ManageCollaboratorsModalProps {
  visible: boolean;
  itineraryId: string;
  onClose: () => void;
}

export function ManageCollaboratorsModal({ visible, itineraryId, onClose }: ManageCollaboratorsModalProps) {
  const { data: collaborators, isLoading } = useItineraryCollaborators(itineraryId);
  const removeCollaborator = useRemoveCollaborator();

  const handleRemove = (shareId: string, userName: string) => {
    Alert.alert(
      'Remove Collaborator',
      `Remove ${userName} from this itinerary?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeCollaborator.mutateAsync({ shareId, itineraryId });
              Toast.show({
                type: 'success',
                text1: 'Success',
                text2: 'Collaborator removed'
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to remove collaborator'
              });
              console.error('Remove error:', error);
            }
          }
        }
      ]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return { text: 'Pending', bg: 'bg-yellow-100', color: 'text-yellow-800' };
      case 'ACCEPTED':
        return { text: 'Active', bg: 'bg-green-100', color: 'text-green-800' };
      case 'REJECTED':
        return { text: 'Declined', bg: 'bg-red-100', color: 'text-red-800' };
      default:
        return { text: status, bg: 'bg-gray-100', color: 'text-gray-800' };
    }
  };

  const renderCollaborator = ({ item }: { item: ItineraryShare }) => {
    const statusBadge = getStatusBadge(item.status);
    const isOwner = item.permission === 'OWNER';

    return (
      <View className="flex-row items-center p-4 border-b border-gray-100 bg-white">
        <Image 
          source={{ uri: item.user?.avatarUrl || 'https://via.placeholder.com/50' }} 
          className="w-12 h-12 rounded-full bg-gray-200"
        />
        
        <View className="ml-4 flex-1">
          <Text className="text-base font-semibold text-gray-800">{item.user?.name}</Text>
          <Text className="text-sm text-gray-500">@{item.user?.username}</Text>
          
          <View className="flex-row items-center mt-1 gap-2">
            {/* Permission Badge */}
            <View className={`flex-row items-center px-2 py-0.5 rounded-md ${isOwner ? 'bg-purple-100' : 'bg-blue-100'}`}>
              {isOwner ? (
                <Shield size={12} color="#7C3AED" />
              ) : (
                <Eye size={12} color="#2563EB" />
              )}
              <Text className={`text-xs font-medium ml-1 ${isOwner ? 'text-purple-800' : 'text-blue-800'}`}>
                {item.permission}
              </Text>
            </View>

            {/* Status Badge */}
            <View className={`px-2 py-0.5 rounded-md ${statusBadge.bg}`}>
              <Text className={`text-xs font-medium ${statusBadge.color}`}>
                {statusBadge.text}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Remove Button (only for non-owners) */}
        {!isOwner && (
          <TouchableOpacity
            onPress={() => handleRemove(item.id, item.user?.name || 'this user')}
            disabled={removeCollaborator.isPending}
            className="p-2"
          >
            {removeCollaborator.isPending ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <UserMinus size={20} color="#EF4444" />
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const activeCollaborators = collaborators?.filter(c => c.status === 'ACCEPTED') || [];
  const pendingCollaborators = collaborators?.filter(c => c.status === 'PENDING') || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl h-5/6">
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 py-4 border-b border-gray-200">
            <View>
              <Text className="text-xl font-bold text-gray-800">Collaborators</Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                {activeCollaborators.length} active, {pendingCollaborators.length} pending
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Collaborators List */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#094772" />
              <Text className="text-gray-500 mt-4">Loading collaborators...</Text>
            </View>
          ) : !collaborators || collaborators.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <Shield size={64} color="#D1D5DB" />
              <Text className="text-gray-800 text-lg font-semibold mt-4 text-center">
                No Collaborators
              </Text>
              <Text className="text-gray-500 mt-2 text-center">
                Invite friends to share this itinerary with them
              </Text>
            </View>
          ) : (
            <FlatList
              data={collaborators}
              renderItem={renderCollaborator}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
          <Toast config={customToastConfig} />
        </View>
      </View>
    </Modal>
  );
}
