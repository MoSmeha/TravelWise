import React, { memo } from 'react';
import { Polyline } from 'react-native-maps';

interface BorderedPolylineProps {
  coordinates: { latitude: number; longitude: number }[];
  color: string;
  strokeWidth?: number;
  isDimmed?: boolean;
}

export const BorderedPolyline = memo(({ 
  coordinates, 
  color, 
  strokeWidth = 4, 
  isDimmed = false 
}: BorderedPolylineProps) => {
  const opacity = isDimmed ? 0.3 : 1;
  const zIndex = isDimmed ? 0 : 10;

  return (
    <React.Fragment>
      {/* Border Layer (Bottom) */}
      <Polyline
        coordinates={coordinates}
        strokeColor="rgba(255, 255, 255, 1)"
        strokeWidth={strokeWidth + 4}
        zIndex={zIndex}
        style={{ opacity }}
      />
      
      {/* Main Color Layer (Top) */}
      <Polyline
        coordinates={coordinates}
        strokeColor={color}
        strokeWidth={strokeWidth}
        zIndex={zIndex + 1}
        style={{ opacity }}
      />
    </React.Fragment>
  );
});

BorderedPolyline.displayName = 'BorderedPolyline';
