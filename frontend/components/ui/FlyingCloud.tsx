import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing } from 'react-native';
import { Cloud } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

interface FlyingCloudProps {
  duration?: number;
  delay?: number;
  top: number;
  size?: number;
  opacity?: number;
  variant?: 'lucide' | 'ionic';
}

export const FlyingCloud: React.FC<FlyingCloudProps> = ({
  duration = 10000,
  delay = 0,
  top,
  size = 50,
  opacity = 0.2,
  variant = 'lucide', // Default to Lucide
}) => {
  const screenWidth = Dimensions.get('window').width;
  // Start fully off-screen to the left
  const translateX = useRef(new Animated.Value(-size * 2)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(translateX, {
          toValue: screenWidth + size,
          duration: duration,
          easing: Easing.linear,
          useNativeDriver: true, // Optimizes performance by running on UI thread
        }),
        Animated.timing(translateX, {
          toValue: -size * 2,
          duration: 0,
          useNativeDriver: true
        })
      ])
    );

    animation.start();

    return () => animation.stop();
  }, [duration, delay, screenWidth, size, translateX]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: top,
        left: 0,
        opacity: opacity,
        transform: [{ translateX }],
        zIndex: 10,
      }}
      pointerEvents="none"
    >
      {variant === 'lucide' ? (
        <Cloud size={size} color="#004e89" fill="#004e89" strokeWidth={0} />
      ) : (
        <Ionicons name="cloud" size={size} color="#004e89" />
      )}
    </Animated.View>
  );
};
