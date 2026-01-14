import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../hooks/queries/useUser';
import { useLogoutMutation } from '../../hooks/mutations/useAuthMutations';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ProfileHeader } from '../../components/profile/ProfileHeader';
import { ProfileInfo } from '../../components/profile/ProfileInfo';

export default function ProfileScreen() {
  const { data: user, isLoading, isError } = useUser();
  const logoutMutation = useLogoutMutation();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Logout", 
          style: "destructive", 
          onPress: () => logoutMutation.mutate() 
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#2563EB" />
        <Text className="mt-4 text-gray-500">Loading profile...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
          <View className="flex-1 justify-center items-center p-6">
            <Ionicons name="warning-outline" size={48} color="#EF4444" />
            <Text className="text-xl font-bold text-gray-800 mt-4">Unable to load profile</Text>
            <Text className="text-gray-500 text-center mt-2">There was an error fetching your profile information.</Text>
            <TouchableOpacity 
                className="mt-6 bg-blue-600 px-6 py-3 rounded-xl"
                onPress={() => router.replace('/auth/login' as any)}
            >
                <Text className="text-white font-semibold">Login Again</Text>
            </TouchableOpacity>
          </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1">
        <ProfileHeader user={user} />

        <View className="px-6 -mt-6">
            <ProfileInfo user={user} />

             {/* Logout */}
            <TouchableOpacity 
                className="flex-row items-center justify-center bg-red-50 p-4 rounded-xl border border-red-100 mb-8"
                onPress={handleLogout}
            >
                <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                <Text className="text-red-600 font-semibold ml-2">Sign Out</Text>
            </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
