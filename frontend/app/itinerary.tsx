import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { LocationItem } from '../components/itinerary/LocationItem';
import { useAskQuestion } from '../hooks/mutations/useItinerary';
import { useItineraryStore } from '../store/itineraryStore';
import type { Hotel, ItineraryResponse, RAGResponse } from '../types/api';

export default function ItineraryScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const [data, setData] = useState<ItineraryResponse | null>(null);
  
  // Itinerary store for persisting active itinerary
  const setActiveItinerary = useItineraryStore((state) => state.setActiveItinerary);
  
  // RAG Chatbot state
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatAnswer, setChatAnswer] = useState<RAGResponse | null>(null);
  const [showChat, setShowChat] = useState(false);
  
  // React Query Hooks
  const askQuestionMutation = useAskQuestion();


  useEffect(() => {
    if (params.data) {
      try {
        const parsed = JSON.parse(params.data as string);
        setData(parsed);
        
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
  
  // Ask question using RAG
  const askQuestion = async () => {
    if (!chatQuestion.trim() || !data?.itinerary.id) return;
    
    try {
      setChatAnswer(null);
      const response = await askQuestionMutation.mutateAsync({
        itineraryId: data.itinerary.id,
        question: chatQuestion,
      });
      setChatAnswer(response);
    } catch (err: any) {
      Alert.alert(
        'Error', 
        err.response?.data?.message || 'Failed to get answer. Embeddings may not be generated yet.'
      );
    }
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
            <Text style={styles.title}>{data.country?.name || 'Your'} Trip</Text>
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
              <LocationItem key={location.id} location={location} index={index} />
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
                  style={[styles.chatSendButton, askQuestionMutation.isPending && styles.chatSendButtonDisabled]}
                  onPress={askQuestion}
                  disabled={askQuestionMutation.isPending}
                >
                  {askQuestionMutation.isPending ? (
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
