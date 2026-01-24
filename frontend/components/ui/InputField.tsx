import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Valid Ionicons names
type IconName = keyof typeof Ionicons.glyphMap;

interface InputFieldProps extends TextInputProps {
  label: string;
  error?: string;
  isPassword?: boolean;
  icon?: IconName;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  isPassword = false,
  icon,
  className,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="mb-5">
      <Text className="text-sm font-semibold text-gray-700 mb-2 ml-1">{label}</Text>
      <View className="relative">
        {/* Left Icon */}
        {icon && (
          <View className="absolute left-4 top-0 h-14 justify-center z-10 pointer-events-none">
            <Ionicons 
              name={icon} 
              size={20} 
              color={isFocused ? '#004e89' : '#9CA3AF'} // Using primary color for active state
            />
          </View>
        )}

        <TextInput
          className={`w-full h-14 bg-gray-50 border rounded-2xl ${icon ? 'pl-11' : 'px-4'} pr-4 text-gray-900 text-base font-medium ${
            error 
              ? 'border-red-500 bg-red-50' 
              : isFocused 
                ? 'border-primary bg-white shadow-sm shadow-primary/10' 
                : 'border-gray-100'
          } ${className}`}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        
        {/* Toggle Password Icon */}
        {isPassword && (
          <TouchableOpacity
            className="absolute right-0 top-0 h-14 w-14 items-center justify-center"
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#9CA3AF" 
            />
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <View className="flex-row items-center mt-1.5 ml-1">
          <Ionicons name="alert-circle" size={12} color="#EF4444" style={{ marginRight: 4 }} />
          <Text className="text-red-500 text-xs font-medium">{error}</Text>
        </View>
      )}
    </View>
  );
};
