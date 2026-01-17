import React from 'react';
import {
  Image as RNImage,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { CLASSIFICATION_COLORS } from '../../constants/theme';
import { Location } from '../../types/api';

interface LocationItemProps {
  location: Location;
  index: number;
}

export const LocationItem: React.FC<LocationItemProps> = ({ location, index }) => {


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

      {/* Primary image - use imageUrl or first of imageUrls */}
      {(location.imageUrl || (location.imageUrls && location.imageUrls.length > 0)) && (
        <RNImage
          source={{ uri: location.imageUrl || location.imageUrls![0] }}
          className="w-full h-48 rounded-lg mb-3"
          resizeMode="cover"
        />
      )}

      <Text className="text-sm text-gray-500 mb-1.5">{location.category}</Text>


      <View className="gap-1">
        {(location.costMinUSD || location.costMaxUSD) && (
          <View className="flex-row">
            <Text className="text-sm w-28 font-medium text-gray-700">💰 Cost:</Text>
            <Text className="text-sm text-gray-600 flex-1">{formatCost(location)}</Text>
          </View>
        )}
        
        {location.bestTimeToVisit && (
          <View className="flex-row">
            <Text className="text-sm w-28 font-medium text-gray-700">⏰ Best time:</Text>
            <Text className="text-sm text-gray-600 flex-1">
              {location.bestTimeToVisit}
            </Text>
          </View>
        )}
        
        {location.crowdLevel && (
          <View className="flex-row">
            <Text className="text-sm w-28 font-medium text-gray-700">👥 Crowd:</Text>
            <Text className="text-sm text-gray-600 flex-1">{location.crowdLevel.toLowerCase().replace('_', ' ')}</Text>
          </View>
        )}
        
        {location.rating && (
          <View className="flex-row">
            <Text className="text-sm w-28 font-medium text-gray-700">⭐ Rating:</Text>
            <Text className="text-sm text-gray-600 flex-1">
              {location.rating} ({location.totalRatings || 0} reviews)
            </Text>
          </View>
        )}
        
        {location.travelTimeFromPrevious && (
          <View className="flex-row">
            <Text className="text-sm w-28 font-medium text-gray-700">🚗 Travel:</Text>
            <Text className="text-sm text-gray-600 flex-1">{location.travelTimeFromPrevious}</Text>
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
      

    </View>
  );
};
