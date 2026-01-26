import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Camera, Image as ImageIcon } from 'lucide-react-native';
import {
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
  launchImageLibraryAsync,
  launchCameraAsync,
  MediaTypeOptions,
} from 'expo-image-picker';
import { useCreatePost } from '../../hooks/queries/usePosts';
import type { PostVisibility } from '../../types/post';
import Toast from 'react-native-toast-message';

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ visible, onClose }) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<PostVisibility>('FRIENDS');
  const createPostMutation = useCreatePost();

  const resetForm = () => {
    setImageUri(null);
    setDescription('');
    setVisibility('FRIENDS');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const pickImage = async () => {
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
      setImageUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({
        type: 'error',
        text1: 'Permission Required',
        text2: 'Please allow access to your camera',
      });
      return;
    }

    const result = await launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!imageUri) {
      Toast.show({
        type: 'error',
        text1: 'Image Required',
        text2: 'Please select an image for your post',
      });
      return;
    }

    try {
      await createPostMutation.mutateAsync({
        imageUri,
        description: description.trim() || undefined,
        visibility,
      });
      Toast.show({
        type: 'success',
        text1: 'Post Created',
        text2: 'Your post has been shared!',
      });
      handleClose();
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.response?.data?.error || 'Failed to create post',
      });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white"
      >

        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={handleClose}>
            <X size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-gray-900">New Post</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!imageUri || createPostMutation.isPending}
            className={`px-4 py-2 rounded-full ${
              imageUri && !createPostMutation.isPending ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          >
            {createPostMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text className="text-white font-semibold">Share</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">

          {imageUri ? (
            <View className="mb-4">
              <Image
                source={{ uri: imageUri }}
                className="w-full aspect-square rounded-xl"
                resizeMode="cover"
              />
              <TouchableOpacity
                onPress={() => setImageUri(null)}
                className="absolute top-2 right-2 bg-black/50 rounded-full p-2"
              >
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>
          ) : (
            <View className="flex-row gap-4 mb-4">
              <TouchableOpacity
                onPress={pickImage}
                className="flex-1 aspect-square bg-gray-100 rounded-xl items-center justify-center"
              >
                <ImageIcon size={40} color="#6B7280" />
                <Text className="text-gray-500 mt-2 font-medium">Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={takePhoto}
                className="flex-1 aspect-square bg-gray-100 rounded-xl items-center justify-center"
              >
                <Camera size={40} color="#6B7280" />
                <Text className="text-gray-500 mt-2 font-medium">Camera</Text>
              </TouchableOpacity>
            </View>
          )}


          <TextInput
            placeholder="Write a caption..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            className="bg-gray-50 rounded-xl p-4 text-gray-900 text-base min-h-[100px] mb-4"
            placeholderTextColor="#9CA3AF"
            textAlignVertical="top"
          />


          <Text className="text-gray-700 font-semibold mb-2">Who can see this?</Text>
          <View className="flex-row gap-2">
            {(['FRIENDS', 'PUBLIC', 'PRIVATE'] as PostVisibility[]).map((v) => (
              <TouchableOpacity
                key={v}
                onPress={() => setVisibility(v)}
                className={`flex-1 py-3 rounded-xl items-center ${
                  visibility === v ? 'bg-blue-600' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`font-medium ${
                    visibility === v ? 'text-white' : 'text-gray-600'
                  }`}
                >
                  {v.charAt(0) + v.slice(1).toLowerCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};
