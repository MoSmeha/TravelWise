import api from './api-client';

export const userService = {
  async updateAvatar(imageUri: string): Promise<{ avatarUrl: string }> {
    const formData = new FormData();
    
    const fileName = imageUri.split('/').pop() || 'avatar.jpg';
    const fileType = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    formData.append('avatar', {
      uri: imageUri,
      name: fileName,
      type: fileType,
    } as any);

    const response = await api.put<{ avatarUrl: string }>('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
