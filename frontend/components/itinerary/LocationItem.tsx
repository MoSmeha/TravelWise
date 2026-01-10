import React, { useState } from 'react';
import {
  Image as RNImage,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { usePlacePhotos } from '../../hooks/queries/usePlaces';
import { Location } from '../../types/api';

const PIN_COLORS: Record<string, string> = {
  HIDDEN_GEM: '#22c55e',
  CONDITIONAL: '#f97316',
  TOURIST_TRAP: '#ef4444',
};

interface LocationItemProps {
  location: Location;
  index: number;
}

export const LocationItem: React.FC<LocationItemProps> = ({ location, index }) => {
  const [showPhotos, setShowPhotos] = useState(false);
  const { data, isLoading } = usePlacePhotos(
    location.name,
    location.latitude,
    location.longitude,
    showPhotos
  );

  const formatCost = (loc: Location) => {
    if (loc.costMinUSD && loc.costMaxUSD) {
      return `$${loc.costMinUSD}-$${loc.costMaxUSD}`;
    }
    return 'Cost varies';
  };

  return (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <View
          style={[
            styles.locationBadge,
            { backgroundColor: PIN_COLORS[location.classification] || '#007AFF' },
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
        onPress={() => setShowPhotos(true)}
      >
        <Text style={styles.loadPhotosButtonText}>
          {isLoading && showPhotos ? '⏳ Loading...' : '📷 View Photos & Reviews'}
        </Text>
      </TouchableOpacity>
      
      {showPhotos && data && (
        <>
          {data.photos.length > 0 && (
            <ScrollView horizontal style={styles.photoGallery} showsHorizontalScrollIndicator={false}>
              {data.photos.map((photoUrl, photoIdx) => (
                <RNImage 
                  key={photoIdx} 
                  source={{ uri: photoUrl }} 
                  style={styles.galleryPhoto}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}
          
          {data.reviews.length > 0 && (
            <View style={styles.reviewsSection}>
              <Text style={styles.reviewsSectionTitle}>📝 Reviews</Text>
              {data.reviews.map((review, reviewIdx) => (
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
  );
};

const styles = StyleSheet.create({
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
  loadPhotosButton: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  loadPhotosButtonText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
  },
  photoGallery: {
    marginTop: 12,
    height: 120,
  },
  galleryPhoto: {
    width: 160,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
  reviewsSection: {
    marginTop: 16,
  },
  reviewsSectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  reviewCard: {
    backgroundColor: '#f8f8f8',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  reviewAuthor: {
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 4,
  },
  reviewText: {
    fontSize: 13,
    color: '#555',
  },
});
