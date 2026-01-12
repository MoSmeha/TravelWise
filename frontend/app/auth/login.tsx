import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Toast.show({
        type: 'error',
        text1: 'Missing Fields',
        text2: 'Please fill in all fields',
      });
      return;
    }

    // Basic email validation
    if (!email.includes('@')) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
      });
      return;
    }

    try {
      await login({ email, password });
      Toast.show({
        type: 'success',
        text1: 'Welcome back!',
        text2: 'Login successful',
      });
      router.replace('/(tabs)');
    } catch (error: any) {
      const errorData = error.response?.data;
      const msg = errorData?.message || errorData?.error || 'Login failed. Please try again.';
      
      Toast.show({
        type: 'error',
        text1: 'Login Failed',
        text2: msg,
      });
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
            <View className="w-20 h-20 bg-blue-500 rounded-2xl items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                <Ionicons name="airplane" size={40} color="white" />
            </View>
            <Text className="text-3xl font-bold text-gray-900">Welcome Back</Text>
            <Text className="text-gray-500 mt-2">Sign in to continue your journey</Text>
        </View>

        <View className="space-y-4">
          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
            <TextInput
              className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 focus:border-blue-500"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View>
            <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
            <View className="relative">
              <TextInput
                className="w-full h-12 bg-gray-50 border border-gray-200 rounded-xl px-4 text-gray-900 focus:border-blue-500 pr-12"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                className="absolute right-4 top-3"
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
             <TouchableOpacity className="self-end mt-2">
                <Text className="text-blue-600 text-sm font-medium">Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={`w-full h-14 bg-blue-600 rounded-xl items-center justify-center shadow-lg shadow-blue-600/30 mt-4 ${isLoading ? 'opacity-70' : ''}`}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
               <Text className="text-white font-semibold text-lg">Logging in...</Text>
            ) : (
               <Text className="text-white font-semibold text-lg">Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8">
          <Text className="text-gray-600">Don&apos;t have an account? </Text>
          <Link href={"/auth/register" as any} asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-bold">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
