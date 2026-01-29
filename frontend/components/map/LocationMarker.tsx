import React, { memo } from 'react';
import { Gem, Star, AlertTriangle } from 'lucide-react-native';
import { CLASSIFICATION_COLORS } from '../../constants/theme';
import { CustomMapPin } from './CustomMapPin';
import { StableMarker } from './StableMarker';
import type { Location } from '../../types/api';

interface LocationMarkerProps {
  location: Location;
  index: number;
  onPress: () => void;
}

export const LocationMarker = memo(({ location, index, onPress }: LocationMarkerProps) => {
  const getPinConfig = (classification: string) => {
    switch (classification) {
      case 'HIDDEN_GEM':
        return { color: CLASSIFICATION_COLORS.HIDDEN_GEM, Icon: Gem };
      case 'MUST_SEE':
        return { color: CLASSIFICATION_COLORS.MUST_SEE, Icon: Star };
      case 'CONDITIONAL':
        return { color: CLASSIFICATION_COLORS.CONDITIONAL, Icon: AlertTriangle };
      default:
        return null;
    }
  };

  const pinConfig = getPinConfig(location.classification);
  const isSpecialPin = !!pinConfig;

  return (
    <StableMarker
      key={`${location.id}-${index}`}
      coordinate={{
        latitude: location.latitude,
        longitude: location.longitude,
      }}
      pinColor={!isSpecialPin ? (CLASSIFICATION_COLORS[location.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF') : undefined}
      title={location.name}
      description={location.category}
      onPress={onPress}
    >
      {isSpecialPin && pinConfig && (
        <CustomMapPin 
          color={pinConfig.color} 
          icon={<pinConfig.Icon size={18} color="white" strokeWidth={2.5} />} 
        />
      )}
    </StableMarker>
  );
});

LocationMarker.displayName = 'LocationMarker';

