import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { API_BASE_URL } from '../config/api';
import { CLASSIFICATION_COLORS } from '../constants/theme';
import { useItineraryDetails } from '../hooks/queries/useItineraries';
import { useItineraryStore } from '../store/itineraryStore';
import type { Hotel, ItineraryResponse, Location } from '../types/api';

const HOTEL_COLOR = '#8b5cf6';
const AIRPORT_COLOR = '#0ea5e9';

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
  const [locationPhotos, setLocationPhotos] = useState<Record<string, { photos: string[], reviews: any[], loading: boolean }>>({});

  // Combine data sources: prefer passed, then fetched
  const data = passedData || (fetchedData as ItineraryResponse | undefined) || null;

  // Fetch photos for a location
  const fetchPhotosForLocation = async (locationId: string, locationName: string, lat?: number, lng?: number) => {
    if (locationPhotos[locationId]?.photos.length > 0 || locationPhotos[locationId]?.loading) return;
    
    setLocationPhotos(prev => ({ ...prev, [locationId]: { photos: [], reviews: [], loading: true } }));
    
    try {
      const params = new URLSearchParams({ name: locationName });
      if (lat) params.append('lat', lat.toString());
      if (lng) params.append('lng', lng.toString());
      
      const response = await fetch(`${API_BASE_URL}/places/photos?${params}`);
      const data = await response.json();
      
      setLocationPhotos(prev => ({
        ...prev,
        [locationId]: { photos: data.photos || [], reviews: data.reviews || [], loading: false }
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

  if (loadingItinerary && !passedData && itineraryId) {
      return (
        <View className="flex-1">
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{textAlign: 'center', marginTop: 10}}>Loading itinerary...</Text>
        </View>
      );
  }

  if (!data) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text style={{textAlign: 'center', marginTop: 20}}>No itinerary data found.</Text>
      </View>
    );
  }

  const allLocations: Location[] = data.days.flatMap((day) => day.locations);
  const hotels: Hotel[] = data.hotels || [];

  // Build route coordinates for polyline
  const routeCoordinates = allLocations.map(loc => ({
    latitude: loc.latitude,
    longitude: loc.longitude,
  }));

  // Add airport as starting point
  if (data.airport) {
    routeCoordinates.unshift({
      latitude: data.airport.latitude,
      longitude: data.airport.longitude,
    });
  }

  const initialRegion = {
    latitude: data.airport?.latitude || allLocations[0]?.latitude || 0,
    longitude: data.airport?.longitude || allLocations[0]?.longitude || 0,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };

  const formatCost = (loc: Location) => {
    if (loc.costMinUSD && loc.costMaxUSD) {
      return `$${loc.costMinUSD}-$${loc.costMaxUSD}`;
    }
    return 'Cost varies';
  };

  const handleHotelBook = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open booking link');
    });
  };

  return (
    <View className="flex-1">
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
      >
        {/* Route polyline */}
        {routeCoordinates.length > 1 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#007AFF"
            strokeWidth={3}
            lineDashPattern={[10, 5]}
          />
        )}

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
        {allLocations.map((location) => (
          <Marker
            key={location.id}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            pinColor={CLASSIFICATION_COLORS[location.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF'}
            title={location.name}
            description={location.category}
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

      {/* Location Info Card */}
      {selectedLocation && (
        <View className="absolute bottom-32 left-4 right-4 bg-white rounded-2xl p-4 shadow-lg max-h-96">
          <TouchableOpacity
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 items-center justify-center z-10"
            onPress={() => setSelectedLocation(null)}
          >
            <Text className="text-gray-500 text-base">✕</Text>
          </TouchableOpacity>

          <ScrollView className="max-h-80" showsVerticalScrollIndicator={false}>
            {/* Image - show from location data or fetched */}
            {(selectedLocation.imageUrl || selectedLocation.imageUrls?.[0] || locationPhotos[selectedLocation.id]?.photos?.[0]) && (
              <Image 
                source={{ uri: selectedLocation.imageUrl || selectedLocation.imageUrls?.[0] || locationPhotos[selectedLocation.id]?.photos?.[0] }} 
                className="w-full h-32 rounded-xl mb-3"
                resizeMode="cover"
              />
            )}

            {/* Classification Badge */}
            <View
              className="self-start px-3 py-1 rounded-full mb-2"
              style={{ backgroundColor: CLASSIFICATION_COLORS[selectedLocation.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF' }}
            >
              <Text className="text-white text-xs font-semibold">
                {selectedLocation.classification.replace('_', ' ')}
              </Text>
            </View>

            {/* Name & Category */}
            <Text className="text-xl font-bold text-gray-900 pr-8 mb-1">{selectedLocation.name}</Text>
            <Text className="text-sm text-gray-500 mb-2 capitalize">
              {selectedLocation.category.toString().toLowerCase().replace(/_/g, ' ')}
            </Text>
            
            {/* Rating */}
            {selectedLocation.rating && (
              <View className="flex-row items-center mb-2">
                <Text className="text-amber-500 text-sm">⭐ {selectedLocation.rating}</Text>
                {selectedLocation.totalRatings && (
                  <Text className="text-gray-400 text-xs ml-1">({selectedLocation.totalRatings} reviews)</Text>
                )}
              </View>
            )}
            
            {/* Description */}
            {selectedLocation.description && (
              <Text className="text-sm text-gray-600 mb-3 leading-5" numberOfLines={3}>
                {selectedLocation.description}
              </Text>
            )}

            {/* Info Grid - only show if values exist */}
            <View className="flex-row flex-wrap gap-2 mb-3">
              {(selectedLocation.costMinUSD || selectedLocation.costMaxUSD) && (
                <View className="bg-green-50 px-3 py-1.5 rounded-lg">
                  <Text className="text-green-700 text-xs font-medium">💰 {formatCost(selectedLocation)}</Text>
                </View>
              )}
              {selectedLocation.bestTimeToVisit && (
                <View className="bg-blue-50 px-3 py-1.5 rounded-lg">
                  <Text className="text-blue-700 text-xs font-medium">⏰ {selectedLocation.bestTimeToVisit}</Text>
                </View>
              )}
              {selectedLocation.crowdLevel && (
                <View className="bg-purple-50 px-3 py-1.5 rounded-lg">
                  <Text className="text-purple-700 text-xs font-medium">👥 {selectedLocation.crowdLevel}</Text>
                </View>
              )}
            </View>

            {/* Scam Warning */}
            {selectedLocation.scamWarning && (
              <View className="bg-red-50 p-3 rounded-xl mb-3">
                <Text className="text-red-700 text-sm">🚨 {selectedLocation.scamWarning}</Text>
              </View>
            )}

            {/* Photo Gallery - from DB or API */}
            {(selectedLocation.imageUrls?.length || locationPhotos[selectedLocation.id]?.photos?.length) ? (
              <ScrollView horizontal className="mt-1 -mx-1" showsHorizontalScrollIndicator={false}>
                {(selectedLocation.imageUrls || locationPhotos[selectedLocation.id]?.photos || []).map((url, idx) => (
                  <Image key={idx} source={{ uri: url }} className="w-28 h-20 rounded-lg mx-1" resizeMode="cover" />
                ))}
              </ScrollView>
            ) : locationPhotos[selectedLocation.id]?.loading && (
              <View className="flex-row items-center mt-2 gap-2">
                <ActivityIndicator size="small" color="#007AFF" />
                <Text className="text-gray-500 text-xs">Loading photos...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Hotel Info Card */}
      {selectedHotel && (
        <View className="absolute bottom-32 left-4 right-4 bg-white rounded-2xl p-4 shadow-lg">
          <TouchableOpacity
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-gray-100 items-center justify-center z-10"
            onPress={() => setSelectedHotel(null)}
          >
            <Text className="text-gray-500 text-base">✕</Text>
          </TouchableOpacity>

          <View className="self-start px-3 py-1 rounded-full mb-2 bg-violet-500">
            <Text className="text-white text-xs font-semibold">🏨 HOTEL</Text>
          </View>

          <Text className="text-xl font-bold text-gray-900 pr-8 mb-1">{selectedHotel.name}</Text>
          <Text className="text-sm text-gray-500 mb-2">{selectedHotel.neighborhood}</Text>
          
          {selectedHotel.description && (
            <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
              {selectedHotel.description}
            </Text>
          )}

          <View className="bg-green-50 px-3 py-2 rounded-lg self-start mb-3">
            <Text className="text-green-700 text-sm font-semibold">
              ${selectedHotel.pricePerNightUSD.min}-${selectedHotel.pricePerNightUSD.max}/night
            </Text>
          </View>

          <View className="flex-row flex-wrap gap-1.5 mb-3">
            {selectedHotel.amenities.slice(0, 4).map((amenity, idx) => (
              <View key={idx} className="bg-indigo-50 px-2 py-1 rounded-md">
                <Text className="text-indigo-700 text-xs">{amenity}</Text>
              </View>
            ))}
          </View>

          {selectedHotel.warnings && (
            <View className="bg-amber-50 p-3 rounded-xl mb-3">
              <Text className="text-amber-700 text-sm">⚠️ {selectedHotel.warnings}</Text>
            </View>
          )}

          <TouchableOpacity
            className="bg-violet-500 p-3 rounded-xl items-center"
            onPress={() => handleHotelBook(selectedHotel.bookingUrl)}
          >
            <Text className="text-white font-semibold">Book on Booking.com →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Legend */}
      <View className="absolute top-12 left-4 right-4 bg-white/95 rounded-xl p-3 flex-row justify-around shadow-sm">
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full mr-1.5 bg-sky-500" />
          <Text className="text-xs text-gray-600">Airport</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full mr-1.5 bg-green-500" />
          <Text className="text-xs text-gray-600">Gem</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full mr-1.5 bg-orange-500" />
          <Text className="text-xs text-gray-600">Conditional</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-2.5 h-2.5 rounded-full mr-1.5 bg-violet-500" />
          <Text className="text-xs text-gray-600">Hotel</Text>
        </View>
      </View>

      {/* Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0 flex-row bg-white p-4 border-t border-gray-100 gap-3">
        <TouchableOpacity
          className="flex-1 p-3.5 bg-blue-500 rounded-xl items-center"
          onPress={() => router.back()}
        >
          <Text className="text-white text-base font-semibold">← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 p-3.5 bg-violet-500 rounded-xl items-center"
          onPress={() => router.push({
            pathname: '/checklist',
            params: { itineraryId: data.itinerary.id }
          })}
        >
          <Text className="text-white text-base font-semibold">📋 List</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 p-3.5 bg-blue-500 rounded-xl items-center"
          onPress={() =>
            router.push({
              pathname: '/itinerary',
              params: { data: JSON.stringify(data) },
            })
          }
        >
          <Text className="text-white text-base font-semibold">Details →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


