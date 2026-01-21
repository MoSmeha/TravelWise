import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Users, 
  Check, 
  X,
  Bell
} from 'lucide-react-native';
import type { Notification } from '../../hooks/queries/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onPress: (notification: Notification) => void;
  onAccept?: (friendshipId: string) => void;
  onReject?: (friendshipId: string) => void;
  showActions: boolean;
  formatTime: (dateString: string) => string;
}

export function NotificationItem({ 
  notification, 
  onPress, 
  onAccept, 
  onReject,
  showActions,
  formatTime
}: NotificationItemProps) {
  let Icon = Bell;
  let iconColor = '#64748b';
  let iconBgColor = '#f1f5f9';

  if (notification.type === 'FRIEND_REQUEST') {
    Icon = UserPlus;
    iconColor = '#4F46E5';
    iconBgColor = '#e0e7ff';
  } else if (notification.type === 'FRIEND_ACCEPTED') {
    Icon = Users;
    iconColor = '#10B981';
    iconBgColor = '#d1fae5';
  } else if (notification.title.toLowerCase().includes('liked')) {
    Icon = Heart;
    iconColor = '#ec4899';
    iconBgColor = '#fce7f3';
  } else if (notification.title.toLowerCase().includes('commented')) {
    Icon = MessageCircle;
    iconColor = '#3b82f6';
    iconBgColor = '#dbeafe';
  }

  const friendshipId = notification.data?.friendshipId;

  const handleAction = (action: 'accept' | 'reject') => {
    if (!friendshipId) return;
    
    if (action === 'accept' && onAccept) {
      onAccept(friendshipId);
    } else if (action === 'reject' && onReject) {
      onReject(friendshipId);
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.7}
      onPress={() => onPress(notification)}
      className="flex-row p-4 items-center border-b border-gray-100 border-dashed"
    >
      <View 
        className="w-12 h-12 rounded-full items-center justify-center mr-4" 
        style={{ backgroundColor: iconBgColor }}
      >
        <Icon size={24} color={iconColor} strokeWidth={1.5} />
      </View>
      
      <View className="flex-1 mr-2">
        <Text className="text-gray-900 font-medium text-base mb-1">
          <Text className="font-normal text-gray-600">{notification.message}</Text>
        </Text>
        <Text className="text-gray-400 text-xs font-medium">
          {formatTime(notification.createdAt)}
        </Text>
      </View>

      {showActions && (
        <View className="flex-row gap-2 mr-2">
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              handleAction('reject');
            }}
            className="bg-gray-100 p-2 rounded-full"
          >
            <X size={20} color="#EF4444" strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              handleAction('accept');
            }}
            className="bg-indigo-100 p-2 rounded-full"
          >
            <Check size={20} color="#4F46E5" strokeWidth={2} />
          </TouchableOpacity>
        </View>
      )}

      {!notification.read && (
        <View className="w-2.5 h-2.5 rounded-full bg-blue-500" />
      )}
    </TouchableOpacity>
  );
}
