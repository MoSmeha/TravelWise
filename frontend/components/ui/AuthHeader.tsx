import React from 'react';
import { View, Text, Image } from 'react-native';

interface AuthHeaderProps {
  title: string;
  subtitle: string;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({ title, subtitle }) => {
  return (
    <View className="items-center mb-8">
      <View className="mb-6">
        <View className="w-28 h-28 bg-white rounded-full p-1 items-center justify-center shadow-2xl shadow-gray-200 border-4 border-white">
          <Image 
            source={{ uri: 'https://res.cloudinary.com/dgsxk7nf5/image/upload/v1769224390/TravelWise-Logo_ogc2ai.png' }} 
            className="w-full h-full rounded-full"
            style={{ resizeMode: 'cover' }}
          />
        </View>
      </View>
      
      <Text className="text-3xl font-extrabold text-gray-900 tracking-tight text-center">
        {title}
      </Text>
      <Text className="text-gray-500 mt-2 font-medium text-center text-base px-8">
        {subtitle}
      </Text>
    </View>
  );
};
