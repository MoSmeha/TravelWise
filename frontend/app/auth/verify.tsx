import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert, SafeAreaView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '../../services/auth';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../store/authStore';

export default function VerifyScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { hydrate } = useAuth(); // To update user status after verification

  const handleVerify = async () => {
    if (!token) return;

    setIsLoading(true);
    try {
      await authService.verifyEmail({ token });
      Alert.alert('Success', 'Email verified successfully!');
      
      // Refresh user data
      await hydrate();
      router.replace('/(tabs)');
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Verification failed.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
      if(!email) return;
      try {
          await authService.resendVerification({ email });
          Alert.alert('Sent', 'Verification code resent to your email.');
      } catch (error: any) {
          Alert.alert('Error', error.response?.data?.message || 'Failed to resend.');
      }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerClassName="flex-grow justify-center px-6">
        <View className="items-center mb-10">
            <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-6">
                <Ionicons name="mail-open-outline" size={40} color="#16A34A" />
            </View>
            <Text className="text-3xl font-bold text-gray-900 text-center">Verify Email</Text>
            <Text className="text-gray-500 mt-2 text-center">
                We sent a verification code to {email || 'your email'}.
                Please enter it below.
            </Text>
        </View>

        <View className="space-y-6">
          <View>
            <TextInput
              className="w-full h-14 bg-gray-50 border border-gray-200 rounded-xl px-4 text-center text-2xl tracking-widest font-bold text-gray-900 focus:border-blue-500"
              placeholder="Enter Code"
              value={token}
              onChangeText={setToken}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            className={`w-full h-14 bg-blue-600 rounded-xl items-center justify-center shadow-lg shadow-blue-600/30 ${isLoading ? 'opacity-70' : ''}`}
            onPress={handleVerify}
            disabled={isLoading}
          >
             {isLoading ? (
               <Text className="text-white font-semibold text-lg">Verifying...</Text>
            ) : (
               <Text className="text-white font-semibold text-lg">Verify Account</Text>
            )}
          </TouchableOpacity>
          
           <TouchableOpacity onPress={handleResend} className="items-center mt-4">
              <Text className="text-blue-600 font-medium">Resend Verification Code</Text>
           </TouchableOpacity>
        </View>
        
        <TouchableOpacity onPress={() => router.replace('/auth/login' as any)} className="mt-10 items-center">
            <Text className="text-gray-500">Back to Login</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
