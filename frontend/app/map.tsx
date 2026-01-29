import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as ExpoLocation from 'expo-location';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, View, TouchableOpacity } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { MapPin, MapPinOff, Plane, Hotel as HotelIcon } from 'lucide-react-native';
import { placesService } from '../services/api';
import { DAY_COLORS } from '../constants/theme';
import { useItineraryDetails } from '../hooks/queries/useItineraries';
import { useMultipleDirections } from '../hooks/queries/useDirections';
import { useItineraryStore } from '../store/itineraryStore';
import { useLocationSharing } from '../hooks/useLocationSharing';
import type { Hotel, ItineraryResponse, Location } from '../types/api';
import {
  LocationMarker,
  LocationCard,
  HotelCard,
  MapHeader,
  BottomNavigation,
  MapLegend,
  CustomMapPin,
  BorderedPolyline,
  StableMarker,
} from '../components/map';

const HOTEL_COLOR = '#8b5cf6';
const AIRPORT_COLOR = '#0ea5e9';

interface LocationPhotosData {
  photos: string[];
  reviews: {
    author?: string;
    author_name?: string;
    rating: number;
    text: string;
  }[];
  loading: boolean;
}

export default function MapScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  

  const setActiveItinerary = useItineraryStore((state) => state.setActiveItinerary);
  

  const [passedData, setPassedData] = useState<ItineraryResponse | null>(null);
  

  const itineraryId = typeof params.itineraryId === 'string' ? params.itineraryId : null;
  const { data: fetchedData, isLoading: loadingItinerary } = useItineraryDetails(itineraryId || '');

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [locationPhotos, setLocationPhotos] = useState<Record<string, LocationPhotosData>>({});


  const { 
    isSharing, 
    hasPermission, 
    collaboratorLocations, 
    startSharing, 
    stopSharing 
  } = useLocationSharing(itineraryId, true);



  const data = passedData || (fetchedData as ItineraryResponse | undefined) || null;


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
    (async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
    })();
  }, []);

  useEffect(() => {
    if (params.data) {
      try {
        const parsed = JSON.parse(params.data as string);
        setPassedData(parsed);
        

        if (parsed.itinerary?.id) {
          setActiveItinerary(parsed.itinerary.id);
        }
      } catch (error) {
        console.error('Error parsing data:', error);
        Alert.alert('Error', 'Failed to load itinerary data');
      }
    }
  }, [params.data, setActiveItinerary]);





  const allLocations: Location[] = useMemo(() => {
    const locations: Location[] = [];
    
    data?.days?.forEach((day) => {
      // Add regular locations
      locations.push(...day.locations);
      
      // Add meals as locations
      if (day.meals) {
        [day.meals.breakfast, day.meals.lunch, day.meals.dinner].forEach((meal) => {
          if (meal) {
            locations.push({
              id: meal.id,
              name: meal.name,
              classification: 'HIDDEN_GEM' as const,
              category: meal.category,
              description: meal.description || `${meal.rating || 4}★ restaurant`,
              latitude: meal.latitude,
              longitude: meal.longitude,
              crowdLevel: 'MODERATE' as const,
              rating: meal.rating,
              totalRatings: meal.totalRatings,
              imageUrl: meal.imageUrl,
            } as Location);
          }
        });
      }
    });
    
    return locations;
  }, [data?.days]);
  
  const hotels: Hotel[] = data?.hotels || [];


  const dayRoutes = useMemo(() => {
    return (data?.days || []).map((day, index) => {
      const coords = day.locations.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
      }));


      if (index === 0 && data?.airport) {
        coords.unshift({
          latitude: data.airport.latitude,
          longitude: data.airport.longitude,
        });
      }
      return coords;
    });
  }, [data]);

  const initialRegion = {
    latitude: data?.airport?.latitude || allLocations[0]?.latitude || 0,
    longitude: data?.airport?.longitude || allLocations[0]?.longitude || 0,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  };


  const dayRouteQueries = useMemo(() => {
    return dayRoutes.map((route) => {
      if (route.length < 2) return null;
      return {
        origin: route[0],
        destination: route[route.length - 1],
        waypoints: route.slice(1, route.length - 1),
      };
    });
  }, [dayRoutes]);


  const connectorQueries = useMemo(() => {
    const queries: ({ origin: { latitude: number; longitude: number }; destination: { latitude: number; longitude: number }; waypoints?: undefined } | null)[] = [];
    for (let i = 0; i < dayRoutes.length - 1; i++) {
      const currentRoute = dayRoutes[i];
      const nextRoute = dayRoutes[i + 1];
      if (currentRoute.length > 0 && nextRoute.length > 0) {
        queries.push({
          origin: currentRoute[currentRoute.length - 1],
          destination: nextRoute[0],
        });
      } else {
        queries.push(null);
      }
    }
    return queries;
  }, [dayRoutes]);


  const dayDirectionsResults = useMultipleDirections(dayRouteQueries);
  const connectorDirectionsResults = useMultipleDirections(connectorQueries);


  const realRoutes = useMemo(() => {
    const routes: Record<number, { latitude: number; longitude: number }[]> = {};
    dayDirectionsResults.forEach((result, index) => {
      if (result.data) {
        routes[index] = result.data;
      }
    });
    return routes;
  }, [dayDirectionsResults]);

  const connectorRoutes = useMemo(() => {
    const routes: Record<number, { latitude: number; longitude: number }[]> = {};
    connectorDirectionsResults.forEach((result, index) => {
      if (result.data) {
        routes[index] = result.data;
      }
    });
    return routes;
  }, [connectorDirectionsResults]);


  if (loadingItinerary && !passedData && itineraryId) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="text-center mt-2.5">Loading itinerary...</Text>
      </View>
    );
  }


  if (!data) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-center mt-5">No itinerary data found.</Text>
      </View>
    );
  }

  const handleHotelBook = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open booking link');
    });
  };

  const handleNavigateToItinerary = () => {

    router.push({
      pathname: '/itinerary',
      params: { 
        itineraryId: data.itinerary.id,

      },
    });
  };

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen options={{ headerShown: false }} />
      

      <MapHeader
        countryName={data.country?.name || 'Trip'}
        numberOfDays={data.itinerary.numberOfDays}
        locationCount={allLocations.length}
        itineraryId={data.itinerary.id}
      />

      <MapLegend 
        days={data.itinerary.numberOfDays} 
        selectedDay={selectedDay}
        onSelectDay={(dayIndex) => setSelectedDay(prev => prev === dayIndex ? null : dayIndex)}
      />


      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >

        {dayRoutes.map((fallbackRoute, index) => {
          const routeToRender = realRoutes[index] || fallbackRoute;
          
          const isSelected = selectedDay === index;
          const isDimmed = selectedDay !== null && !isSelected;

          let connector = null;
          if (index < dayRoutes.length - 1) {
             const nextFallback = dayRoutes[index + 1];
             const nextRoute = realRoutes[index + 1] || nextFallback;
             
             if (routeToRender.length > 0 && nextRoute.length > 0) {

               const fetchedConnector = connectorRoutes[index];
               const start = routeToRender[routeToRender.length - 1];
               const end = nextRoute[0];
               
               const connectorCoords = fetchedConnector || [start, end];
               
               // Dim connectors if any specific day is selected
               const isConnectorDimmed = selectedDay !== null;

               connector = (
                 <Polyline
                   key={`connector-${index}`}
                   coordinates={connectorCoords}
                   strokeColor={isConnectorDimmed ? "#E5E7EB" : "#9CA3AF"}
                   strokeWidth={isConnectorDimmed ? 3 : 5}
                   lineDashPattern={[10, 5]}
                   zIndex={isConnectorDimmed ? 0 : 5}
                 />
               );
             }
          }

          return (
            <React.Fragment key={`route-group-${index}`}>

              {routeToRender.length > 1 && (
                <BorderedPolyline
                  key={`route-${index}`}
                  coordinates={routeToRender}
                  color={DAY_COLORS[index % DAY_COLORS.length]}
                  isDimmed={isDimmed}
                />
              )}

              {connector}
            </React.Fragment>
          );
        })}


        {data.airport && (
          <StableMarker
            coordinate={{
              latitude: data.airport.latitude,
              longitude: data.airport.longitude,
            }}
            title={`✈️ ${data.airport.name}`}
            description="Your arrival airport"
          >
            <CustomMapPin
              color={AIRPORT_COLOR}
              icon={<Plane size={18} color="white" strokeWidth={2.5} />}
            />
          </StableMarker>
        )}


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


        {hotels.map((hotel) => (
          <StableMarker
            key={hotel.id}
            coordinate={{
              latitude: hotel.latitude,
              longitude: hotel.longitude,
            }}
            title={`🏨 ${hotel.name}`}
            description={hotel.neighborhood}
            onPress={() => {
              setSelectedHotel(hotel);
              setSelectedLocation(null);
            }}
          >
            <CustomMapPin
              color={HOTEL_COLOR}
              icon={<HotelIcon size={18} color="white" strokeWidth={2.5} />}
            />
          </StableMarker>
        ))}


        {collaboratorLocations.map((userData) => (
          <Marker
            key={userData.userId}
            coordinate={{
              latitude: userData.location.latitude,
              longitude: userData.location.longitude,
            }}
            title={`👤 User ${userData.userId}`}
            description="Live location"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="bg-blue-500 rounded-full p-2 border-2 border-white shadow-lg">
              <MapPin size={20} color="white" />
            </View>
          </Marker>
        ))}
      </MapView>


      {selectedLocation && (
        <LocationCard
          location={selectedLocation}
          locationPhotos={locationPhotos[selectedLocation.id]}
          onClose={() => setSelectedLocation(null)}
        />
      )}


      {selectedHotel && (
        <HotelCard
          hotel={selectedHotel}
          onClose={() => setSelectedHotel(null)}
          onBook={handleHotelBook}
        />
      )}


      {itineraryId && hasPermission && (
        <View className="absolute bottom-28 right-4 z-10">
          <TouchableOpacity
            onPress={() => {
              if (isSharing) {
                stopSharing();
              } else {
                startSharing();
              }
            }}
            className={`p-4 rounded-full shadow-lg ${
              isSharing ? 'bg-green-500' : 'bg-gray-700'
            }`}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 3.84,
              elevation: 5,
            }}
          >
            {isSharing ? (
              <MapPin size={24} color="white" />
            ) : (
              <MapPinOff size={24} color="white" />
            )}
          </TouchableOpacity>
          {isSharing && collaboratorLocations.length > 0 && (
            <View className="absolute -top-1 -right-1 bg-blue-500 rounded-full w-5 h-5 items-center justify-center">
              <Text className="text-white text-xs font-bold">
                {collaboratorLocations.length}
              </Text>
            </View>
          )}
        </View>
      )}


      <BottomNavigation
        itineraryId={data.itinerary.id}
        data={data}
        onNavigateToItinerary={handleNavigateToItinerary}
      />
    </View>
  );
}
