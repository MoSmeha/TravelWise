import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { CreatePostModal } from '../components/post/CreatePostModal';

export default function CreatePostScreen() {
  const router = useRouter();

  // We need a way to go back when the modal closes
  // The modal component calls onClose when the user clicks X or finishes
  const handleClose = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: 'transparent' }}>
      <CreatePostModal
        visible={true}
        onClose={handleClose}
      />
    </View>
  );
}
