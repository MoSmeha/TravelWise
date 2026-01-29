import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { ToastConfigParams } from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

export type ToastVariant = 
    | 'success' 
    | 'error' 
    | 'info' 
    | 'message' 
    | 'post_like' 
    | 'post_comment' 
    | 'friend_request' 
    | 'friend_accepted' 
    | 'itinerary_shared' 
    | 'itinerary_accepted';

interface CustomToastProps extends ToastConfigParams<any> {
    variant?: ToastVariant;
}

const { width } = Dimensions.get('window');

const ToastMessage = ({ text1, text2, variant = 'info' }: CustomToastProps) => {
    const getStyles = () => {
        switch (variant) {
            case 'success':
                return {
                    bg: 'bg-green-50',
                    border: 'border-l-green-500',
                    icon: 'checkmark-circle',
                    iconColor: '#22c55e',
                    textColor: 'text-green-900',
                    text2Color: 'text-green-700'
                };
            case 'error':
                return {
                    bg: 'bg-red-50',
                    border: 'border-l-red-500',
                    icon: 'alert-circle',
                    iconColor: '#ef4444',
                    textColor: 'text-red-900',
                    text2Color: 'text-red-700'
                };
            case 'message':
                return {
                    bg: 'bg-indigo-50',
                    border: 'border-l-indigo-500',
                    icon: 'chatbubbles',
                    iconColor: '#6366f1',
                    textColor: 'text-indigo-900',
                    text2Color: 'text-indigo-700'
                };
            case 'post_like':
                return {
                    bg: 'bg-rose-50',
                    border: 'border-l-rose-500',
                    icon: 'heart',
                    iconColor: '#e11d48',
                    textColor: 'text-rose-900',
                    text2Color: 'text-rose-700'
                };
            case 'post_comment':
                return {
                    bg: 'bg-teal-50',
                    border: 'border-l-teal-500',
                    icon: 'chatbubble-ellipses',
                    iconColor: '#14b8a6',
                    textColor: 'text-teal-900',
                    text2Color: 'text-teal-700'
                };
            case 'friend_request':
                return {
                    bg: 'bg-purple-50',
                    border: 'border-l-purple-500',
                    icon: 'person-add',
                    iconColor: '#a855f7',
                    textColor: 'text-purple-900',
                    text2Color: 'text-purple-700'
                };
            case 'friend_accepted':
                return {
                    bg: 'bg-purple-50',
                    border: 'border-l-purple-500',
                    icon: 'people',
                    iconColor: '#a855f7',
                    textColor: 'text-purple-900',
                    text2Color: 'text-purple-700'
                };
            case 'itinerary_shared':
            case 'itinerary_accepted':
                return {
                    bg: 'bg-amber-50',
                    border: 'border-l-amber-500',
                    icon: 'map',
                    iconColor: '#f59e0b',
                    textColor: 'text-amber-900',
                    text2Color: 'text-amber-700'
                };
            default:
                return {
                    bg: 'bg-blue-50',
                    border: 'border-l-blue-500',
                    icon: 'information-circle',
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
            <Ionicons name={styles.icon as any} size={28} color={styles.iconColor} style={{ marginTop: 2 }} />
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
    message: (props: any) => <ToastMessage {...props} variant="message" />,
    post_like: (props: any) => <ToastMessage {...props} variant="post_like" />,
    post_comment: (props: any) => <ToastMessage {...props} variant="post_comment" />,
    friend_request: (props: any) => <ToastMessage {...props} variant="friend_request" />,
    friend_accepted: (props: any) => <ToastMessage {...props} variant="friend_accepted" />,
    itinerary_shared: (props: any) => <ToastMessage {...props} variant="itinerary_shared" />,
    itinerary_accepted: (props: any) => <ToastMessage {...props} variant="itinerary_accepted" />,
};
