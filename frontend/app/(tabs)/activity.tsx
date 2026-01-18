import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Users, 
  Check, 
  X,
  Bell,
  Search
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { 
    useNotifications, 
    useMarkAllNotificationsRead,
    useMarkNotificationRead,
    Notification 
} from '../../hooks/queries/useNotifications';
import { 
    useAcceptFriendRequest, 
    useRejectFriendRequest,
    useFriends,
    usePendingRequests,
    User
} from '../../hooks/queries/useFriends';
import {
    useInfiniteConversations,
    useCreateConversation,
    Conversation
} from '../../hooks/queries/useMessages';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../store/authStore';

type Tab = 'notifications' | 'messages';

export default function ActivityScreen() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('notifications');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Notifications Data
    const { data: notifications = [], isLoading, refetch } = useNotifications();
    const markAllReadMutation = useMarkAllNotificationsRead();
    const markReadMutation = useMarkNotificationRead();

    // Friend Request Mutations
    const acceptMutation = useAcceptFriendRequest();
    const rejectMutation = useRejectFriendRequest();
    
    // Friends and Conversations Data
    const { data: friends = [] } = useFriends();
    const { data: pendingRequests = [] } = usePendingRequests();
    const { 
        data: conversationsData, 
        isLoading: conversationsLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch: refetchConversations
    } = useInfiniteConversations();
    const createConversationMutation = useCreateConversation();

    // Flatten conversations from infinite query
    const conversations = useMemo(() => {
        return conversationsData?.pages.flatMap(page => page.data) || [];
    }, [conversationsData]);

    // Filter friends based on search
    const filteredFriends = useMemo(() => {
        if (!searchQuery.trim()) return friends;
        const query = searchQuery.toLowerCase();
        return friends.filter(friend => 
            friend.name.toLowerCase().includes(query) ||
            friend.username.toLowerCase().includes(query)
        );
    }, [friends, searchQuery]);

    const handleAccept = async (id: string) => {
        try {
            await acceptMutation.mutateAsync(id);
            Toast.show({
                type: 'success',
                text1: 'Accepted',
                text2: 'Friend request accepted'
            });
        } catch (error: any) {
             Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to accept request'
            });
        }
    };

    const handleReject = async (id: string) => {
        try {
           await rejectMutation.mutateAsync(id);
           Toast.show({
                type: 'info',
                text1: 'Rejected',
                text2: 'Friend request rejected'
            });
        } catch (error: any) {
             Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to reject request'
            });
        }
    };

    const handleNotificationPress = (notification: Notification) => {
        if (!notification.read) {
            markReadMutation.mutate(notification.id);
        }
        
        if (notification.type === 'FRIEND_REQUEST' || notification.type === 'FRIEND_ACCEPTED') {
            router.push('/friends');
        }
    };

    const handleFriendPress = async (friend: User) => {
        try {
            // Create or get existing conversation
            const conversation = await createConversationMutation.mutateAsync(friend.id);
            // Navigate to chat screen
            router.push(`/chat/${conversation.id}`);
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to open chat'
            });
        }
    };

    const handleConversationPress = (conversation: Conversation) => {
        router.push(`/chat/${conversation.id}`);
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours}h ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays}d ago`;
        
        return date.toLocaleDateString();
    };

    // Get the other participant in a direct conversation
    const getOtherParticipant = (conversation: Conversation) => {
        if (conversation.type === 'DIRECT') {
            return conversation.participants.find(p => p.userId !== currentUser?.id)?.user;
        }
        return null;
    };

    const renderNotificationItem = ({ item }: { item: Notification }) => {
        let Icon = Bell;
        let iconColor = '#64748b';
        let iconBgColor = '#f1f5f9';

        if (item.type === 'FRIEND_REQUEST') {
            Icon = UserPlus;
            iconColor = '#4F46E5';
            iconBgColor = '#e0e7ff';
        } else if (item.type === 'FRIEND_ACCEPTED') {
            Icon = Users;
            iconColor = '#10B981';
            iconBgColor = '#d1fae5';
        } else if (item.title.toLowerCase().includes('liked')) {
             Icon = Heart;
             iconColor = '#ec4899';
             iconBgColor = '#fce7f3';
        } else if (item.title.toLowerCase().includes('commented')) {
             Icon = MessageCircle;
             iconColor = '#3b82f6';
             iconBgColor = '#dbeafe';
        }

        const isFriendRequest = item.type === 'FRIEND_REQUEST';
        const friendshipId = item.data?.friendshipId;
        const requesterId = item.data?.requesterId;
        const isAlreadyFriend = friends.some(f => f.id === requesterId);
        const isPending = pendingRequests.some(r => r.id === friendshipId);
        const showActions = isFriendRequest && friendshipId && !isAlreadyFriend && isPending;

        const handleAction = async (action: 'accept' | 'reject') => {
            if (!friendshipId) return;
            
            if (!item.read) {
                markAllReadMutation.mutate(); 
            }
            
            if (action === 'accept') {
                await handleAccept(friendshipId);
            } else {
                await handleReject(friendshipId);
            }
        };

        return (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => handleNotificationPress(item)}
                className="flex-row p-4 items-center border-b border-gray-100 border-dashed"
            >
               <View className={`w-12 h-12 rounded-full items-center justify-center mr-4`} style={{backgroundColor: iconBgColor}}>
                    <Icon size={24} color={iconColor} strokeWidth={1.5} />
               </View>
               
               <View className="flex-1 mr-2">
                   <Text className="text-gray-900 font-medium text-base mb-1">
                        <Text className="font-normal text-gray-600">{item.message}</Text>
                   </Text>
                   <Text className="text-gray-400 text-xs font-medium">
                       {formatTime(item.createdAt)}
                   </Text>
               </View>

               {showActions && (
                   <View className="flex-row gap-2 mr-2">
                       <TouchableOpacity 
                            onPress={(e) => {
                                e.stopPropagation();
                                handleAction('reject');
                            }}
                            className="bg-gray-100 p-2 rounded-full"
                       >
                           <X size={20} color="#EF4444" strokeWidth={2} />
                       </TouchableOpacity>

                       <TouchableOpacity 
                            onPress={(e) => {
                                e.stopPropagation();
                                handleAction('accept');
                            }}
                            className="bg-indigo-100 p-2 rounded-full"
                       >
                           <Check size={20} color="#4F46E5" strokeWidth={2} />
                       </TouchableOpacity>
                   </View>
               )}

               {!item.read && (
                   <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
               )}
            </TouchableOpacity>
        );
    };

    const renderConversationItem = ({ item }: { item: Conversation }) => {
        const otherUser = getOtherParticipant(item);
        const displayName = item.type === 'GROUP' ? item.name : otherUser?.name;
        const avatarUrl = item.type === 'GROUP' ? item.imageUrl : otherUser?.avatarUrl;
        
        return (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => handleConversationPress(item)}
                className="flex-row p-4 items-center border-b border-gray-100"
            >
                {avatarUrl ? (
                    <Image 
                        source={{ uri: avatarUrl }} 
                        className="w-12 h-12 rounded-full mr-4"
                    />
                ) : (
                    <View className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center mr-4">
                        <Text className="text-indigo-600 font-bold text-lg">
                            {displayName?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </View>
                )}
                
                <View className="flex-1 mr-2">
                    <Text className="text-gray-900 font-semibold text-base">
                        {displayName || 'Unknown'}
                    </Text>
                    {item.lastMessage && (
                        <Text className="text-gray-500 text-sm mt-0.5" numberOfLines={1}>
                            {item.lastMessage.content}
                        </Text>
                    )}
                </View>

                <View className="items-end">
                    {item.lastMessage && (
                        <Text className="text-gray-400 text-xs">
                            {formatTime(item.lastMessage.createdAt)}
                        </Text>
                    )}
                    {(item.unreadCount || 0) > 0 && (
                        <View className="bg-indigo-600 rounded-full min-w-[20px] h-5 items-center justify-center mt-1 px-1.5">
                            <Text className="text-white text-xs font-bold">
                                {item.unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderFriendItem = ({ item }: { item: User }) => {
        return (
            <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => handleFriendPress(item)}
                className="flex-row p-4 items-center border-b border-gray-100"
                disabled={createConversationMutation.isPending}
            >
                {item.avatarUrl ? (
                    <Image 
                        source={{ uri: item.avatarUrl }} 
                        className="w-12 h-12 rounded-full mr-4"
                    />
                ) : (
                    <View className="w-12 h-12 rounded-full bg-gray-100 items-center justify-center mr-4">
                        <Text className="text-gray-600 font-bold text-lg">
                            {item.name.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                
                <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-base">
                        {item.name}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                        @{item.username}
                    </Text>
                </View>

                <MessageCircle size={22} color="#6366f1" />
            </TouchableOpacity>
        );
    };

    const renderMessagesTab = () => {
        // Show conversations if any exist, otherwise show friends list
        const hasConversations = conversations.length > 0;

        return (
            <View className="flex-1">
                {/* Search Bar */}
                <View className="px-4 py-2">
                    <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2.5">
                        <Search size={20} color="#9ca3af" />
                        <TextInput
                            placeholder="Search conversations..."
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="flex-1 ml-2 text-gray-900 text-base"
                        />
                    </View>
                </View>

                {conversationsLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#4F46E5" />
                    </View>
                ) : hasConversations ? (
                    <FlatList
                        data={conversations}
                        renderItem={renderConversationItem}
                        keyExtractor={item => item.id}
                        refreshing={conversationsLoading}
                        onRefresh={refetchConversations}
                        onEndReached={() => hasNextPage && fetchNextPage()}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={
                            isFetchingNextPage ? (
                                <View className="py-4">
                                    <ActivityIndicator size="small" color="#4F46E5" />
                                </View>
                            ) : null
                        }
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                ) : filteredFriends.length > 0 ? (
                    <FlatList
                        data={filteredFriends}
                        renderItem={renderFriendItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        ListHeaderComponent={
                            <View className="px-4 py-2">
                                <Text className="text-gray-500 text-sm">
                                    Start a conversation with a friend
                                </Text>
                            </View>
                        }
                    />
                ) : (
                    <View className="flex-1 items-center justify-center p-8">
                        <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                            <MessageCircle size={40} color="#94a3b8" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900 mb-2">No messages yet</Text>
                        <Text className="text-gray-500 text-center leading-6">
                            {friends.length === 0 
                                ? "Add some friends to start chatting!"
                                : "Start a conversation with your travel buddies!"}
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-2 pb-4">
                <Text className="text-3xl font-bold text-gray-900">Activity</Text>
            </View>

            {/* Tabs */}
            <View className="flex-row px-5 mb-2">
                <TouchableOpacity 
                    onPress={() => setActiveTab('notifications')}
                    className={`mr-6 pb-2 border-b-2 ${activeTab === 'notifications' ? 'border-[#0f172a]' : 'border-transparent'}`}
                >
                    <Text className={`text-base font-semibold ${activeTab === 'notifications' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Notifications
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => setActiveTab('messages')}
                    className={`pb-2 border-b-2 ${activeTab === 'messages' ? 'border-[#0f172a]' : 'border-transparent'}`}
                >
                    <Text className={`text-base font-semibold ${activeTab === 'messages' ? 'text-gray-900' : 'text-gray-500'}`}>
                        Messages
                    </Text>
                </TouchableOpacity>
            </View>

            <View className="h-[1px] bg-gray-100 w-full mb-2" />

            {/* Content */}
            {activeTab === 'notifications' ? (
                <FlatList
                    data={notifications}
                    renderItem={renderNotificationItem}
                    keyExtractor={item => item.id}
                    refreshing={isLoading}
                    onRefresh={refetch}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        <View className="items-center justify-center py-20 px-10">
                            <View className="w-16 h-16 bg-gray-50 rounded-full items-center justify-center mb-4">
                                <Bell size={32} color="#94a3b8" />
                            </View>
                            <Text className="text-gray-500 mt-2 text-center text-base font-medium">No notifications yet</Text>
                            <Text className="text-gray-400 text-center text-sm mt-1">We&apos;ll let you know when something happens.</Text>
                        </View>
                    }
                />
            ) : (
                renderMessagesTab()
            )}
        </SafeAreaView>
    );
}
