import React, { useState } from 'react';
import {
  Image as RNImage,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { CLASSIFICATION_COLORS } from '../../constants/theme';
import { usePlacePhotos } from '../../hooks/queries/usePlaces';
import { Location } from '../../types/api';

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
    <View className="bg-white mx-4 mb-2.5 p-4 rounded-xl border-l-4 border-l-blue-500">
      <View className="flex-row items-center mb-2">
        <View
          className="w-3 h-3 rounded-full mr-2"
          style={{ backgroundColor: CLASSIFICATION_COLORS[location.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF' }}
        />
        <Text className="text-base font-bold text-blue-500 mr-2">{index + 1}</Text>
        <Text className="text-lg font-bold flex-1 text-gray-900">{location.name}</Text>
      </View>

      {location.imageUrl && (
        <RNImage
          source={{ uri: location.imageUrl }}
          className="w-full h-48 rounded-lg mb-3"
          resizeMode="cover"
        />
      )}

      <Text className="text-sm text-gray-500 mb-1.5">{location.category}</Text>
      <Text className="text-sm text-gray-800 mb-3 leading-5">
        {location.description}
      </Text>

      <View className="gap-1">
        <View className="flex-row">
          <Text className="text-sm w-28">💰 Cost:</Text>
          <Text className="text-sm text-gray-500 flex-1">{formatCost(location)}</Text>
        </View>
        <View className="flex-row">
          <Text className="text-sm w-28">⏰ Best time:</Text>
          <Text className="text-sm text-gray-500 flex-1">
            {location.bestTimeToVisit}
          </Text>
        </View>
        <View className="flex-row">
          <Text className="text-sm w-28">👥 Crowd:</Text>
          <Text className="text-sm text-gray-500 flex-1">{location.crowdLevel}</Text>
        </View>
        {location.rating && (
          <View className="flex-row">
            <Text className="text-sm w-28">⭐ Rating:</Text>
            <Text className="text-sm text-gray-500 flex-1">
              {location.rating} ({location.totalRatings || 0} reviews)
            </Text>
          </View>
        )}
        {location.travelTimeFromPrevious && (
          <View className="flex-row">
            <Text className="text-sm w-28">🚗 Travel:</Text>
            <Text className="text-sm text-gray-500 flex-1">{location.travelTimeFromPrevious}</Text>
          </View>
        )}
      </View>

      {location.aiReasoning && (
        <View className="mt-3 p-3 bg-purple-50 rounded-lg">
          <Text className="text-sm text-purple-800">
            🤖 {location.aiReasoning}
          </Text>
        </View>
      )}

      {location.scamWarning && (
        <View className="mt-2 p-3 bg-red-100 rounded-lg">
          <Text className="text-sm text-red-800">
            🚨 {location.scamWarning}
          </Text>
        </View>
      )}
      
      {/* Photos and Reviews Section */}
      <TouchableOpacity 
        className="mt-3 p-2.5 bg-gray-100 rounded-lg items-center"
        onPress={() => setShowPhotos(true)}
      >
        <Text className="text-sm text-gray-800 font-semibold">
          {isLoading && showPhotos ? '⏳ Loading...' : '📷 View Photos & Reviews'}
        </Text>
      </TouchableOpacity>
      
      {showPhotos && data && (
        <>
          {data.photos.length > 0 && (
            <ScrollView horizontal className="mt-3 h-32" showsHorizontalScrollIndicator={false}>
              {data.photos.map((photoUrl, photoIdx) => (
                <RNImage 
                  key={photoIdx} 
                  source={{ uri: photoUrl }} 
                  className="w-40 h-32 rounded-lg mr-2"
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          )}
          
          {/* Display Top Reviews if available immediately (from validation) or fetched */}
          {((location.topReviews && location.topReviews.length > 0) || data.reviews.length > 0) && (
            <View className="mt-4">
              <Text className="text-sm font-bold mb-2">📝 Reviews</Text>
              {(location.topReviews || data.reviews).slice(0, 3).map((review: any, reviewIdx: number) => (
                <View key={reviewIdx} className="bg-gray-50 p-2.5 rounded-lg mb-2">
                  <Text className="font-semibold text-xs mb-1">
                    {review.author_name || review.author} ⭐{review.rating}
                  </Text>
                  <Text className="text-xs text-gray-600" numberOfLines={3}>
                    {review.text}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
};
