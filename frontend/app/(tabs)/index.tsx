import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { 
  useSearchUsers,
  useSendFriendRequest,
  useFriends,
  useSentRequests,
  usePendingRequests,
  User,
  FriendRequest
} from '../../hooks/queries/useFriends';
import { Search } from 'lucide-react-native';

export default function ExploreScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');

    // Query hooks
    const { data: searchResults = [], isLoading: searchLoading } = useSearchUsers(debouncedQuery);
    const { data: friends = [] } = useFriends();
    const { data: sentRequests = [] } = useSentRequests();
    const { data: pendingRequests = [] } = usePendingRequests();
    const sendRequestMutation = useSendFriendRequest();

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    const handleSendRequest = async (userId: string) => {
        try {
            await sendRequestMutation.mutateAsync(userId);
            Toast.show({
                type: 'success',
                text1: 'Request Sent',
                text2: 'Friend request sent successfully'
            });
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to send friend request'
            });
        }
    };

    const renderSearchItem = ({ item }: { item: User }) => {
        const isFriend = friends.some((f: User) => f.id === item.id);
        const isPendingSent = sentRequests.some((r: FriendRequest) => r.addresseeId === item.id);
        const isPendingReceived = pendingRequests.some((r: FriendRequest) => r.requesterId === item.id);
        const isPending = isPendingSent || isPendingReceived;

        return (
            <View className="flex-row items-center p-4 bg-white border-b border-gray-100">
                <Image 
                    source={{ uri: item.avatarUrl || 'https://via.placeholder.com/50' }} 
                    className="w-12 h-12 rounded-full bg-gray-200"
                />
                <View className="ml-4 flex-1">
                    <Text className="text-base font-semibold text-gray-800">{item.name}</Text>
                    <Text className="text-sm text-gray-500">@{item.username}</Text>
                </View>
                {!isFriend && !isPending && (
                    <TouchableOpacity 
                        onPress={() => handleSendRequest(item.id)}
                        className="px-4 py-2 bg-indigo-600 rounded-full"
                        disabled={sendRequestMutation.isPending}
                    >
                        <Text className="text-white font-medium text-sm">Add</Text>
                    </TouchableOpacity>
                )}
                {!isFriend && isPending && (
                     <View className="px-4 py-2 bg-gray-100 rounded-full">
                        <Text className="text-gray-500 font-medium text-sm">Pending</Text>
                    </View>
                )}
                {isFriend && (
                    <View className="px-4 py-2 bg-gray-100 rounded-full">
                        <Text className="text-gray-500 font-medium text-sm">Friends</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            <View className="px-5 pt-2 pb-4">
                <Text className="text-3xl font-bold text-gray-900 mb-4">Explore</Text>
                
                <View className="flex-row items-center bg-gray-100 rounded-xl px-4 py-3">
                    <Search size={20} color="#64748b" />
                    <TextInput
                        placeholder="Search for friends..."
                        className="flex-1 ml-3 text-base text-gray-900"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoCapitalize="none"
                        placeholderTextColor="#94a3b8"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={20} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <View className="flex-1 bg-gray-50">
                {searchLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#4F46E5" />
                    </View>
                ) : (
                    <FlatList
                        data={searchResults}
                        renderItem={renderSearchItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListEmptyComponent={
                            debouncedQuery.length >= 2 ? (
                                <View className="items-center justify-center py-20">
                                    <Text className="text-gray-400">No users found</Text>
                                </View>
                            ) : (
                                <View className="items-center justify-center py-20 px-10">
                                   <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
                                        <Search size={32} color="#94a3b8" />
                                   </View>
                                   <Text className="text-gray-500 font-medium text-lg">Find your friends</Text>
                                   <Text className="text-gray-400 text-center mt-1">
                                       Search for users by name or username to add them to your network.
                                   </Text>
                                </View>
                            )
                        }
                    />
                )}
            </View>
        </SafeAreaView>
    );
}
