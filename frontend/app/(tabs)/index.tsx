import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
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
import { useFriendsFeed, useDiscoverFeed, useLikePost, useUnlikePost } from '../../hooks/queries/usePosts';
import { Search } from 'lucide-react-native';
import { PostCard } from '../../components/post/PostCard';
import { CommentsSheet } from '../../components/post/CommentsSheet';
import { UserSearchItem } from '../../components/explore/UserSearchItem';
import { FeedModeToggle } from '../../components/explore/FeedModeToggle';
import { EmptyFeedState } from '../../components/explore/EmptyFeedState';
import type { Post } from '../../types/post';

type FeedMode = 'friends' | 'discover';

const ExploreHeader = ({ 
    searchQuery, 
    setSearchQuery, 
    isSearching, 
    feedMode, 
    setFeedMode 
}: { 
    searchQuery: string;
    setSearchQuery: (text: string) => void;
    isSearching: boolean;
    feedMode: FeedMode;
    setFeedMode: (mode: FeedMode) => void;
}) => (
    <View className="px-5 pt-1 pb-2 bg-white">
        <Text className="text-3xl font-bold text-gray-900 mb-4">Explore</Text>
        
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-1 mb-4">
            <Search size={15} color="#9ca3af" />
            <TextInput
                placeholder="Search for friends..."
                className="flex-1 ml-2 text-gray-900 text-sm"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                placeholderTextColor="#9ca3af"
            />
        </View>

        {!isSearching && (
            <FeedModeToggle feedMode={feedMode} onModeChange={setFeedMode} />
        )}
    </View>
);

export default function ExploreScreen() {
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [feedMode, setFeedMode] = useState<FeedMode>('friends');

    const { data: searchResults = [], isLoading: searchLoading } = useSearchUsers(debouncedQuery);
    const { data: friends = [] } = useFriends();
    const { data: sentRequests = [] } = useSentRequests();
    const { data: pendingRequests = [] } = usePendingRequests();
    const sendRequestMutation = useSendFriendRequest();

    const {
        data: friendsFeedData,
        isLoading: friendsFeedLoading,
        fetchNextPage: fetchNextFriendsPage,
        hasNextPage: hasNextFriendsPage,
        isFetchingNextPage: isFetchingNextFriendsPage,
        refetch: refetchFriendsFeed,
    } = useFriendsFeed();

    const {
        data: discoverFeedData,
        isLoading: discoverFeedLoading,
        fetchNextPage: fetchNextDiscoverPage,
        hasNextPage: hasNextDiscoverPage,
        isFetchingNextPage: isFetchingNextDiscoverPage,
        refetch: refetchDiscoverFeed,
    } = useDiscoverFeed();

    const likePostMutation = useLikePost();
    const unlikePostMutation = useUnlikePost();

    const posts = feedMode === 'friends' 
        ? (friendsFeedData?.pages.flatMap(page => page.data) || [])
        : (discoverFeedData?.pages.flatMap(page => page.data) || []);
    const feedLoading = feedMode === 'friends' ? friendsFeedLoading : discoverFeedLoading;
    const hasNextPage = feedMode === 'friends' ? hasNextFriendsPage : hasNextDiscoverPage;
    const fetchNextPage = feedMode === 'friends' ? fetchNextFriendsPage : fetchNextDiscoverPage;
    const isFetchingNextPage = feedMode === 'friends' ? isFetchingNextFriendsPage : isFetchingNextDiscoverPage;
    const refetchFeed = feedMode === 'friends' ? refetchFriendsFeed : refetchDiscoverFeed;

    const isSearching = debouncedQuery.length >= 2;

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
            <UserSearchItem
                user={item}
                isFriend={isFriend}
                isPending={isPending}
                onSendRequest={handleSendRequest}
                isLoading={sendRequestMutation.isPending}
            />
        );
    };

    const renderPostItem = ({ item }: { item: Post }) => (
        <PostCard
            post={item}
            onLike={() => likePostMutation.mutate(item.id)}
            onUnlike={() => unlikePostMutation.mutate(item.id)}
            onCommentPress={() => setSelectedPost(item)}
        />
    );

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {isSearching ? (
                <FlatList
                    data={searchResults}
                    renderItem={renderSearchItem}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={
                        <ExploreHeader 
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            isSearching={isSearching}
                            feedMode={feedMode}
                            setFeedMode={setFeedMode}
                        />
                    }
                    stickyHeaderIndices={[0]}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    ListEmptyComponent={
                        searchLoading ? (
                            <View className="items-center justify-center py-20">
                                <ActivityIndicator size="large" color="#004e89" />
                            </View>
                        ) : (
                            <View className="items-center justify-center py-20">
                                <Text className="text-gray-400">No users found</Text>
                            </View>
                        )
                    }
                />
            ) : (
                <FlatList
                    data={posts}
                    renderItem={renderPostItem}
                    keyExtractor={item => item.id}
                    ListHeaderComponent={
                        <ExploreHeader 
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            isSearching={isSearching}
                            feedMode={feedMode}
                            setFeedMode={setFeedMode}
                        />
                    }
                    stickyHeaderIndices={[0]}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    onEndReached={() => hasNextPage && fetchNextPage()}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <ActivityIndicator size="small" color="#004e89" className="py-4" />
                        ) : null
                    }
                    ListEmptyComponent={
                        feedLoading ? (
                            <View className="items-center justify-center py-20">
                                <ActivityIndicator size="large" color="#004e89" />
                            </View>
                        ) : (
                            <EmptyFeedState feedMode={feedMode} />
                        )
                    }
                    refreshing={feedLoading}
                    onRefresh={refetchFeed}
                />
            )}

            {selectedPost && (
                <CommentsSheet
                    visible={!!selectedPost}
                    postId={selectedPost.id}
                    postAuthorId={selectedPost.authorId}
                    onClose={() => setSelectedPost(null)}
                />
            )}
        </SafeAreaView>
    );
}
