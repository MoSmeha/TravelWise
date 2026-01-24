import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, FlatList, ActivityIndicator, Image } from 'react-native';
import Toast from 'react-native-toast-message';
import { X, UserPlus, Check } from 'lucide-react-native';
import { useFriends, type User } from '../../hooks/queries/useFriends';
import { useInviteUser } from '../../hooks/queries/useItineraryShares';

interface InviteFriendsModalProps {
  visible: boolean;
  itineraryId: string;
  onClose: () => void;
}

export function InviteFriendsModal({ visible, itineraryId, onClose }: InviteFriendsModalProps) {
  const { data: friends, isLoading } = useFriends();
  const inviteUser = useInviteUser();
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  const handleToggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleInvite = async () => {
    if (selectedFriends.size === 0) {
      Toast.show({
        type: 'info',
        text1: 'No friends selected',
        text2: 'Please select at least one friend to invite',
      });
      return;
    }

    let successCount = 0;
    let alreadyInvitedCount = 0;
    let errorCount = 0;

    // Invite friends one by one to handle individual failures gracefully
    for (const friendId of Array.from(selectedFriends)) {
      try {
        await inviteUser.mutateAsync({
          itineraryId,
          userId: friendId,
          permission: 'VIEWER'
        });
        successCount++;
      } catch (error: any) {
        // Check if it's a 409 (already invited)
        if (error?.response?.status === 409) {
          alreadyInvitedCount++;
        } else {
          errorCount++;
          console.error('Invite error for user:', friendId, error);
        }
      }
    }

    // Show appropriate toast based on results
    if (successCount > 0 && alreadyInvitedCount === 0 && errorCount === 0) {
      Toast.show({
        type: 'success',
        text1: 'Invitations Sent',
        text2: `Invited ${successCount} friend${successCount > 1 ? 's' : ''} to collaborate`,
      });
    } else if (alreadyInvitedCount > 0 && successCount === 0 && errorCount === 0) {
      Toast.show({
        type: 'info',
        text1: 'Already Invited',
        text2: `${alreadyInvitedCount === 1 ? 'This friend has' : 'These friends have'} already been invited`,
      });
    } else if (successCount > 0 || alreadyInvitedCount > 0) {
      // Mixed results
      const messages = [];
      if (successCount > 0) messages.push(`${successCount} invited`);
      if (alreadyInvitedCount > 0) messages.push(`${alreadyInvitedCount} already invited`);
      if (errorCount > 0) messages.push(`${errorCount} failed`);
      
      Toast.show({
        type: successCount > 0 ? 'success' : 'info',
        text1: 'Invitations Processed',
        text2: messages.join(', '),
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to send invitations',
      });
    }

    setSelectedFriends(new Set());
    onClose();
  };

  const renderFriend = ({ item }: { item: User }) => {
    const isSelected = selectedFriends.has(item.id);
    
    return (
      <TouchableOpacity
        onPress={() => handleToggleFriend(item.id)}
        className={`flex-row items-center p-4 border-b border-gray-100 ${isSelected ? 'bg-blue-50' : 'bg-white'}`}
      >
        <Image 
          source={{ uri: item.avatarUrl || 'https://via.placeholder.com/50' }} 
          className="w-12 h-12 rounded-full bg-gray-200"
        />
        <View className="ml-4 flex-1">
          <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
          <Text className="text-sm text-gray-500">@{item.username}</Text>
        </View>
        
        {isSelected ? (
          <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
            <Check size={16} color="white" />
          </View>
        ) : (
          <View className="w-6 h-6 rounded-full border-2 border-gray-300" />
        )}
      </TouchableOpacity>
    );
  };

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
            <Text className="text-xl font-bold text-gray-800">Invite Friends</Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Friends List */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#094772" />
              <Text className="text-gray-500 mt-4">Loading friends...</Text>
            </View>
          ) : !friends || friends.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <UserPlus size={64} color="#D1D5DB" />
              <Text className="text-gray-800 text-lg font-semibold mt-4 text-center">
                No Friends Yet
              </Text>
              <Text className="text-gray-500 mt-2 text-center">
                Add friends to start sharing your itineraries with them
              </Text>
            </View>
          ) : (
            <>
              <FlatList
                data={friends}
                renderItem={renderFriend}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
              />

              {/* Selected count and Invite button */}
              {selectedFriends.size > 0 && (
                <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 shadow-lg">
                  <TouchableOpacity
                    onPress={handleInvite}
                    disabled={inviteUser.isPending}
                    className={`flex-row items-center justify-center bg-[#094772] rounded-xl py-4 ${inviteUser.isPending ? 'opacity-50' : ''}`}
                  >
                    {inviteUser.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <UserPlus size={20} color="white" />
                        <Text className="text-white font-bold text-base ml-2">
                          Invite {selectedFriends.size} Friend{selectedFriends.size > 1 ? 's' : ''}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
