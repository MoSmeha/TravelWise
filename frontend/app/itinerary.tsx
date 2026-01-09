import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    Image as RNImage,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { API_BASE_URL } from '../config/api';
import { itineraryService } from '../services/api';
import type { Hotel, ItineraryResponse, Location, RAGResponse } from '../types/api';

const PIN_COLORS = {
  HIDDEN_GEM: '#22c55e',
  CONDITIONAL: '#f97316',
  TOURIST_TRAP: '#ef4444',
};

export default function ItineraryScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<ItineraryResponse | null>(null);
  
  // RAG Chatbot state
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState<RAGResponse | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // Photo state for locations
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
  
  // Ask question using RAG
  const askQuestion = async () => {
    if (!chatQuestion.trim() || !data?.itinerary.id) return;
    
    try {
      setChatLoading(true);
      setChatAnswer(null);
      const response = await itineraryService.askQuestion(data.itinerary.id, chatQuestion);
      setChatAnswer(response);
    } catch (err: any) {
      Alert.alert(
        'Error', 
        err.response?.data?.message || 'Failed to get answer. Embeddings may not be generated yet.'
      );
    } finally {
      setChatLoading(false);
    }
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

  if (!data) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{data.country.name} Trip</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>🤖 AI</Text>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {data.itinerary.numberOfDays} days • ${data.itinerary.budgetUSD} budget
          </Text>
          <Text style={styles.airportInfo}>
            ✈️ Arriving at {data.airport.name} ({data.airport.code})
          </Text>
          {data.itinerary.totalEstimatedCostUSD && (
            <Text style={styles.budgetTotal}>
              💰 Est. Total: ${data.itinerary.totalEstimatedCostUSD} USD
            </Text>
          )}
        </View>

        {/* Budget Breakdown */}
        {data.itinerary.budgetBreakdown && (
          <View style={styles.budgetSection}>
            <Text style={styles.sectionTitle}>Budget Breakdown</Text>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>🍽️ Food:</Text>
              <Text style={styles.budgetValue}>${data.itinerary.budgetBreakdown.food}</Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>🎯 Activities:</Text>
              <Text style={styles.budgetValue}>${data.itinerary.budgetBreakdown.activities}</Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>🚗 Transport:</Text>
              <Text style={styles.budgetValue}>${data.itinerary.budgetBreakdown.transport}</Text>
            </View>
            <View style={styles.budgetRow}>
              <Text style={styles.budgetLabel}>🏨 Accommodation:</Text>
              <Text style={styles.budgetValue}>${data.itinerary.budgetBreakdown.accommodation}</Text>
            </View>
          </View>
        )}

        {/* Route Summary */}
        {data.routeSummary && (
          <View style={styles.routeSection}>
            <Text style={styles.sectionTitle}>🗺️ Route Overview</Text>
            <Text style={styles.routeText}>{data.routeSummary}</Text>
          </View>
        )}

        {/* Hotels Section */}
        {data.hotels && data.hotels.length > 0 && (
          <View style={styles.hotelsSection}>
            <Text style={styles.sectionTitle}>🏨 Recommended Hotels</Text>
            {data.hotels.map((hotel: Hotel) => (
              <View key={hotel.id} style={styles.hotelCard}>
                <Text style={styles.hotelName}>{hotel.name}</Text>
                <Text style={styles.hotelNeighborhood}>{hotel.neighborhood}</Text>
                <Text style={styles.hotelDescription}>{hotel.description}</Text>
                <Text style={styles.hotelPrice}>
                  ${hotel.pricePerNightUSD.min}-${hotel.pricePerNightUSD.max}/night
                </Text>
                <View style={styles.amenitiesRow}>
                  {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                    <View key={idx} style={styles.amenityTag}>
                      <Text style={styles.amenityText}>{amenity}</Text>
                    </View>
                  ))}
                </View>
                {hotel.warnings && (
                  <View style={styles.hotelWarning}>
                    <Text style={styles.hotelWarningText}>⚠️ {hotel.warnings}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.bookButton}
                  onPress={() => handleHotelBook(hotel.bookingUrl)}
                >
                  <Text style={styles.bookButtonText}>Book on Booking.com →</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Tourist Traps to Avoid */}
        {data.touristTraps && data.touristTraps.length > 0 && (
          <View style={styles.trapsSection}>
            <Text style={styles.sectionTitle}>🚫 Tourist Traps to Avoid</Text>
            {data.touristTraps.map((trap) => (
              <View key={trap.id} style={styles.trapCard}>
                <Text style={styles.trapName}>{trap.name}</Text>
                <Text style={styles.trapReason}>{trap.reason}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Local Tips */}
        {data.localTips && data.localTips.length > 0 && (
          <View style={styles.tipsSection}>
            <Text style={styles.sectionTitle}>💡 Local Tips</Text>
            {data.localTips.map((tip, idx) => (
              <Text key={idx} style={styles.tipText}>• {tip}</Text>
            ))}
          </View>
        )}

        {/* Warnings */}
        {data.warnings && data.warnings.length > 0 && (
          <View style={styles.warningsSection}>
            <Text style={styles.sectionTitle}>⚠️ Important Warnings</Text>
            {data.warnings.map((warning) => (
              <View key={warning.id} style={styles.warningCard}>
                <Text style={styles.warningCardTitle}>{warning.title}</Text>
                <Text style={styles.warningCardText}>{warning.description}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Daily Itinerary */}
        {data.days.map((day) => (
          <View key={day.id} style={styles.daySection}>
            <Text style={styles.dayTitle}>Day {day.dayNumber}</Text>
            {day.description && (
              <Text style={styles.dayDescription}>{day.description}</Text>
            )}
            {day.routeDescription && (
              <Text style={styles.dayRoute}>🗺️ {day.routeDescription}</Text>
            )}

            {day.locations.map((location, index) => (
              <View key={location.id} style={styles.locationCard}>
                <View style={styles.locationHeader}>
                  <View
                    style={[
                      styles.locationBadge,
                      { backgroundColor: PIN_COLORS[location.classification] },
                    ]}
                  />
                  <Text style={styles.locationNumber}>{index + 1}</Text>
                  <Text style={styles.locationName}>{location.name}</Text>
                </View>

                {location.imageUrl && (
                  <RNImage
                    source={{ uri: location.imageUrl }}
                    style={styles.locationImage}
                    resizeMode="cover"
                  />
                )}

                <Text style={styles.locationCategory}>{location.category}</Text>
                <Text style={styles.locationDescription}>
                  {location.description}
                </Text>

                <View style={styles.locationDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>💰 Cost:</Text>
                    <Text style={styles.detailValue}>{formatCost(location)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>⏰ Best time:</Text>
                    <Text style={styles.detailValue}>
                      {location.bestTimeToVisit}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>👥 Crowd:</Text>
                    <Text style={styles.detailValue}>{location.crowdLevel}</Text>
                  </View>
                  {location.travelTimeFromPrevious && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>🚗 Travel:</Text>
                      <Text style={styles.detailValue}>{location.travelTimeFromPrevious}</Text>
                    </View>
                  )}
                </View>

                {location.aiReasoning && (
                  <View style={styles.reasoningBox}>
                    <Text style={styles.reasoningText}>
                      🤖 {location.aiReasoning}
                    </Text>
                  </View>
                )}

                {location.scamWarning && (
                  <View style={styles.scamWarningBox}>
                    <Text style={styles.scamWarningText}>
                      🚨 {location.scamWarning}
                    </Text>
                  </View>
                )}
                
                {/* Photos and Reviews Section */}
                <TouchableOpacity 
                  style={styles.loadPhotosButton}
                  onPress={() => fetchPhotosForLocation(location.id, location.name, location.latitude, location.longitude)}
                >
                  <Text style={styles.loadPhotosButtonText}>
                    {locationPhotos[location.id]?.loading ? '⏳ Loading...' : '📷 View Photos & Reviews'}
                  </Text>
                </TouchableOpacity>
                
                {locationPhotos[location.id] && !locationPhotos[location.id].loading && (
                  <>
                    {locationPhotos[location.id].photos.length > 0 && (
                      <ScrollView horizontal style={styles.photoGallery} showsHorizontalScrollIndicator={false}>
                        {locationPhotos[location.id].photos.map((photoUrl, photoIdx) => (
                          <RNImage 
                            key={photoIdx} 
                            source={{ uri: photoUrl }} 
                            style={styles.galleryPhoto}
                            resizeMode="cover"
                          />
                        ))}
                      </ScrollView>
                    )}
                    
                    {locationPhotos[location.id].reviews.length > 0 && (
                      <View style={styles.reviewsSection}>
                        <Text style={styles.reviewsSectionTitle}>📝 Reviews</Text>
                        {locationPhotos[location.id].reviews.map((review, reviewIdx) => (
                          <View key={reviewIdx} style={styles.reviewCard}>
                            <Text style={styles.reviewAuthor}>{review.author} ⭐{review.rating}</Text>
                            <Text style={styles.reviewText} numberOfLines={3}>{review.text}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
            <Text style={styles.legendText}>Hidden Gem - Authentic local spot</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f97316' }]} />
            <Text style={styles.legendText}>Conditional - Good at specific times</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendText}>Tourist Trap - Avoid</Text>
          </View>
        </View>

        {/* RAG Chatbot Section */}
        <View style={styles.chatSection}>
          <TouchableOpacity 
            style={styles.chatToggle}
            onPress={() => setShowChat(!showChat)}
          >
            <Text style={styles.chatToggleText}>
              💬 {showChat ? 'Hide' : 'Ask Questions About Your Trip'}
            </Text>
          </TouchableOpacity>
          
          {showChat && (
            <View style={styles.chatContainer}>
              <Text style={styles.chatHint}>
                Ask anything about your itinerary, places, or recommendations:
              </Text>
              <View style={styles.chatInputRow}>
                <TextInput
                  style={styles.chatInput}
                  value={chatQuestion}
                  onChangeText={setChatQuestion}
                  placeholder="e.g., What's the best time to visit Jeita Grotto?"
                  multiline
                />
                <TouchableOpacity
                  style={[styles.chatSendButton, chatLoading && styles.chatSendButtonDisabled]}
                  onPress={askQuestion}
                  disabled={chatLoading}
                >
                  {chatLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.chatSendButtonText}>Ask</Text>
                  )}
                </TouchableOpacity>
              </View>
              
              {chatAnswer && (
                <View style={styles.chatAnswer}>
                  <Text style={styles.chatAnswerText}>{chatAnswer.answer}</Text>
                  <View style={styles.chatMeta}>
                    <Text style={styles.chatConfidence}>
                      Confidence: {Math.round(chatAnswer.confidence * 100)}%
                    </Text>
                    {chatAnswer.staleWarning && (
                      <Text style={styles.chatWarning}>⚠️ {chatAnswer.staleWarning}</Text>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.back()}
        >
          <Text style={styles.navButtonText}>← Back to Map</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push({
            pathname: '/checklist',
            params: { itineraryId: data.itinerary.id }
          })}
        >
          <Text style={styles.navButtonText}>📋 Checklist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, { backgroundColor: '#666' }]}
          onPress={() => router.push('/')}
        >
          <Text style={styles.navButtonText}>New Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  aiBadge: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
  },
  airportInfo: {
    fontSize: 14,
    color: '#0ea5e9',
    marginTop: 6,
  },
  budgetTotal: {
    fontSize: 17,
    fontWeight: '600',
    color: '#22c55e',
    marginTop: 8,
  },
  budgetSection: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  budgetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  budgetLabel: {
    fontSize: 14,
    color: '#333',
  },
  budgetValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22c55e',
  },
  routeSection: {
    backgroundColor: '#e0f2fe',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  routeText: {
    fontSize: 14,
    color: '#0369a1',
    lineHeight: 20,
  },
  hotelsSection: {
    margin: 16,
    marginTop: 0,
  },
  hotelCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  hotelName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  hotelNeighborhood: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  hotelDescription: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
  },
  hotelPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#22c55e',
    marginTop: 8,
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
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
  hotelWarning: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 6,
  },
  hotelWarningText: {
    fontSize: 13,
    color: '#92400e',
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
  trapsSection: {
    backgroundColor: '#fee2e2',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  trapCard: {
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
  },
  trapName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#991b1b',
  },
  trapReason: {
    fontSize: 13,
    color: '#b91c1c',
    marginTop: 2,
  },
  tipsSection: {
    backgroundColor: '#dbeafe',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#1e40af',
    marginBottom: 6,
  },
  warningsSection: {
    backgroundColor: '#fef3c7',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
  },
  warningCard: {
    marginBottom: 10,
  },
  warningCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
  },
  warningCardText: {
    fontSize: 13,
    color: '#b45309',
    marginTop: 2,
  },
  daySection: {
    marginBottom: 16,
  },
  dayTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    color: '#1a1a1a',
  },
  dayDescription: {
    fontSize: 15,
    color: '#666',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  dayRoute: {
    fontSize: 13,
    color: '#0369a1',
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontStyle: 'italic',
  },
  locationCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  locationNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 8,
  },
  locationName: {
    fontSize: 17,
    fontWeight: 'bold',
    flex: 1,
    color: '#1a1a1a',
  },
  locationCategory: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  locationImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationDescription: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
    lineHeight: 20,
  },
  locationDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
  },
  detailLabel: {
    fontSize: 14,
    width: 110,
  },
  detailValue: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  reasoningBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f3e8ff',
    borderRadius: 8,
  },
  reasoningText: {
    fontSize: 13,
    color: '#6b21a8',
  },
  scamWarningBox: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  scamWarningText: {
    fontSize: 13,
    color: '#991b1b',
  },
  legend: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
    color: '#666',
  },
  bottomBar: {
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
  chatSection: {
    margin: 16,
    marginTop: 0,
  },
  chatToggle: {
    backgroundColor: '#8b5cf6',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  chatToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  chatContainer: {
    backgroundColor: '#f3e8ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  chatHint: {
    fontSize: 14,
    color: '#6b21a8',
    marginBottom: 12,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#c4b5fd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 80,
  },
  chatSendButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatSendButtonDisabled: {
    opacity: 0.6,
  },
  chatSendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  chatAnswer: {
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  chatAnswerText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  chatMeta: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  chatConfidence: {
    fontSize: 12,
    color: '#6b21a8',
  },
  chatWarning: {
    fontSize: 12,
    color: '#ea580c',
  },
  // Photo and Review Styles
  loadPhotosButton: {
    marginTop: 12,
    backgroundColor: '#e0e7ff',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadPhotosButtonText: {
    color: '#4338ca',
    fontWeight: '600',
    fontSize: 14,
  },
  photoGallery: {
    marginTop: 12,
    marginHorizontal: -8,
  },
  galleryPhoto: {
    width: 150,
    height: 100,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  reviewsSection: {
    marginTop: 12,
  },
  reviewsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  reviewCard: {
    backgroundColor: '#f9fafb',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});
