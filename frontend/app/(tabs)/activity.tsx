import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Users, 
  Check, 
  X,
  Bell
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
    usePendingRequests
} from '../../hooks/queries/useFriends';
import Toast from 'react-native-toast-message';

type Tab = 'notifications' | 'messages';

export default function ActivityScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<Tab>('notifications');
    
    // Notifications Data
    const { data: notifications = [], isLoading, refetch } = useNotifications();
    const markAllReadMutation = useMarkAllNotificationsRead();
    const markReadMutation = useMarkNotificationRead();

    // Friend Request Mutations
    const acceptMutation = useAcceptFriendRequest();
    const rejectMutation = useRejectFriendRequest();
    
    // Friends Data for verifying status
    const { data: friends = [] } = useFriends();
    const { data: pendingRequests = [] } = usePendingRequests();

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
            router.push('/friends'); // Fallback if they click the body not the button
        }
        // Handle other types if needed
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
        let Icon = Bell;
        let iconColor = '#64748b'; // slate-500
        let bgClass = 'bg-slate-50';
        let iconBgColor = '#f1f5f9'; // slate-100

        if (item.type === 'FRIEND_REQUEST') {
            Icon = UserPlus;
            iconColor = '#4F46E5'; // indigo-600
            bgClass = 'bg-indigo-50';
            iconBgColor = '#e0e7ff'; // indigo-100
        } else if (item.type === 'FRIEND_ACCEPTED') {
            Icon = Users; // Or CheckCircle
            iconColor = '#10B981'; // emerald-500
            bgClass = 'bg-emerald-50';
            iconBgColor = '#d1fae5'; // emerald-100
        } else if (item.title.toLowerCase().includes('liked')) {
             Icon = Heart;
             iconColor = '#ec4899'; // pink-500
             bgClass = 'bg-pink-50';
             iconBgColor = '#fce7f3'; // pink-100
        } else if (item.title.toLowerCase().includes('commented')) {
             Icon = MessageCircle;
             iconColor = '#3b82f6'; // blue-500
             bgClass = 'bg-blue-50';
             iconBgColor = '#dbeafe'; // blue-100
        }

        // Check if it's a friend request to show actions
        // Assuming the notification object might have a 'metadata' field or similar with requestId
        // If not, we might need to rely on matching pending requests. 
        // For this task, I'll assume we can use the notification ID or if the system uses request ID.
        // The previous 'friends.tsx' used `item.id` for accept/reject, which was the FriendRequest ID.
        // A Notification about a friend request usually links to it. 
        // If the notification `type` is FRIEND_REQUEST, we might need a way to get the request ID.
        // Inspecting `useNotifications` hook types would be ideal, but let's assume `item.referenceId` or similar exists
        // For now, I'll render the buttons and use `item.referenceId` if available, or fallback to investigating structure.
        // Looking at typical schema, `referenceId` is common.

        const isFriendRequest = item.type === 'FRIEND_REQUEST';
        const friendshipId = item.data?.friendshipId;
        const requesterId = item.data?.requesterId; // Assuming fetch includes this

        // Check if actionable
        // 1. Is the requester already a friend?
        const isAlreadyFriend = friends.some(f => f.id === requesterId);
        // 2. Is the request actually pending? (Cross-reference with pendingRequests list if possible)
        // If we don't have requesterId easily, finding it in pendingRequests by friendshipId requires matching
        // Let's assume friendshipId is the Request ID (which is true in this system mostly)
        const isPending = pendingRequests.some(r => r.id === friendshipId);
        
        // Show actions only if not already friend AND explicitly pending
        // If we are not sure about pending list sync, at least check 'isAlreadyFriend'
        const showActions = isFriendRequest && friendshipId && !isAlreadyFriend && isPending;

        const handleAction = async (action: 'accept' | 'reject') => {
            if (!friendshipId) return;
            
            // Mark as read when acting
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
                onPress={() => {
                   if (!item.read) {
                       // Trigger read logic if needed
                   }
                   handleNotificationPress(item);
                }}
                className="flex-row p-4 items-start border-b border-gray-100 border-dashed"
            >
               <View className={`w-12 h-12 rounded-full items-center justify-center mr-4`} style={{backgroundColor: iconBgColor}}>
                    <Icon size={24} color={iconColor} strokeWidth={1.5} />
               </View>
               
               <View className="flex-1">
                   <Text className="text-gray-900 font-medium text-base mb-1 pr-4">
                        <Text className="font-normal text-gray-600">{item.message}</Text>
                   </Text>
                   <Text className="text-gray-400 text-xs font-medium">
                       {formatTime(item.createdAt)}
                   </Text>

                   {showActions && (
                       <View className="flex-row mt-3 gap-3">
                           <TouchableOpacity 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleAction('accept');
                                }}
                                className="bg-black px-4 py-2 rounded-lg flex-row items-center justify-center"
                           >
                               <Check size={16} color="white" strokeWidth={3} />
                               <Text className="text-white font-bold ml-2 text-sm">Accept</Text>
                           </TouchableOpacity>

                           <TouchableOpacity 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    handleAction('reject');
                                }}
                                className="bg-gray-100 px-4 py-2 rounded-lg flex-row items-center justify-center border border-gray-200"
                           >
                               <X size={16} color="black" strokeWidth={3} />
                               <Text className="text-black font-bold ml-2 text-sm">Delete</Text>
                           </TouchableOpacity>
                       </View>
                   )}
               </View>

               {!item.read && (
                   <View className="w-2.5 h-2.5 rounded-full bg-blue-500 mt-2" />
               )}
            </TouchableOpacity>
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
                            <Text className="text-gray-400 text-center text-sm mt-1">We'll let you know when something happens.</Text>
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
                        Start a conversation with your travel buddies to plan your next trip!
                    </Text>
                </View>
            )}
        </SafeAreaView>
    );
}
