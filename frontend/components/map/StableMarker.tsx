import React, { memo, useEffect, useState } from 'react';
import { Marker, MapMarkerProps } from 'react-native-maps';

interface StableMarkerProps extends MapMarkerProps {
  children?: React.ReactNode;
}

export const StableMarker = memo(({ children, ...props }: StableMarkerProps) => {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    if (tracksViewChanges) {
      const timer = setTimeout(() => {
        setTracksViewChanges(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [tracksViewChanges]);

  return (
    <Marker {...props} tracksViewChanges={tracksViewChanges}>
      {children}
    </Marker>
  );
});

StableMarker.displayName = 'StableMarker';
