import { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { CLASSIFICATION_COLORS, getClassificationLabel } from '../constants/theme';
import { usePlaces, usePlacePhotos } from '../hooks/queries/usePlaces';
import type { Place } from '../types/api';

export default function PlacesScreen() {
  // Places state
  const { data: placesResponse, isLoading: loading, error: queryError, refetch } = usePlaces({ limit: 100 });
  const places = placesResponse?.data || [];
  const error = queryError ? (queryError as Error).message : null;

  const [filter, setFilter] = useState<'all' | 'HIDDEN_GEM' | 'CONDITIONAL' | 'TOURIST_TRAP'>('all');
  
  // Selected place for modal
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Photos for selected place
  const { data: photosData, isLoading: loadingPhotos } = usePlacePhotos(
    selectedPlace?.name || '',
    selectedPlace?.latitude,
    selectedPlace?.longitude,
    modalVisible && !!selectedPlace
  );
  const placePhotos = photosData?.photos || [];
  
  const filteredPlaces = filter === 'all' 
    ? places 
    : places.filter(p => p.classification === filter);
  
  // Calculate map region based on places
  const getMapRegion = () => {
    const validPlaces = filteredPlaces.filter(p => p.latitude && p.longitude);
    
    if (validPlaces.length === 0) {
      // Default to Lebanon
      return {
        latitude: 33.8547,
        longitude: 35.8623,
        latitudeDelta: 1.5,
        longitudeDelta: 1.5,
      };
    }
    
    const lats = validPlaces.map(p => p.latitude);
    const lngs = validPlaces.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(maxLat - minLat, 0.5) * 1.5,
      longitudeDelta: Math.max(maxLng - minLng, 0.5) * 1.5,
    };
  };
  
  const openPlaceModal = (place: Place) => {
    setSelectedPlace(place);
    setModalVisible(true);
  };
  
  // Get places with valid coordinates
  const validPlaces = filteredPlaces.filter(p => p.latitude && p.longitude);
  
  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-gray-500">Loading places from database...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-100 p-6">
        <Text className="text-5xl mb-4">⚠️</Text>
        <Text className="text-xl font-semibold text-gray-900 mb-2">Connection Error</Text>
        <Text className="text-gray-500 text-center mb-4">{error}</Text>
        <Text className="text-sm text-gray-400 text-center mb-6">
          Make sure the backend is running and the database migration has been applied.
        </Text>
        <TouchableOpacity className="bg-primary px-6 py-3 rounded-lg" onPress={() => refetch()}>
          <Text className="text-white font-semibold">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filterOptions = [
    { key: 'all', label: 'All', color: '#007AFF' },
    { key: 'HIDDEN_GEM', label: '💎 Hidden Gems', color: '#22c55e' },
    { key: 'CONDITIONAL', label: '⚠️ Conditional', color: '#f97316' },
    { key: 'TOURIST_TRAP', label: '🚫 Tourist Traps', color: '#ef4444' },
  ];

  return (
    <View className="flex-1 bg-gray-100">
      {/* Header with filter */}
      <View className="bg-white p-4 border-b border-gray-200">
        <Text className="text-lg font-bold text-gray-900">
          📍 {validPlaces.length} Places with Coordinates
        </Text>
        <Text className="text-xs text-gray-500 mt-0.5 mb-3">
          Total: {places.length} places loaded
        </Text>
        
        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
          <View className="flex-row gap-2">
            {filterOptions.map((f) => (
              <TouchableOpacity
                key={f.key}
                className="px-4 py-2 rounded-full"
                style={{ backgroundColor: filter === f.key ? f.color : '#e5e7eb' }}
                onPress={() => setFilter(f.key as any)}
              >
                <Text 
                  className="text-sm font-medium"
                  style={{ color: filter === f.key ? '#fff' : '#374151' }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      
      {/* Map View */}
      <MapView
        className="flex-1"
        initialRegion={getMapRegion()}
        showsUserLocation
      >
        {validPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            pinColor={CLASSIFICATION_COLORS[place.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF'}
            onPress={() => openPlaceModal(place)}
          >
            <Callout tooltip>
              <View className="bg-white p-3 rounded-lg w-[200px] shadow-lg">
                <Text className="font-bold text-gray-900">{place.name}</Text>
                <Text className="text-xs text-gray-500">{place.city}</Text>
                <Text className="text-xs text-primary mt-1">Tap for details & photos →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      
      {/* Legend */}
      <View className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-lg">
        <Text className="text-xs font-semibold mb-2">Legend</Text>
        <View className="flex-row items-center mb-1">
          <View className="w-3 h-3 rounded-full bg-green-500 mr-2" />
          <Text className="text-xs text-gray-500">Hidden Gem</Text>
        </View>
        <View className="flex-row items-center mb-1">
          <View className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
          <Text className="text-xs text-gray-500">Conditional</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-red-500 mr-2" />
          <Text className="text-xs text-gray-500">Tourist Trap</Text>
        </View>
      </View>
      
      {/* Place Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPlace && (
                <>
                  {/* Close button */}
                  <TouchableOpacity 
                    className="absolute right-0 top-0 p-2 z-10"
                    onPress={() => setModalVisible(false)}
                  >
                    <Text className="text-2xl text-gray-500">✕</Text>
                  </TouchableOpacity>
                  
                  {/* Google Places Photos */}
                  {loadingPhotos && (
                    <View className="flex-row items-center justify-center p-4">
                      <ActivityIndicator color="#007AFF" />
                      <Text className="ml-2 text-gray-500">Loading photos...</Text>
                    </View>
                  )}
                  
                  {placePhotos.length > 0 && (
                    <ScrollView horizontal className="mb-4" showsHorizontalScrollIndicator={false}>
                      {placePhotos.map((photoUrl, idx) => (
                        <Image 
                          key={idx}
                          source={{ uri: photoUrl }}
                          className="w-[250px] h-[180px] rounded-xl mr-3"
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  )}
                  
                  {/* Header */}
                  <View className="flex-row justify-between items-start mb-3 pr-10">
                    <Text className="text-xl font-bold text-gray-900 flex-1">{selectedPlace.name}</Text>
                    <View 
                      className="px-2 py-1 rounded-xl"
                      style={{ backgroundColor: (CLASSIFICATION_COLORS[selectedPlace.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF') + '20' }}
                    >
                      <Text 
                        className="text-xs font-medium"
                        style={{ color: CLASSIFICATION_COLORS[selectedPlace.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF' }}
                      >
                        {getClassificationLabel(selectedPlace.classification as keyof typeof CLASSIFICATION_COLORS)}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Location & Category */}
                  <View className="flex-row gap-2 mb-3">
                    <View className="bg-blue-100 px-2 py-1 rounded">
                      <Text className="text-xs text-blue-700">{selectedPlace.category}</Text>
                    </View>
                    <View className="bg-gray-100 px-2 py-1 rounded">
                      <Text className="text-xs text-gray-600">📍 {selectedPlace.city}</Text>
                    </View>
                  </View>
                  
                  {/* Description */}
                  <Text className="text-gray-600 mb-4 leading-6">{selectedPlace.description}</Text>
                  
                  {/* Sources */}
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Data Sources:</Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">
                    {selectedPlace.sources.map((source, idx) => (
                      <View key={idx} className="bg-purple-100 px-3 py-1.5 rounded-full">
                        <Text className="text-sm text-purple-700">
                          {source === 'reddit' ? '🤖 Reddit Reviews' : 
                           source === 'tripadvisor' ? '📝 TripAdvisor' : '📱 TikTok'}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Rating if available */}
                  {selectedPlace.rating && (
                    <View className="bg-amber-100 p-3 rounded-lg mb-3">
                      <Text className="text-amber-800">
                        ⭐ {selectedPlace.rating.toFixed(1)}/5 ({selectedPlace.popularity} reviews)
                      </Text>
                    </View>
                  )}
                  
                  {/* Local tip if available */}
                  {selectedPlace.localTip && (
                    <View className="bg-orange-50 p-3 rounded-lg mb-3">
                      <Text className="text-orange-700">💡 {selectedPlace.localTip}</Text>
                    </View>
                  )}
                  
                  {/* Close button */}
                  <TouchableOpacity 
                    className="bg-primary p-4 rounded-lg items-center mt-2"
                    onPress={() => setModalVisible(false)}
                  >
                    <Text className="text-white font-semibold">Close</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
