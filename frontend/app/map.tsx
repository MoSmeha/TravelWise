import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { API_BASE_URL } from '../config/api';
import type { Hotel, ItineraryResponse, Location } from '../types/api';

const PIN_COLORS = {
  HIDDEN_GEM: '#22c55e',
  CONDITIONAL: '#f97316',
  TOURIST_TRAP: '#ef4444',
};

const HOTEL_COLOR = '#8b5cf6';
const AIRPORT_COLOR = '#0ea5e9';

export default function MapScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<ItineraryResponse | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [locationPhotos, setLocationPhotos] = useState<Record<string, { photos: string[], reviews: any[], loading: boolean }>>({});

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
  }, [selectedLocation]);

  useEffect(() => {
    if (params.data) {
      try {
        const parsed = JSON.parse(params.data as string);
        setData(parsed);
      } catch (error) {
        console.error('Error parsing data:', error);
        Alert.alert('Error', 'Failed to load itinerary data');
      }
    }
  }, [params.data]);

  if (!data) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
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
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
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
            pinColor={PIN_COLORS[location.classification]}
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
        <View style={styles.infoCard}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedLocation(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>


          <ScrollView style={styles.cardScroll}>
            <View
              style={[
                styles.badge,
                { backgroundColor: PIN_COLORS[selectedLocation.classification] },
              ]}
            >
              <Text style={styles.badgeText}>
                {selectedLocation.classification.replace('_', ' ')}
              </Text>
            </View>

            <Text style={styles.locationName}>{selectedLocation.name}</Text>
            <Text style={styles.locationCategory}>{selectedLocation.category}</Text>
            <Text style={styles.locationDescription}>
              {selectedLocation.description}
            </Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cost:</Text>
              <Text style={styles.infoValue}>{formatCost(selectedLocation)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Best time:</Text>
              <Text style={styles.infoValue}>{selectedLocation.bestTimeToVisit}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Crowd level:</Text>
              <Text style={styles.infoValue}>{selectedLocation.crowdLevel}</Text>
            </View>

            {selectedLocation.scamWarning && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  🚨 {selectedLocation.scamWarning}
                </Text>
              </View>
            )}

            {/* Photos & Reviews */}
            {locationPhotos[selectedLocation.id]?.loading ? (
              <View style={styles.photosLoading}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.photosLoadingText}>Loading photos & reviews...</Text>
              </View>
            ) : (
              <>
                {locationPhotos[selectedLocation.id]?.photos.length > 0 && (
                  <ScrollView horizontal style={styles.miniGallery} showsHorizontalScrollIndicator={false}>
                    {locationPhotos[selectedLocation.id].photos.map((url, idx) => (
                      <Image key={idx} source={{ uri: url }} style={styles.miniPhoto} resizeMode="cover" />
                    ))}
                  </ScrollView>
                )}
                
                {locationPhotos[selectedLocation.id]?.reviews.length > 0 && (
                  <View style={styles.miniReviews}>
                    <Text style={styles.miniReviewsTitle}>Top Review:</Text>
                    <View style={styles.miniReviewCard}>
                      <Text style={styles.miniReviewAuthor}>
                        {locationPhotos[selectedLocation.id].reviews[0].author} ⭐{locationPhotos[selectedLocation.id].reviews[0].rating}
                      </Text>
                      <Text style={styles.miniReviewText} numberOfLines={3}>
                        "{locationPhotos[selectedLocation.id].reviews[0].text}"
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* Hotel Info Card */}
      {selectedHotel && (
        <View style={styles.infoCard}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedHotel(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <View style={[styles.badge, { backgroundColor: HOTEL_COLOR }]}>
            <Text style={styles.badgeText}>🏨 HOTEL</Text>
          </View>

          <Text style={styles.locationName}>{selectedHotel.name}</Text>
          <Text style={styles.locationCategory}>{selectedHotel.neighborhood}</Text>
          <Text style={styles.locationDescription}>
            {selectedHotel.description}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Price/night:</Text>
            <Text style={styles.infoValue}>
              ${selectedHotel.pricePerNightUSD.min}-${selectedHotel.pricePerNightUSD.max}
            </Text>
          </View>

          <View style={styles.amenitiesRow}>
            {selectedHotel.amenities.slice(0, 4).map((amenity, idx) => (
              <View key={idx} style={styles.amenityTag}>
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>

          {selectedHotel.warnings && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>⚠️ {selectedHotel.warnings}</Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => handleHotelBook(selectedHotel.bookingUrl)}
          >
            <Text style={styles.bookButtonText}>Book on Booking.com →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legendBar}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: AIRPORT_COLOR }]} />
          <Text style={styles.legendText}>Airport</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Gem</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: HOTEL_COLOR }]} />
          <Text style={styles.legendText}>Hotel</Text>
        </View>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
        >
          <Text style={styles.navButtonText}>← Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: '#8b5cf6' }]}
          onPress={() => router.push({
            pathname: '/checklist',
            params: { itineraryId: data.itinerary.id }
          })}
        >
          <Text style={styles.navButtonText}>📋 List</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() =>
            router.push({
              pathname: '/itinerary',
              params: { data: JSON.stringify(data) },
            })
          }
        >
          <Text style={styles.navButtonText}>View Details →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  infoCard: {
    position: 'absolute',
    bottom: 130,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 400,
  },
  cardScroll: {
    maxHeight: 320,
  },
  miniGallery: {
    marginTop: 12,
    marginHorizontal: -4,
  },
  miniPhoto: {
    width: 120,
    height: 80,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  miniReviews: {
    marginTop: 12,
  },
  miniReviewsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4,
  },
  miniReviewCard: {
    backgroundColor: '#f9f9f9',
    padding: 8,
    borderRadius: 8,
  },
  miniReviewAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  miniReviewText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  photosLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  photosLoadingText: {
    fontSize: 12,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
    paddingRight: 30,
  },
  locationCategory: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  locationDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  warningBox: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#991b1b',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  amenityTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  amenityText: {
    fontSize: 12,
    color: '#4338ca',
  },
  bookButton: {
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  legendBar: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    gap: 12,
  },
  navButton: {
    flex: 1,
    padding: 14,
    backgroundColor: '#007AFF',
    borderRadius: 10,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
