import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { placesService } from '../services/api';
import { DAY_COLORS } from '../constants/theme';
import { useItineraryDetails } from '../hooks/queries/useItineraries';
import { useItineraryStore } from '../store/itineraryStore';
import type { Hotel, ItineraryResponse, Location } from '../types/api';
import {
  LocationMarker,
  LocationCard,
  HotelCard,
  MapHeader,
  BottomNavigation,
} from '../components/map';

const HOTEL_COLOR = '#8b5cf6';
const AIRPORT_COLOR = '#0ea5e9';

interface LocationPhotosData {
  photos: string[];
  reviews: Array<{
    author?: string;
    author_name?: string;
    rating: number;
    text: string;
  }>;
  loading: boolean;
}

export default function MapScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  
  // Itinerary store for persisting active itinerary
  const setActiveItinerary = useItineraryStore((state) => state.setActiveItinerary);
  
  // State for data passed directly (e.g. from generation)
  const [passedData, setPassedData] = useState<ItineraryResponse | null>(null);
  
  // If ID provided, fetch from backend
  const itineraryId = typeof params.itineraryId === 'string' ? params.itineraryId : null;
  const { data: fetchedData, isLoading: loadingItinerary } = useItineraryDetails(itineraryId || '');

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [locationPhotos, setLocationPhotos] = useState<Record<string, LocationPhotosData>>({});
  const [isNavigatingToItinerary, setIsNavigatingToItinerary] = useState(false);

  // Combine data sources: prefer passed, then fetched
  const data = passedData || (fetchedData as ItineraryResponse | undefined) || null;

  // Fetch photos for a location
  const fetchPhotosForLocation = async (locationId: string, locationName: string, lat?: number, lng?: number) => {
    if (locationPhotos[locationId]?.photos.length > 0 || locationPhotos[locationId]?.loading) return;
    
    setLocationPhotos(prev => ({ ...prev, [locationId]: { photos: [], reviews: [], loading: true } }));
    
    try {
      const photoData = await placesService.getPlacePhotos(locationName, lat, lng, locationId);
      
      setLocationPhotos(prev => ({
        ...prev,
        [locationId]: { photos: photoData.photos || [], reviews: photoData.reviews || [], loading: false }
      }));
    } catch (error) {
      console.error('Failed to fetch photos:', error);
      setLocationPhotos(prev => ({ ...prev, [locationId]: { photos: [], reviews: [], loading: false } }));
    }
  };

  useEffect(() => {
    if (selectedLocation) {
      fetchPhotosForLocation(selectedLocation.id, selectedLocation.name, selectedLocation.latitude, selectedLocation.longitude);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocation]);

  useEffect(() => {
    if (params.data) {
      try {
        const parsed = JSON.parse(params.data as string);
        setPassedData(parsed);
        
        // Set active itinerary in store for checklist tab access
        if (parsed.itinerary?.id) {
          setActiveItinerary(parsed.itinerary.id);
        }
      } catch (error) {
        console.error('Error parsing data:', error);
        Alert.alert('Error', 'Failed to load itinerary data');
      }
    }
  }, [params.data, setActiveItinerary]);

  // Loading state
  if (loadingItinerary && !passedData && itineraryId) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="text-center mt-2.5">Loading itinerary...</Text>
      </View>
    );
  }

  // No data state
  if (!data) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-center mt-5">No itinerary data found.</Text>
      </View>
    );
  }

  const allLocations: Location[] = data.days.flatMap((day) => day.locations);
  const hotels: Hotel[] = data.hotels || [];

  // Build routes for each day
  const dayRoutes = data.days.map((day, index) => {
    const coords = day.locations.map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude,
    }));

    // Add airport as starting point for the first day
    if (index === 0 && data.airport) {
      coords.unshift({
        latitude: data.airport.latitude,
        longitude: data.airport.longitude,
      });
    }
    return coords;
  });

  const initialRegion = {
    latitude: data.airport?.latitude || allLocations[0]?.latitude || 0,
    longitude: data.airport?.longitude || allLocations[0]?.longitude || 0,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  const handleHotelBook = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open booking link');
    });
  };

  const handleNavigateToItinerary = () => {
    if (isNavigatingToItinerary) return;
    setIsNavigatingToItinerary(true);
    
    requestAnimationFrame(() => {
      router.push({
        pathname: '/itinerary',
        params: { data: JSON.stringify(data) },
      });
      
      setTimeout(() => {
        setIsNavigatingToItinerary(false);
      }, 1000);
    });
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <MapHeader
        countryName={data.country?.name || 'Trip'}
        numberOfDays={data.itinerary.numberOfDays}
        locationCount={allLocations.length}
        itineraryId={data.itinerary.id}
      />

      {/* Map */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
      >
        {/* Route polylines per day */}
        {dayRoutes.map((route, index) => (
          route.length > 1 && (
            <Polyline
              key={`route-${index}`}
              coordinates={route}
              strokeColor={DAY_COLORS[index % DAY_COLORS.length]}
              strokeWidth={3}
              lineDashPattern={[10, 5]}
            />
          )
        ))}

        {/* Airport marker */}
        {data.airport && (
          <Marker
            coordinate={{
              latitude: data.airport.latitude,
              longitude: data.airport.longitude,
            }}
            pinColor={AIRPORT_COLOR}
            title={`✈️ ${data.airport.name}`}
            description="Your arrival airport"
          />
        )}

        {/* Location markers */}
        {allLocations.map((location, index) => (
          <LocationMarker
            key={`${location.id}-${index}`}
            location={location}
            index={index}
            onPress={() => {
              setSelectedLocation(location);
              setSelectedHotel(null);
            }}
          />
        ))}

        {/* Hotel markers */}
        {hotels.map((hotel) => (
          <Marker
            key={hotel.id}
            coordinate={{
              latitude: hotel.latitude,
              longitude: hotel.longitude,
            }}
            pinColor={HOTEL_COLOR}
            title={`🏨 ${hotel.name}`}
            description={hotel.neighborhood}
            onPress={() => {
              setSelectedHotel(hotel);
              setSelectedLocation(null);
            }}
          />
        ))}
      </MapView>

      {/* Location Card */}
      {selectedLocation && (
        <LocationCard
          location={selectedLocation}
          locationPhotos={locationPhotos[selectedLocation.id]}
          onClose={() => setSelectedLocation(null)}
        />
      )}

      {/* Hotel Card */}
      {selectedHotel && (
        <HotelCard
          hotel={selectedHotel}
          onClose={() => setSelectedHotel(null)}
          onBook={handleHotelBook}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        itineraryId={data.itinerary.id}
        data={data}
        isNavigating={isNavigatingToItinerary}
        onNavigateToItinerary={handleNavigateToItinerary}
      />
    </View>
  );
}
