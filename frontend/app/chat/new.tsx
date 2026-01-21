
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send, Sparkles } from 'lucide-react-native';
import { useAskQuestion } from '../../hooks/mutations/useItinerary';
import type { RAGResponse } from '../../types/api';

export default function ChatScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const itineraryId = typeof params.itineraryId === 'string' ? params.itineraryId : '';

  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState<RAGResponse | null>(null);
  
  const askQuestionMutation = useAskQuestion();

  const [conversation, setConversation] = useState<{role: 'user' | 'assistant', content: string, confidence?: number, warning?: string}[]>([]);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  React.useEffect(() => {
      if (Platform.OS === 'android') {
          const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
              setKeyboardHeight(e.endCoordinates.height);
          });
          const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
              setKeyboardHeight(0);
          });

          return () => {
              showSubscription.remove();
              hideSubscription.remove();
          };
      }
  }, []);

  const askQuestion = async () => {
    if (!chatQuestion.trim() || !itineraryId) return;
    
    const currentQuestion = chatQuestion;
    setChatQuestion('');
    
    // Optimistic update
    setConversation(prev => [...prev, { role: 'user', content: currentQuestion }]);

    try {
      setChatAnswer(null); // Clear previous single answer if any
      const response = await askQuestionMutation.mutateAsync({
        itineraryId,
        question: currentQuestion,
      });
      
      setConversation(prev => [...prev, { 
          role: 'assistant', 
          content: response.answer,
          confidence: response.confidence,
          warning: response.staleWarning
      }]);

    } catch (err: any) {
        setConversation(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error answering that.' }]);
        console.error(err);
        Alert.alert(
            'Error', 
            err.response?.data?.message || 'Failed to get answer.'
        );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white z-10">
        <TouchableOpacity
          className="w-10 h-10 bg-gray-50 rounded-full items-center justify-center border border-gray-100 mr-3"
          onPress={() => router.back()}
        >
          <ArrowLeft size={20} color="#374151" strokeWidth={2.5} />
        </TouchableOpacity>
        <View>
             <Text className="text-lg font-bold text-gray-900">Trip Assistant</Text>
             <Text className="text-xs text-gray-500">Ask about your itinerary</Text>
        </View>
      </View>

      <View style={{ flex: 1, paddingBottom: Platform.OS === 'android' ? keyboardHeight : 0 }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
          <ScrollView 
            className="flex-1 px-4 bg-gray-50" 
            contentContainerStyle={{ paddingVertical: 20 }}
            ref={ref => ref?.scrollToEnd({ animated: true })}
          >
            {conversation.length === 0 ? (
                <View className="items-center justify-center mt-20 opacity-50">
                    <View className="w-16 h-16 rounded-full items-center justify-center mb-4" style={{ backgroundColor: '#e6f0f7' }}>
                        <Sparkles size={32} color="#004e89" />
                    </View>
                    <Text className="text-gray-500 text-center px-10">
                        Ask me anything about your trip! specialized recommendations, timings, or hidden gems.
                    </Text>
                </View>
            ) : (
                conversation.map((msg, idx) => (
                    <View key={idx} className={`mb-4 flex-row ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <View className="w-8 h-8 rounded-full items-center justify-center mr-2 self-end mb-1" style={{ backgroundColor: '#e6f0f7' }}>
                                <Sparkles size={14} color="#004e89" />
                            </View>
                        )}
                        <View 
                            style={msg.role === 'user' ? { backgroundColor: '#004e89' } : undefined}
                            className={`p-4 rounded-2xl max-w-[85%] ${
                                msg.role === 'user' 
                                ? 'rounded-br-none' 
                                : 'bg-white border border-gray-200 rounded-bl-none shadow-sm'
                            }`}
                        >
                            <Text className={`text-base leading-6 ${msg.role === 'user' ? 'text-white' : 'text-gray-800'}`}>
                                {msg.content}
                            </Text>
                            
                            {msg.confidence !== undefined && (
                                <View className="flex-row items-center mt-2 gap-2">
                                     <Text className="text-[10px] text-gray-400 font-medium">Confidence: {Math.round(msg.confidence * 100)}%</Text>
                                     {msg.warning && (
                                         <Text className="text-[10px] text-orange-500">⚠️ {msg.warning}</Text>
                                     )}
                                </View>
                            )}
                        </View>
                    </View>
                ))
            )}
            
            {askQuestionMutation.isPending && (
                 <View className="mb-4 flex-row justify-start">
                    <View className="w-8 h-8 rounded-full items-center justify-center mr-2 self-end mb-1" style={{ backgroundColor: '#e6f0f7' }}>
                         <ActivityIndicator size="small" color="#004e89" />
                    </View>
                    <View className="p-3 bg-white border border-gray-200 rounded-2xl rounded-bl-none">
                        <Text className="text-gray-500 text-sm">Thinking...</Text>
                    </View>
                 </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View className="p-4 bg-white border-t border-gray-100">
             <View className="flex-row items-end gap-2">
                 <TextInput
                    className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-base text-gray-900 border border-transparent"
                    style={{ borderColor: 'transparent' }}
                    placeholder="Ask about locations, costs, or tips..."
                    multiline
                    value={chatQuestion}
                    onChangeText={setChatQuestion}
                    maxLength={500}
                 />
                 <TouchableOpacity 
                    style={!chatQuestion.trim() || askQuestionMutation.isPending ? undefined : { backgroundColor: '#004e89' }}
                    className={`w-12 h-12 rounded-full items-center justify-center ${!chatQuestion.trim() || askQuestionMutation.isPending ? 'bg-gray-200' : ''}`}
                    disabled={!chatQuestion.trim() || askQuestionMutation.isPending}
                    onPress={askQuestion}
                 >
                    <Send size={20} color="white" />
                 </TouchableOpacity>
             </View>
          </View>
      </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}
