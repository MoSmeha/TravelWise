import React from 'react';
import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Camera } from 'lucide-react-native';
import {
  requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
  MediaTypeOptions,
} from 'expo-image-picker';
import { User } from '../../types/auth';
import { useUpdateAvatar } from '../../hooks/mutations/useUserMutations';
import Toast from 'react-native-toast-message';

interface ProfileHeaderProps {
  user: User | null | undefined;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user }) => {
  const updateAvatarMutation = useUpdateAvatar();

  const handleAvatarPress = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permission Required',
        text2: 'Please allow access to your photo library',
      });
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        await updateAvatarMutation.mutateAsync(result.assets[0].uri);
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Profile picture updated!',
        });
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.response?.data?.error || 'Failed to update profile picture',
        });
      }
    }
  };

  return (
    <View className="bg-[#004e89] pb-10 pt-6 px-6 rounded-b-3xl shadow-md">
      <View className="flex-row items-center mb-6">
        <Text className="text-white text-3xl font-extrabold">Profile</Text>
      </View>

      <View className="flex-row items-center">
        <TouchableOpacity onPress={handleAvatarPress} disabled={updateAvatarMutation.isPending}>
          <View className="w-20 h-20 bg-white rounded-full items-center justify-center border-2 border-[#004e89]/30 overflow-hidden">
            {updateAvatarMutation.isPending ? (
              <ActivityIndicator size="large" color="#004e89" />
            ) : user?.avatarUrl ? (
              <Image 
                source={{ uri: user.avatarUrl }} 
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : (
              <Text className="text-3xl font-bold text-[#004e89]">
                {user?.name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || "U"}
              </Text>
            )}
          </View>
          {/* Camera Icon Overlay */}
          <View className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 border-2 border-[#004e89]">
            <Camera size={14} color="#004e89" />
          </View>
        </TouchableOpacity>
        <View className="ml-4">
          <Text className="text-white text-xl font-bold">{user?.name || "Traveler"}</Text>
          <Text className="text-white/70 text-sm">@{user?.username || "username"}</Text>
        </View>
      </View>
    </View>
  );
};
