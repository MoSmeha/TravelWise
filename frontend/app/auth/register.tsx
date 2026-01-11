import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, SafeAreaView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { z } from 'zod';
import Toast from 'react-native-toast-message';

// Matching backend validation
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, 'Password must contain uppercase, lowercase and number'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);

  const validate = () => {
    try {
      registerSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err: z.ZodIssue) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
        
        // Show first error as toast
        const firstError = error.issues[0];
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: firstError.message,
        });
      }
      return false;
    }
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      await register({
        name: formData.name,
        username: formData.username,
        email: formData.email,
        password: formData.password
      });
      
      Toast.show({
        type: 'success',
        text1: 'Account Created!',
        text2: 'Please check your email to verify your account',
      });
      
      // Navigate to verification screen
      const user = useAuth.getState().user;
      if (user && !user.emailVerified) {
        router.replace({ pathname: '/auth/verify', params: { email: formData.email } } as any);
      } else {
        router.replace('/(tabs)' as any);
      }

    } catch (error: any) {
      const errorData = error.response?.data;
      const msg = errorData?.message || errorData?.error || 'Registration failed. Please try again.';
      
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
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
      <ScrollView contentContainerClassName="flex-grow px-6 py-10">
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View className="mb-8">
            <Text className="text-3xl font-bold text-gray-900">Create Account</Text>
            <Text className="text-gray-500 mt-2">Join TravelWise today</Text>
        </View>

        <View className="space-y-4">
             {/* Name */}
             <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Full Name</Text>
                <TextInput
                  className={`w-full h-12 bg-gray-50 border rounded-xl px-4 text-gray-900 ${errors.name ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  placeholder="John Doe"
                  value={formData.name}
                  onChangeText={(text) => setFormData({...formData, name: text})}
                />
                {errors.name && <Text className="text-red-500 text-xs mt-1">{errors.name}</Text>}
             </View>

             {/* Username */}
             <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Username</Text>
                <TextInput
                  className={`w-full h-12 bg-gray-50 border rounded-xl px-4 text-gray-900 ${errors.username ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  placeholder="johndoe123"
                  value={formData.username}
                  onChangeText={(text) => setFormData({...formData, username: text})}
                  autoCapitalize="none"
                />
                 {errors.username && <Text className="text-red-500 text-xs mt-1">{errors.username}</Text>}
             </View>

            {/* Email */}
             <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
                <TextInput
                  className={`w-full h-12 bg-gray-50 border rounded-xl px-4 text-gray-900 ${errors.email ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                  placeholder="john@example.com"
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                 {errors.email && <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>}
             </View>

            {/* Password */}
             <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
                <View className="relative">
                  <TextInput
                    className={`w-full h-12 bg-gray-50 border rounded-xl px-4 text-gray-900 pr-12 ${errors.password ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                    placeholder="Min 8 chars, 1 upper, 1 lower, 1 number"
                    value={formData.password}
                    onChangeText={(text) => setFormData({...formData, password: text})}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity 
                    className="absolute right-4 top-3"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={24} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                 {errors.password && <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>}
             </View>

            {/* Confirm Password */}
             <View>
                <Text className="text-sm font-medium text-gray-700 mb-1">Confirm Password</Text>
                <TextInput
                   className={`w-full h-12 bg-gray-50 border rounded-xl px-4 text-gray-900 ${errors.confirmPassword ? 'border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
                   placeholder="Confirm your password"
                   value={formData.confirmPassword}
                   onChangeText={(text) => setFormData({...formData, confirmPassword: text})}
                   secureTextEntry
                 />
                  {errors.confirmPassword && <Text className="text-red-500 text-xs mt-1">{errors.confirmPassword}</Text>}
             </View>

          <TouchableOpacity
            className={`w-full h-14 bg-blue-600 rounded-xl items-center justify-center shadow-lg shadow-blue-600/30 mt-6 ${isLoading ? 'opacity-70' : ''}`}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
               <Text className="text-white font-semibold text-lg">Creating Account...</Text>
            ) : (
               <Text className="text-white font-semibold text-lg">Sign Up</Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8 mb-10">
          <Text className="text-gray-600">Already have an account? </Text>
          <Link href={"/auth/login" as any} asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-bold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
