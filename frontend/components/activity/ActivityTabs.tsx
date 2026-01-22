import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Bell, MessageCircle } from 'lucide-react-native';

type Tab = 'notifications' | 'messages';

interface ActivityTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function ActivityTabs({ activeTab, onTabChange }: ActivityTabsProps) {
  return (
    <View className="flex-row items-center px-4 pt-4 pb-2 gap-4">
      <TouchableOpacity 
        onPress={() => onTabChange('notifications')}
        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${activeTab === 'notifications' ? 'bg-[#094772]' : 'bg-gray-100'}`}
      >
        <Bell size={18} color={activeTab === 'notifications' ? 'white' : '#6b7280'} strokeWidth={2} />
        <Text className={`text-base font-semibold ${activeTab === 'notifications' ? 'text-white' : 'text-gray-500'}`}>
          Notifications
        </Text>
      </TouchableOpacity>
      <TouchableOpacity 
        onPress={() => onTabChange('messages')}
        className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${activeTab === 'messages' ? 'bg-[#094772]' : 'bg-gray-100'}`}
      >
        <MessageCircle size={18} color={activeTab === 'messages' ? 'white' : '#6b7280'} strokeWidth={2} />
        <Text className={`text-base font-semibold ${activeTab === 'messages' ? 'text-white' : 'text-gray-500'}`}>
          Messages
        </Text>
      </TouchableOpacity>
    </View>
  );
}
