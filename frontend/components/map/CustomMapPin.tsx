import React, { memo } from 'react';
import { View } from 'react-native';

interface CustomMapPinProps {
  color: string;
  icon: React.ReactNode;
}

export const CustomMapPin = memo(({ color, icon }: CustomMapPinProps) => {
  return (
    <View className="items-center justify-center">
      <View 
        className="p-2 rounded-full border-2 border-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </View>

      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 6,
          borderRightWidth: 6,
          borderTopWidth: 8,
          borderLeftColor: 'transparent',
          borderRightColor: 'transparent',
          borderTopColor: color,
          marginTop: -1,
        }}
      />
    </View>
  );
});

CustomMapPin.displayName = 'CustomMapPin';
