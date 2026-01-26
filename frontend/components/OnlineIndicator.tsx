import React from 'react';
import { View } from 'react-native';

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: 'small' | 'medium' | 'large';
}


export const OnlineIndicator: React.FC<OnlineIndicatorProps> = ({ 
  isOnline, 
  size = 'medium' 
}) => {
  if (!isOnline) return null;

  const sizeStyles = {
    small: { width: 8, height: 8, borderWidth: 1.5 },
    medium: { width: 12, height: 12, borderWidth: 2 },
    large: { width: 16, height: 16, borderWidth: 2.5 },
  };

  const { width, height, borderWidth } = sizeStyles[size];

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width,
        height,
        borderRadius: width / 2,
        backgroundColor: '#22c55e',
        borderWidth,
        borderColor: 'white',
      }}
    />
  );
};
