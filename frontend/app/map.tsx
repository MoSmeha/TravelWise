import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { AlertTriangle, ArrowLeft, Clock, DollarSign, List, MapPin, Star, X } from 'lucide-react-native';
import { placesService } from '../services/api';
import { CLASSIFICATION_COLORS, DAY_COLORS } from '../constants/theme';
import { useItineraryDetails } from '../hooks/queries/useItineraries';
import { useItineraryStore } from '../store/itineraryStore';
import type { Hotel, ItineraryResponse, Location } from '../types/api';

const HOTEL_COLOR = '#8b5cf6';
const AIRPORT_COLOR = '#0ea5e9';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, MessageCircle } from 'lucide-react-native';

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
  const [isNavigatingToItinerary, setIsNavigatingToItinerary] = useState(false);

  // Combine data sources: prefer passed, then fetched
  const data = passedData || (fetchedData as ItineraryResponse | undefined) || null;

  // Fetch photos for a location
  const fetchPhotosForLocation = async (locationId: string, locationName: string, lat?: number, lng?: number) => {
    if (locationPhotos[locationId]?.photos.length > 0 || locationPhotos[locationId]?.loading) return;
    
    setLocationPhotos(prev => ({ ...prev, [locationId]: { photos: [], reviews: [], loading: true } }));
    
    try {
      const data = await placesService.getPlacePhotos(locationName, lat, lng, locationId);

      
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

  // Combined render for Location Card (Always Expanded)
  const renderLocationCard = () => {
    if (!selectedLocation) return null;

    return (
      <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl elevation-10 z-50 h-[70%]">
        {/* Close Button (Absolute) */}
        <TouchableOpacity
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 items-center justify-center z-10"
          onPress={() => {
            setSelectedLocation(null);
          }}
        >
          <X size={20} color="#6b7280" />
        </TouchableOpacity>

        <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View className="mb-4">
             {/* Image */}
             <View className="mb-3">
              {(selectedLocation.imageUrl || selectedLocation.imageUrls?.[0] || locationPhotos[selectedLocation.id]?.photos?.[0]) ? (
                <Image 
                  source={{ uri: selectedLocation.imageUrl || selectedLocation.imageUrls?.[0] || locationPhotos[selectedLocation.id]?.photos?.[0] }} 
                  className="w-full rounded-2xl h-56"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full bg-gray-200 rounded-2xl items-center justify-center h-56">
                   <Image source={require('../assets/images/icon.png')} className="w-16 h-16 opacity-20" />
                </View>
              )}
             </View>

             <View className="flex-row justify-between items-start">
               <View className="flex-1 pr-2">
                 {/* Classification Badge */}
                  <View
                    className="self-start px-3 py-1 rounded-full mb-2"
                    style={{ backgroundColor: CLASSIFICATION_COLORS[selectedLocation.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF' }}
                  >
                    <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                      {selectedLocation.classification.replace('_', ' ')}
                    </Text>
                  </View>
                  
                  <Text className="text-2xl font-bold text-gray-900 leading-tight mb-0.5">{selectedLocation.name}</Text>
                  <Text className="text-sm text-gray-500 capitalize font-medium">
                    {selectedLocation.category.toString().toLowerCase().replace(/_/g, ' ')}
                  </Text>
               </View>
                
               {/* Rating Badge */}
               {selectedLocation.rating && (
                  <View className="bg-amber-50 px-3 py-2 rounded-xl items-center border border-amber-100">
                    <View className="flex-row items-center gap-1">
                       <Star size={14} color="#f59e0b" fill="#f59e0b" />
                       <Text className="text-amber-700 text-sm font-bold">{selectedLocation.rating}</Text>
                    </View>
                    {selectedLocation.totalRatings && (
                      <Text className="text-amber-600/70 text-[10px]">{selectedLocation.totalRatings} reviews</Text>
                    )}
                  </View>
               )}
             </View>
          </View>

          {/* Content Section */}
          <View>
              {/* Info Grid */}
              <View className="flex-row flex-wrap gap-2 mb-4">
                  {/* Price Level */}
                  {selectedLocation.priceLevel && (
                    <View className="bg-green-50 px-3 py-2 rounded-xl flex-row items-center gap-1.5 border border-green-100">
                      <DollarSign size={14} color="#15803d" />
                      <Text className="text-green-700 text-xs font-semibold">
                        {selectedLocation.priceLevel === 'INEXPENSIVE' ? '$' : 
                        selectedLocation.priceLevel === 'MODERATE' ? '$$' : 
                        selectedLocation.priceLevel === 'EXPENSIVE' ? '$$$' : '$'}
                      </Text>
                    </View>
                  )}

                  {(selectedLocation.costMinUSD || selectedLocation.costMaxUSD) && (
                    <View className="bg-emerald-50 px-3 py-2 rounded-xl flex-row items-center gap-1.5 border border-emerald-100">
                      <Text className="text-emerald-700 text-xs font-semibold">{formatCost(selectedLocation)}</Text>
                    </View>
                  )}
                  
                  {selectedLocation.bestTimeToVisit && (
                    <View className="bg-blue-50 px-3 py-2 rounded-xl flex-row items-center gap-1.5 border border-blue-100">
                      <Clock size={14} color="#1d4ed8" />
                      <Text className="text-blue-700 text-xs font-semibold">{selectedLocation.bestTimeToVisit}</Text>
                    </View>
                  )}
                  

              </View>

            {selectedLocation.description && (
                <Text className="text-base text-gray-600 mb-6 leading-6">
                  {selectedLocation.description}
                </Text>
             )}

             {/* Opening Hours Detail - Always Visible */}
             <View className="mb-6 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <View className="p-4 bg-gray-50 border-b border-gray-100 flex-row items-center gap-2">
                  <Clock size={16} color="#374151" />
                  <Text className="text-sm font-bold text-gray-900">Opening Hours</Text>
                </View>
                
                <View className="p-4 pt-3">
                  {(selectedLocation.openingHours?.weekdayText || selectedLocation.openingHours?.weekday_text || selectedLocation.openingHours?.weekdayDescriptions) ? (
                    ((selectedLocation.openingHours.weekdayText || selectedLocation.openingHours.weekday_text || selectedLocation.openingHours.weekdayDescriptions) as string[]).map((day, idx) => (
                      <View key={idx} className="flex-row justify-between py-1 border-b border-gray-100 last:border-0">
                        <Text className="text-xs text-gray-600 font-medium">{day.split(': ')[0]}</Text>
                        <Text className="text-xs text-gray-800">{day.split(': ')[1] || 'Closed'}</Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-xs text-gray-500 italic">Not provided</Text>
                  )}
                </View>
             </View>

             {/* Full Gallery */}
             <Text className="text-lg font-bold text-gray-900 mb-3">Photos</Text>
             <ScrollView horizontal className="mb-6 -mx-1" showsHorizontalScrollIndicator={false}>
                {(selectedLocation.imageUrls?.length ? selectedLocation.imageUrls : (locationPhotos[selectedLocation.id]?.photos || [selectedLocation.imageUrl])).filter(Boolean).map((url, i) => (
                  <TouchableOpacity key={i} activeOpacity={0.8} onPress={() => {/* Maybe open zoom view later */}}>
                    <Image source={{ uri: url }} className="w-40 h-28 rounded-xl mx-1 bg-gray-100" resizeMode="cover" />
                  </TouchableOpacity>
                ))}
                {locationPhotos[selectedLocation.id]?.loading && (
                  <View className="w-40 h-28 rounded-xl mx-1 bg-gray-50 items-center justify-center">
                    <ActivityIndicator color="#007AFF" />
                  </View>
                )}
             </ScrollView>

             {/* Reviews */}
             <Text className="text-lg font-bold text-gray-900 mb-3">Reviews & Tips</Text>
             
             {/* AI Reasoning / Tips */}
             {selectedLocation.aiReasoning && (
              <View className="mb-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                 <Text className="text-indigo-800 text-sm font-medium mb-1">💡 TravelWise Tip</Text>
                 <Text className="text-indigo-700 text-sm leading-5">{selectedLocation.aiReasoning}</Text>
              </View>
             )}

             {/* Scam Warning */}
              {selectedLocation.scamWarning && (
                <View className="mb-4 bg-red-50 p-4 rounded-xl border border-red-100 flex-row gap-3">
                  <AlertTriangle size={20} color="#b91c1c" />
                  <Text className="text-red-700 text-sm flex-1 leading-5">
                    <Text className="font-bold">Caution: </Text>
                    {selectedLocation.scamWarning}
                  </Text>
                </View>
              )}

             {/* Google Reviews */}
             {locationPhotos[selectedLocation.id]?.loading ? (
                <ActivityIndicator className="my-4" color="#007AFF" />
             ) : (locationPhotos[selectedLocation.id]?.reviews?.length ?? 0) > 0 ? (
                locationPhotos[selectedLocation.id]?.reviews.map((review, idx) => (
                  <View key={idx} className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="font-bold text-gray-900">{review.author || review.author_name}</Text>
                       <View className="flex-row gap-0.5">
                         {[...Array(5)].map((_, i) => (
                           <Star 
                             key={i} 
                             size={12} 
                             color={i < Math.round(review.rating) ? "#f59e0b" : "#d1d5db"} 
                             fill={i < Math.round(review.rating) ? "#f59e0b" : "transparent"}
                           />
                         ))}
                      </View>
                    </View>
                    <Text className="text-gray-600 text-sm leading-5">{review.text}</Text>
                  </View>
                ))
             ) : (
                <Text className="text-gray-400 italic mb-8">No community reviews available yet.</Text>
             )}
             
             <View className="h-20" />
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      {/* Custom Header */}
      <SafeAreaView edges={['top']} className="bg-white shadow-sm z-10 pb-2">
        <View className="flex-row items-center justify-between px-4 pt-2">
          
          <TouchableOpacity
            className="w-10 h-10 items-center justify-center mr-2"
            onPress={() => router.back()}
          >
           <ArrowLeft size={28} color="#000" />
          </TouchableOpacity>

          <View className="flex-1">
             <Text className="text-xl font-extrabold text-gray-900" numberOfLines={1}>
                {`${data.country?.name || 'Trip'} Adventure`}
             </Text>
             <Text className="text-sm text-gray-500 font-medium">
                {data.itinerary.numberOfDays} days • {allLocations.length} places
             </Text>
          </View>

          <TouchableOpacity
            className="bg-[#004e89] px-4 py-2 rounded-lg shadow-sm"
            onPress={() => router.push({
              pathname: '/checklist',
              params: { itineraryId: data.itinerary.id }
            })}
          >
            <Text className="text-white text-sm font-bold">Checklist</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

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
          <Marker
            key={`${location.id}-${index}`}
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

      {renderLocationCard()}

      {/* Hotel Info Card */}
      {selectedHotel && (
        <View className="absolute bottom-0 left-4 right-4 bg-white rounded-2xl p-4 shadow-lg">
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
            <Text className="text-sm text-gray-600 mb-3">
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



      {/* Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0 flex-row bg-white px-6 py-5 border-t border-gray-100 gap-4 shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)] pb-8">
        <TouchableOpacity
          className="flex-1 bg-[#8b5cf6] rounded-2xl flex-row items-center justify-center gap-2 shadow-lg shadow-violet-200 h-14"
          onPress={() => router.push({
            pathname: '/chat/new',
            params: { itineraryId: data.itinerary.id }
          })}
        >
          <Bot size={24} color="#fff" strokeWidth={2.5} />
          <Text className="text-white text-base font-bold tracking-wide">AI Assistant</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 bg-gray-100 rounded-2xl flex-row items-center justify-center gap-2 border border-gray-200 h-14 ${isNavigatingToItinerary ? 'opacity-50' : ''}`}
          onPress={() => {
            if (isNavigatingToItinerary) return;
            setIsNavigatingToItinerary(true);
            
            // Small delay to let the UI update (loader) before freezing on transition
            requestAnimationFrame(() => {
                router.push({
                    pathname: '/itinerary',
                    params: { data: JSON.stringify(data) },
                });
                
                // Reset state after a delay to ensure we can navigate again if we come back
                // or if the navigation "animation" completes
                setTimeout(() => {
                    setIsNavigatingToItinerary(false);
                }, 1000);
            });
          }}
          disabled={isNavigatingToItinerary}
        >
          {isNavigatingToItinerary ? (
            <ActivityIndicator size="small" color="#374151" />
          ) : (
            <>
              <MapPin size={22} color="#374151" strokeWidth={2.5} />
              <Text className="text-gray-700 text-base font-bold tracking-wide">Itinerary</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}


