import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LucideIcon } from 'lucide-react-native';

export interface TabOption {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedTabsProps {
  tabs: TabOption[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  containerClassName?: string;
}

export function SegmentedTabs({ tabs, activeTab, onTabChange, containerClassName = '' }: SegmentedTabsProps) {
  return (
    <View className={`flex-row items-center gap-4 ${containerClassName}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        
        return (
          <TouchableOpacity 
            key={tab.id}
            onPress={() => onTabChange(tab.id)}
            className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${isActive ? 'bg-[#094772]' : 'bg-gray-100'}`}
          >
            {Icon && (
              <Icon 
                size={18} 
                color={isActive ? 'white' : '#6b7280'} 
                strokeWidth={2} 
              />
            )}
            <Text className={`text-base font-semibold ${isActive ? 'text-white' : 'text-gray-500'}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
