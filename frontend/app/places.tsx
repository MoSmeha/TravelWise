import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import api, { placesService } from '../services/api';
import type { Place } from '../types/api';

// ==========================================
// PLACES PAGE - Map View
// Shows places from database on an interactive map
// Fetches photos from Google Places API on click
// ==========================================

const PIN_COLORS: Record<string, string> = {
  HIDDEN_GEM: '#22c55e',
  CONDITIONAL: '#f97316',
  TOURIST_TRAP: '#ef4444',
};

export default function PlacesScreen() {
  // Places state
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'HIDDEN_GEM' | 'CONDITIONAL' | 'TOURIST_TRAP'>('all');
  
  // Selected place for modal
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [placePhotos, setPlacePhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  
  useEffect(() => {
    loadPlaces();
  }, []);
  
  const loadPlaces = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await placesService.getPlaces({ limit: 100 });
      console.log('Loaded places:', response.data.length);
      setPlaces(response.data);
    } catch (err: any) {
      console.error('Failed to load places:', err);
      setError(err.message || 'Failed to load places from database');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch Google Places photos when a place is selected
  const fetchGooglePhotos = async (placeName: string, latitude: number, longitude: number) => {
    try {
      setLoadingPhotos(true);
      setPlacePhotos([]);
      
      // Call backend to get Google Places photos
      const response = await api.get('/places/photos', {
        params: { name: placeName, lat: latitude, lng: longitude }
      });
      
      if (response.data.photos && response.data.photos.length > 0) {
        setPlacePhotos(response.data.photos);
      }
    } catch (err) {
      console.log('Could not fetch Google photos:', err);
      // Silently fail - photos are optional
    } finally {
      setLoadingPhotos(false);
    }
  };
  
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
  
  const openPlaceModal = async (place: Place) => {
    setSelectedPlace(place);
    setModalVisible(true);
    
    // Fetch Google Places photos
    if (place.latitude && place.longitude) {
      fetchGooglePhotos(place.name, place.latitude, place.longitude);
    }
  };
  
  // Get places with valid coordinates
  const validPlaces = filteredPlaces.filter(p => p.latitude && p.longitude);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading places from database...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.errorHint}>
          Make sure the backend is running and the database migration has been applied.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadPlaces}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with filter */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          📍 {validPlaces.length} Places with Coordinates
        </Text>
        <Text style={styles.headerSubtitle}>
          Total: {places.length} places loaded
        </Text>
        
        {/* Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <View style={styles.filterRow}>
            {[
              { key: 'all', label: 'All', color: '#007AFF' },
              { key: 'HIDDEN_GEM', label: '💎 Hidden Gems', color: '#22c55e' },
              { key: 'CONDITIONAL', label: '⚠️ Conditional', color: '#f97316' },
              { key: 'TOURIST_TRAP', label: '🚫 Tourist Traps', color: '#ef4444' },
            ].map((f) => (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: filter === f.key ? f.color : '#e5e7eb' }
                ]}
                onPress={() => setFilter(f.key as any)}
              >
                <Text style={[
                  styles.filterChipText,
                  { color: filter === f.key ? '#fff' : '#374151' }
                ]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
      
      {/* Map View */}
      <MapView
        style={styles.map}
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
            pinColor={PIN_COLORS[place.classification] || '#007AFF'}
            onPress={() => openPlaceModal(place)}
          >
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>{place.name}</Text>
                <Text style={styles.calloutCity}>{place.city}</Text>
                <Text style={styles.calloutHint}>Tap for details & photos →</Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
      
      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>Legend</Text>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.legendText}>Hidden Gem</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
          <Text style={styles.legendText}>Conditional</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendText}>Tourist Trap</Text>
        </View>
      </View>
      
      {/* Place Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {selectedPlace && (
                <>
                  {/* Close button */}
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                  
                  {/* Google Places Photos */}
                  {loadingPhotos && (
                    <View style={styles.photoLoading}>
                      <ActivityIndicator color="#007AFF" />
                      <Text style={styles.photoLoadingText}>Loading photos...</Text>
                    </View>
                  )}
                  
                  {placePhotos.length > 0 && (
                    <ScrollView horizontal style={styles.photoScroll} showsHorizontalScrollIndicator={false}>
                      {placePhotos.map((photoUrl, idx) => (
                        <Image 
                          key={idx}
                          source={{ uri: photoUrl }}
                          style={styles.photo}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  )}
                  
                  {/* Header */}
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedPlace.name}</Text>
                    <View style={[
                      styles.classificationBadge,
                      { backgroundColor: PIN_COLORS[selectedPlace.classification] + '20' }
                    ]}>
                      <Text style={[
                        styles.classificationText,
                        { color: PIN_COLORS[selectedPlace.classification] }
                      ]}>
                        {selectedPlace.classification === 'HIDDEN_GEM' ? '💎 Hidden Gem' :
                         selectedPlace.classification === 'CONDITIONAL' ? '⚠️ Conditional' : '🚫 Tourist Trap'}
                      </Text>
                    </View>
                  </View>
                  
                  {/* Location & Category */}
                  <View style={styles.tagsRow}>
                    <View style={styles.categoryTag}>
                      <Text style={styles.categoryTagText}>{selectedPlace.category}</Text>
                    </View>
                    <View style={styles.cityTag}>
                      <Text style={styles.cityTagText}>📍 {selectedPlace.city}</Text>
                    </View>
                  </View>
                  
                  {/* Description */}
                  <Text style={styles.description}>{selectedPlace.description}</Text>
                  
                  {/* Sources */}
                  <Text style={styles.sourcesTitle}>Data Sources:</Text>
                  <View style={styles.sourcesRow}>
                    {selectedPlace.sources.map((source, idx) => (
                      <View key={idx} style={styles.sourceTag}>
                        <Text style={styles.sourceTagText}>
                          {source === 'reddit' ? '🤖 Reddit Reviews' : 
                           source === 'tripadvisor' ? '📝 TripAdvisor' : '📱 TikTok'}
                        </Text>
                      </View>
                    ))}
                  </View>
                  
                  {/* Rating if available */}
                  {selectedPlace.rating && (
                    <View style={styles.ratingBox}>
                      <Text style={styles.ratingText}>
                        ⭐ {selectedPlace.rating.toFixed(1)}/5 ({selectedPlace.popularity} reviews)
                      </Text>
                    </View>
                  )}
                  
                  {/* Local tip if available */}
                  {selectedPlace.localTip && (
                    <View style={styles.tipBox}>
                      <Text style={styles.tipText}>💡 {selectedPlace.localTip}</Text>
                    </View>
                  )}
                  
                  {/* Close button */}
                  <TouchableOpacity 
                    style={styles.modalCloseButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalCloseButtonText}>Close</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  errorText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    marginBottom: 12,
  },
  filterScroll: {
    marginTop: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  map: {
    flex: 1,
  },
  callout: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  calloutCity: {
    fontSize: 12,
    color: '#666',
  },
  calloutHint: {
    fontSize: 11,
    color: '#007AFF',
    marginTop: 4,
  },
  legend: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  legendTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    padding: 8,
    zIndex: 10,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666',
  },
  photoLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  photoLoadingText: {
    marginLeft: 8,
    color: '#666',
  },
  photoScroll: {
    marginBottom: 16,
  },
  photo: {
    width: 250,
    height: 180,
    borderRadius: 12,
    marginRight: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingRight: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
  },
  classificationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  classificationText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  categoryTag: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryTagText: {
    fontSize: 12,
    color: '#1d4ed8',
  },
  cityTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  cityTagText: {
    fontSize: 12,
    color: '#4b5563',
  },
  description: {
    color: '#4b5563',
    marginBottom: 16,
    lineHeight: 22,
  },
  sourcesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  sourceTag: {
    backgroundColor: '#ede9fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sourceTagText: {
    fontSize: 13,
    color: '#6d28d9',
  },
  ratingBox: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  ratingText: {
    color: '#92400e',
  },
  tipBox: {
    backgroundColor: '#fff7ed',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  tipText: {
    color: '#c2410c',
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
