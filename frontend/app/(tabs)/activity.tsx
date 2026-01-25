import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, MessageCircle, Search } from 'lucide-react-native';
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
import { useOnlineStatus } from '../../hooks/queries/useOnlineStatus';
import Toast from 'react-native-toast-message';

import { ActivityTabs } from '../../components/activity/ActivityTabs';
import { NotificationItem } from '../../components/activity/NotificationItem';
import { FriendConversationItem } from '../../components/activity/FriendConversationItem';

type Tab = 'notifications' | 'messages';

export default function ActivityScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('notifications');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Notifications Data
    const { data: notifications = [], isLoading, refetch } = useNotifications();
    const markAllReadMutation = useMarkAllNotificationsRead();
    const markReadMutation = useMarkNotificationRead();

    // Mark all notifications as read when viewing the notifications tab
    useEffect(() => {
        if (activeTab === 'notifications') {
            markAllReadMutation.mutate();
        }
    }, [activeTab, markAllReadMutation]);

    // Friend Request Mutations
    const acceptMutation = useAcceptFriendRequest();
    const rejectMutation = useRejectFriendRequest();
    
    // Friends and Conversations Data
    const { data: friends = [] } = useFriends();
    const { data: pendingRequests = [] } = usePendingRequests();
    const { 
        data: conversationsData, 
        isLoading: conversationsLoading,
        refetch: refetchConversations
    } = useInfiniteConversations();
    const createConversationMutation = useCreateConversation();

    // Flatten conversations from infinite query
    const conversations = useMemo(() => {
        return conversationsData?.pages.flatMap(page => page.data) || [];
    }, [conversationsData]);

    // Get online status for all friends
    const friendIds = useMemo(() => friends.map(f => f.id), [friends]);
    const { data: onlineStatus = {} } = useOnlineStatus(friendIds);

    // Merge friends with their conversation data
    interface FriendWithConversation extends User {
        conversation?: Conversation;
        lastMessageAt?: Date;
        unreadCount?: number;
    }

    const friendsWithConversations = useMemo((): FriendWithConversation[] => {
        return friends.map(friend => {
            // Find conversation with this friend
            const conversation = conversations.find(conv => {
                if (conv.type !== 'DIRECT') return false;
                return conv.participants.some(p => p.userId === friend.id);
            });

            return {
                ...friend,
                conversation,
                lastMessageAt: conversation?.lastMessage ? new Date(conversation.lastMessage.createdAt) : undefined,
                unreadCount: conversation?.unreadCount || 0,
            };
        }).sort((a, b) => {
            // Sort: unread first, then by last message time, then alphabetically
            if ((a.unreadCount || 0) > 0 && (b.unreadCount || 0) === 0) return -1;
            if ((a.unreadCount || 0) === 0 && (b.unreadCount || 0) > 0) return 1;
            if (a.lastMessageAt && b.lastMessageAt) {
                return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
            }
            if (a.lastMessageAt) return -1;
            if (b.lastMessageAt) return 1;
            return a.name.localeCompare(b.name);
        });
    }, [friends, conversations]);

    // Filter friends based on search
    const filteredFriends = useMemo(() => {
        if (!searchQuery.trim()) return friendsWithConversations;
        const query = searchQuery.toLowerCase();
        return friendsWithConversations.filter(friend => 
            friend.name.toLowerCase().includes(query) ||
            friend.username.toLowerCase().includes(query)
        );
    }, [friendsWithConversations, searchQuery]);

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
            router.push(`/chat/conversationId?id=${conversation.id}`);
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to open chat'
            });
        }
    };

    const handleConversationPress = (conversation: Conversation) => {
        router.push(`/chat/conversationId?id=${conversation.id}`);
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

    const renderNotificationItem = ({ item }: { item: Notification }) => {
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
            <NotificationItem
                notification={item}
                onPress={handleNotificationPress}
                onAccept={(id) => handleAction('accept')}
                onReject={(id) => handleAction('reject')}
                showActions={showActions}
                formatTime={formatTime}
            />
        );
    };

    const renderFriendWithConversation = ({ item }: { item: typeof friendsWithConversations[0] }) => {
        const isOnline = onlineStatus[item.id] || false;
        
        return (
            <FriendConversationItem
                friend={item}
                isOnline={isOnline}
                onPress={() => item.conversation 
                    ? handleConversationPress(item.conversation)
                    : handleFriendPress(item)
                }
                isLoading={createConversationMutation.isPending}
                formatTime={formatTime}
            />
        );
    };

    const renderMessagesTab = () => {
        return (
            <View className="flex-1">
                {/* Search Bar */}
                <View className="px-4 py-2">
                    <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-1">
                        <Search size={15} color="#9ca3af" />
                        <TextInput
                            placeholder="Search friends..."
                            placeholderTextColor="#9ca3af"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            className="flex-1 ml-2 text-gray-900 text-sm"
                        />
                    </View>
                </View>

                {conversationsLoading ? (
                    <View className="flex-1 items-center justify-center">
                        <ActivityIndicator size="large" color="#4F46E5" />
                    </View>
                ) : filteredFriends.length > 0 ? (
                    <FlatList
                        data={filteredFriends}
                        renderItem={renderFriendWithConversation}
                        keyExtractor={item => item.id}
                        refreshing={conversationsLoading}
                        onRefresh={refetchConversations}
                        contentContainerStyle={{ paddingBottom: 20 }}
                    />
                ) : (
                    <View className="flex-1 items-center justify-center p-8">
                        <View className="w-20 h-20 bg-gray-50 rounded-full items-center justify-center mb-4">
                            <MessageCircle size={40} color="#94a3b8" />
                        </View>
                        <Text className="text-xl font-bold text-gray-900 mb-2">No friends yet</Text>
                        <Text className="text-gray-500 text-center leading-6">
                            Add some friends to start chatting!
                        </Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="px-5 pt-1 pb-2 bg-white">
                <Text className="text-[#094772] text-3xl font-extrabold">Activity</Text>
            </View>

            {/* Tabs */}
            <ActivityTabs activeTab={activeTab} onTabChange={setActiveTab} />

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
