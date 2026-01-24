import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { useSocket } from './useSocket';

export interface UserLocationData {
  userId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    heading?: number;
    speed?: number;
  };
  timestamp: Date;
}

export function useLocationSharing(itineraryId: string | null, enabled: boolean = false) {
  const [isSharing, setIsSharing] = useState(false);
  const [collaboratorLocations, setCollaboratorLocations] = useState<Map<string, UserLocationData>>(new Map());
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const socketService = useSocket();
  const socket = socketService.getSocket();
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request location permissions
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Join/leave itinerary room
  useEffect(() => {
    if (!socket || !itineraryId || !enabled) return;

    console.log('[LocationSharing] Joining itinerary room:', itineraryId);
    socket.emit('join-itinerary', itineraryId);

    return () => {
      console.log('[LocationSharing] Leaving itinerary room:', itineraryId);
      socket.emit('leave-itinerary', itineraryId);
    };
  }, [socket, itineraryId, enabled]);

  // Listen for collaborator location updates
  useEffect(() => {
    if (!socket) return;

    const handleLocationUpdate = (data: UserLocationData) => {
      console.log('[LocationSharing] Received location update:', data.userId);
      setCollaboratorLocations(prev => {
        const next = new Map(prev);
        next.set(data.userId, {
          ...data,
          timestamp: new Date(data.timestamp)
        });
        return next;
      });
    };

    const handleLocationRemoved = ({ userId }: { userId: string }) => {
      console.log('[LocationSharing] User location removed:', userId);
      setCollaboratorLocations(prev => {
        const next = new Map(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on('location-updated', handleLocationUpdate);
    socket.on('user-location-removed', handleLocationRemoved);

    return () => {
      socket.off('location-updated', handleLocationUpdate);
      socket.off('user-location-removed', handleLocationRemoved);
    };
  }, [socket]);

  // Start sharing location
  const startSharing = useCallback(async () => {
    if (!hasPermission || !socket || !itineraryId) {
      console.warn('[LocationSharing] Cannot start sharing - missing requirements');
      return;
    }

    try {
      console.log('[LocationSharing] Starting location sharing');
      setIsSharing(true);

      // Subscribe to location updates (every 10 seconds)
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 10000, // Update every 10 seconds
          distanceInterval: 20, // Or when moved 20 meters
        },
        (location) => {
          const locationData = {
            itineraryId,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
          };

          console.log('[LocationSharing] Sending location update');
          socket.emit('update-location', locationData);
        }
      );
    } catch (error) {
      console.error('[LocationSharing] Error starting location sharing:', error);
      setIsSharing(false);
    }
  }, [hasPermission, socket, itineraryId]);

  // Stop sharing location
  const stopSharing = useCallback(async () => {
    console.log('[LocationSharing] Stopping location sharing');
    
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    setIsSharing(false);
  }, []);

  // Auto-stop when component unmounts or disabled
  useEffect(() => {
    if (!enabled && isSharing) {
      stopSharing();
    }
  }, [enabled, isSharing, stopSharing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, []);

  return {
    isSharing,
    hasPermission,
    collaboratorLocations: Array.from(collaboratorLocations.values()),
    startSharing,
    stopSharing,
  };
}
