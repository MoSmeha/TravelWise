import React, { useMemo } from 'react';

import { Users, Globe } from 'lucide-react-native';
import { SegmentedTabs, TabOption } from '../common/SegmentedTabs';

type FeedMode = 'friends' | 'discover';

interface FeedModeToggleProps {
  feedMode: FeedMode;
  onModeChange: (mode: FeedMode) => void;
}

export function FeedModeToggle({ feedMode, onModeChange }: FeedModeToggleProps) {
  const tabs: TabOption[] = useMemo(() => [
    {
      id: 'friends',
      label: 'Friends',
      icon: Users
    },
    {
      id: 'discover',
      label: 'Discover',
      icon: Globe
    }
  ], []);

  return (
    <SegmentedTabs 
      tabs={tabs}
      activeTab={feedMode}
      onTabChange={(id) => onModeChange(id as FeedMode)}
    />
  );
}
