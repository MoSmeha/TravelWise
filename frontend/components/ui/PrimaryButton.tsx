import React from 'react';
import { Text, TouchableOpacity, TouchableOpacityProps, ActivityIndicator } from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  isLoading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'outline';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  isLoading = false,
  loadingText,
  variant = 'primary',
  className,
  disabled,
  ...props
}) => {
  const isPrimary = variant === 'primary';

  const baseStyles = "w-full h-14 rounded-2xl items-center justify-center flex-row";
  const primaryStyles = "bg-primary shadow-lg shadow-primary/40";
  const outlineStyles = "bg-transparent border-2 border-gray-200";
  const disabledStyles = "opacity-70";

  return (
    <TouchableOpacity
      className={`${baseStyles} ${isPrimary ? primaryStyles : outlineStyles} ${
        (isLoading || disabled) ? disabledStyles : ''
      } ${className}`}
      disabled={isLoading || disabled}
      activeOpacity={0.8}
      {...props}
    >
      {isLoading ? (
        <>
          <ActivityIndicator color={isPrimary ? "white" : "#4B5563"} className="mr-2" />
          <Text className={`font-bold text-lg ${isPrimary ? "text-white" : "text-gray-700"}`}>
            {loadingText || title}
          </Text>
        </>
      ) : (
        <Text className={`font-bold text-lg ${isPrimary ? "text-white" : "text-gray-700"}`}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};
