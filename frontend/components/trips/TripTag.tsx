import React from 'react';
import { View, Text } from 'react-native';

const TAG_STYLES = [
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-green-100', text: 'text-green-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-purple-100', text: 'text-purple-700' },
  { bg: 'bg-pink-100', text: 'text-pink-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
];

function getTagStyle(tag: string) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_STYLES[Math.abs(hash) % TAG_STYLES.length];
}

interface TripTagProps {
  tag: string;
}

export function TripTag({ tag }: TripTagProps) {
  const { bg, text } = getTagStyle(tag);
  
  return (
    <View className={`${bg} px-2.5 py-1 rounded-lg`}>
      <Text className={`${text} text-[11px] font-bold capitalize`}>
        {tag.replace(/_/g, ' ')}
      </Text>
    </View>
  );
}
