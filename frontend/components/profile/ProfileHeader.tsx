import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { User } from '../../types/auth';

interface ProfileHeaderProps {
  user: User | null | undefined;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  return (
    <View className="bg-blue-600 pb-10 pt-6 px-6 rounded-b-3xl shadow-md">
      <View className="flex-row items-center mb-6">
        <Text className="text-white text-2xl font-bold">Profile</Text>
      </View>

      <View className="flex-row items-center">
        <View className="w-20 h-20 bg-white rounded-full items-center justify-center border-2 border-blue-200 overflow-hidden">
          {user?.avatarUrl ? (
             <Image 
                source={{ uri: user.avatarUrl }} 
                className="w-full h-full"
                resizeMode="cover"
             />
          ) : (
            <Text className="text-3xl font-bold text-blue-600">
                {user?.name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || "U"}
            </Text>
          )}
        </View>
        <View className="ml-4">
          <Text className="text-white text-xl font-bold">{user?.name || "Traveler"}</Text>
          <Text className="text-blue-100 text-sm">@{user?.username || "username"}</Text>
        </View>
      </View>
    </View>
  );
};
