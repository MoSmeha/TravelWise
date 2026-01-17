import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { ToastConfigParams } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

interface CustomToastProps extends ToastConfigParams<any> {
    variant?: 'success' | 'error' | 'info';
}

const { width } = Dimensions.get('window');

const ToastMessage = ({ text1, text2, variant = 'info' }: CustomToastProps) => {
    const getStyles = () => {
        switch (variant) {
            case 'success':
                return {
                    bg: 'bg-green-50',
                    border: 'border-l-green-500',
                    icon: 'checkmark-circle' as const,
                    iconColor: '#22c55e',
                    textColor: 'text-green-900',
                    text2Color: 'text-green-700'
                };
            case 'error':
                return {
                    bg: 'bg-red-50',
                    border: 'border-l-red-500',
                    icon: 'alert-circle' as const,
                    iconColor: '#ef4444',
                    textColor: 'text-red-900',
                    text2Color: 'text-red-700'
                };
            default:
                return {
                    bg: 'bg-blue-50',
                    border: 'border-l-blue-500',
                    icon: 'information-circle' as const,
                    iconColor: '#3b82f6',
                    textColor: 'text-blue-900',
                    text2Color: 'text-blue-700'
                };
        }
    };

    const styles = getStyles();

    return (
        <View 
            style={{ width: width * 0.9, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3.84, elevation: 5 }} 
            className={`flex-row items-start p-4 rounded-xl border-l-[6px] bg-white mt-4 ${styles.border}`}
        >
            <Ionicons name={styles.icon} size={28} color={styles.iconColor} style={{ marginTop: 2 }} />
            <View className="flex-1 ml-3">
                {text1 && (
                    <Text className={`font-bold text-base ${styles.textColor} mb-1`}>
                        {text1}
                    </Text>
                )}
                {text2 && (
                    <Text className={`text-sm leading-5 font-medium ${styles.text2Color}`}>
                        {text2}
                    </Text>
                )}
            </View>
        </View>
    );
};

export const customToastConfig = {
    success: (props: any) => <ToastMessage {...props} variant="success" />,
    error: (props: any) => <ToastMessage {...props} variant="error" />,
    info: (props: any) => <ToastMessage {...props} variant="info" />,
};
