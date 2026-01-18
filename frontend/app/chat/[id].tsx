import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
    View, 
    Text, 
    TextInput, 
    TouchableOpacity, 
    FlatList, 
    KeyboardAvoidingView, 
    Platform,
    Image,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { 
    useConversation, 
    useInfiniteMessages, 
    useSendMessage,
    useMarkConversationRead,
    Message 
} from '../../hooks/queries/useMessages';
import { useUser } from '../../hooks/queries/useUser';
import Toast from 'react-native-toast-message';

export default function ChatScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { data: currentUser } = useUser();
    const [message, setMessage] = useState('');
    const flatListRef = useRef<FlatList>(null);
    const hasMarkedRead = useRef(false);

    // Fetch conversation and messages
    const { data: conversation, isLoading: conversationLoading } = useConversation(id || '');
    const { 
        data: messagesData, 
        isLoading: messagesLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteMessages(id || '');
    const sendMessageMutation = useSendMessage();
    const markReadMutation = useMarkConversationRead();

    // Flatten messages from infinite query and reverse for correct order (newest at bottom)
    const messages = useMemo(() => {
        const allMessages = messagesData?.pages.flatMap(page => page.data) || [];
        // Messages come in newest-first from API, reverse for display (oldest at top)
        return [...allMessages].reverse();
    }, [messagesData]);

    // Get the other participant for display
    const otherUser = useMemo(() => {
        if (conversation?.type === 'DIRECT') {
            return conversation.participants.find(p => p.userId !== currentUser?.id)?.user;
        }
        return null;
    }, [conversation, currentUser]);

    const displayName = conversation?.type === 'GROUP' 
        ? conversation.name 
        : otherUser?.name || 'Unknown';
    
    const avatarUrl = conversation?.type === 'GROUP' 
        ? conversation.imageUrl 
        : otherUser?.avatarUrl;

    // Mark conversation as read on mount (only once)
    useEffect(() => {
        if (id && !hasMarkedRead.current) {
            hasMarkedRead.current = true;
            markReadMutation.mutate(id);
        }
    }, [id]);

    const handleSend = async () => {
        if (!message.trim() || !id) return;

        const content = message.trim();
        setMessage('');

        try {
            await sendMessageMutation.mutateAsync({ conversationId: id, content });
            // Scroll to bottom after sending
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.response?.data?.error || 'Failed to send message'
            });
            setMessage(content); // Restore message on error
        }
    };

    const formatMessageTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDateHeader = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    };

    const renderMessage = ({ item, index }: { item: Message; index: number }) => {
        const isOwnMessage = item.senderId === currentUser?.id;
        const showDateHeader = index === 0 || 
            new Date(messages[index - 1]?.createdAt).toDateString() !== new Date(item.createdAt).toDateString();

        return (
            <View>
                {showDateHeader && (
                    <View className="items-center py-2 my-2">
                        <Text className="text-gray-400 text-xs bg-gray-100 px-3 py-1 rounded-full">
                            {formatDateHeader(item.createdAt)}
                        </Text>
                    </View>
                )}
                <View className={`flex-row mb-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                    <View 
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${
                            isOwnMessage 
                                ? 'bg-indigo-600 rounded-br-sm' 
                                : 'bg-gray-100 rounded-bl-sm'
                        }`}
                    >
                        <Text className={isOwnMessage ? 'text-white' : 'text-gray-900'}>
                            {item.content}
                        </Text>
                        <Text 
                            className={`text-xs mt-1 ${
                                isOwnMessage ? 'text-indigo-200' : 'text-gray-400'
                            }`}
                        >
                            {formatMessageTime(item.createdAt)}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (conversationLoading || !conversation) {
        return (
            <SafeAreaView className="flex-1 bg-white items-center justify-center">
                <ActivityIndicator size="large" color="#4F46E5" />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white" edges={['top']}>
            {/* Header */}
            <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
                <TouchableOpacity 
                    onPress={() => router.back()}
                    className="mr-3 p-1"
                >
                    <ArrowLeft size={24} color="#374151" />
                </TouchableOpacity>

                {avatarUrl ? (
                    <Image 
                        source={{ uri: avatarUrl }} 
                        className="w-10 h-10 rounded-full mr-3"
                    />
                ) : (
                    <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3">
                        <Text className="text-indigo-600 font-bold text-lg">
                            {displayName?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </View>
                )}

                <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-lg">
                        {displayName}
                    </Text>
                    {otherUser?.username && (
                        <Text className="text-gray-500 text-sm">
                            @{otherUser.username}
                        </Text>
                    )}
                </View>
            </View>

            {/* Messages */}
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={0}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ 
                        padding: 16, 
                        paddingBottom: 8,
                        flexGrow: 1,
                        justifyContent: messages.length === 0 ? 'center' : 'flex-end'
                    }}
                    onContentSizeChange={() => {
                        if (messages.length > 0) {
                            flatListRef.current?.scrollToEnd({ animated: false });
                        }
                    }}
                    ListHeaderComponent={
                        hasNextPage ? (
                            <TouchableOpacity 
                                onPress={() => fetchNextPage()}
                                disabled={isFetchingNextPage}
                                className="items-center py-2 mb-2"
                            >
                                {isFetchingNextPage ? (
                                    <ActivityIndicator size="small" color="#4F46E5" />
                                ) : (
                                    <Text className="text-indigo-600 text-sm">Load earlier messages</Text>
                                )}
                            </TouchableOpacity>
                        ) : null
                    }
                    ListEmptyComponent={
                        messagesLoading ? (
                            <ActivityIndicator size="large" color="#4F46E5" />
                        ) : (
                            <View className="items-center">
                                <Text className="text-gray-400 text-center">
                                    No messages yet. Say hello! 👋
                                </Text>
                            </View>
                        )
                    }
                />

                {/* Input */}
                <View className="flex-row items-center px-4 py-3 border-t border-gray-100 bg-white">
                    <TextInput
                        value={message}
                        onChangeText={setMessage}
                        placeholder="Type a message..."
                        placeholderTextColor="#9ca3af"
                        className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-gray-900 mr-3"
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity 
                        onPress={handleSend}
                        disabled={!message.trim() || sendMessageMutation.isPending}
                        className={`w-10 h-10 rounded-full items-center justify-center ${
                            message.trim() ? 'bg-indigo-600' : 'bg-gray-200'
                        }`}
                    >
                        {sendMessageMutation.isPending ? (
                            <ActivityIndicator size="small" color="white" />
                        ) : (
                            <Send size={20} color={message.trim() ? 'white' : '#9ca3af'} />
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
