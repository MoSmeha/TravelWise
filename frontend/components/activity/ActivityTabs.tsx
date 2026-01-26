import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Bell, MessageCircle } from 'lucide-react-native';
import { SegmentedTabs, TabOption } from '../common/SegmentedTabs';

type Tab = 'notifications' | 'messages';

interface ActivityTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function ActivityTabs({ activeTab, onTabChange }: ActivityTabsProps) {
  const tabs: TabOption[] = useMemo(() => [
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageCircle
    }
  ], []);

  return (
    <View className="px-4 pt-4 pb-2">
      <SegmentedTabs 
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => onTabChange(id as Tab)}
      />
    </View>
  );
}
