import React, { memo, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Gem } from 'lucide-react-native';
import { CLASSIFICATION_COLORS } from '../../constants/theme';
import type { Location } from '../../types/api';

interface LocationMarkerProps {
  location: Location;
  index: number;
  onPress: () => void;
}

export const LocationMarker = memo(({ location, index, onPress }: LocationMarkerProps) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);
  const isHiddenGem = location.classification === 'HIDDEN_GEM';

  useEffect(() => {

    if (isHiddenGem && tracksViewChanges) {
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isHiddenGem, tracksViewChanges]);

  return (
    <Marker
      key={`${location.id}-${index}`}
      coordinate={{
        latitude: location.latitude,
        longitude: location.longitude,
      }}
      pinColor={!isHiddenGem ? (CLASSIFICATION_COLORS[location.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF') : undefined}
      title={location.name}
      description={location.category}
      onPress={onPress}
      tracksViewChanges={isHiddenGem ? tracksViewChanges : false}
    >
      {isHiddenGem && (
        <View className="items-center justify-center">
          <View className="bg-green-500 p-2 rounded-full border-2 border-white">
            <Gem size={18} color="white" strokeWidth={2.5} />
          </View>

          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 6,
              borderRightWidth: 6,
              borderTopWidth: 8,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: '#22c55e',
              marginTop: -1,
            }}
          />
        </View>
      )}
    </Marker>
  );
});

LocationMarker.displayName = 'LocationMarker';
