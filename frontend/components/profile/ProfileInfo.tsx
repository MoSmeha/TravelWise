import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../../types/auth';

interface ProfileInfoProps {
  user: User | null | undefined;
}

export const ProfileInfo: React.FC<ProfileInfoProps> = ({ user }) => {
  return (
    <View className="bg-white rounded-2xl p-6 shadow-sm mb-6">
      <View className="flex-row items-center mb-4">
        <Ionicons name="mail-outline" size={20} color="#6B7280" />
        <Text className="text-gray-600 ml-3">Email</Text>
        <Text className="text-gray-900 font-medium ml-auto">{user?.email}</Text>
      </View>
      <View className="h-[1px] bg-gray-100 mb-4" />
      <View className="flex-row items-center">
        <Ionicons name="checkmark-circle-outline" size={20} color="#6B7280" />
        <Text className="text-gray-600 ml-3">Status</Text>
        <Text className={`font-medium ml-auto ${user?.emailVerified ? "text-green-600" : "text-amber-500"}`}>
          {user?.emailVerified ? "Verified" : "Unverified"}
        </Text>
      </View>
    </View>
  );
};
