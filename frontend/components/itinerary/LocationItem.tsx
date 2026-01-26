import { Navigation, Star } from 'lucide-react-native';
import React from 'react';
import { Image as RNImage, Linking, Text, TouchableOpacity, View } from 'react-native';
import { CLASSIFICATION_COLORS } from '../../constants/theme';
import type { Location } from '../../types/api';

interface LocationItemProps {
  location: Location;
  index: number;
  showConnector?: boolean;
}

const CLASSIFICATION_LABELS: Record<string, { label: string; bgColor: string; textColor: string }> = {
  HIDDEN_GEM: { label: 'Hidden Gem', bgColor: 'bg-emerald-500', textColor: 'text-white' },
  MUST_SEE: { label: 'Must See', bgColor: 'bg-blue-500', textColor: 'text-white' },
  CONDITIONAL: { label: 'Conditional', bgColor: 'bg-amber-500', textColor: 'text-white' },
  TOURIST_TRAP: { label: 'Tourist Trap', bgColor: 'bg-red-500', textColor: 'text-white' },
};

export const LocationItem: React.FC<LocationItemProps> = ({ 
  location, 
  index, 
  showConnector = false 
}) => {
  const formatCost = (loc: Location) => {
    if (loc.costMinUSD && loc.costMaxUSD) {
      return `$${loc.costMinUSD}-$${loc.costMaxUSD}`;
    }
    if (loc.costMinUSD) return `$${loc.costMinUSD}+`;
    if (loc.costMaxUSD) return `$${loc.costMaxUSD}`;
    return null;
  };

  const classificationInfo = CLASSIFICATION_LABELS[location.classification] || null;
  
  const imageUrl = location.imageUrl || (location.imageUrls && location.imageUrls.length > 0 ? location.imageUrls[0] : null);

  const handleGetDirections = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`;
    Linking.openURL(url);
  };

  return (
    <View className="mx-4 mb-0">
      <View className="flex-row">

        <View className="items-center mr-3 w-8">

          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{
              backgroundColor: CLASSIFICATION_COLORS[location.classification as keyof typeof CLASSIFICATION_COLORS] || '#094772',
            }}
          >
            <Text className="text-white text-xs font-bold">{index + 1}</Text>
          </View>
          

          {showConnector && (
            <View className="flex-1 w-0.5 bg-gray-300 min-h-[60px]" />
          )}
        </View>


        <View className="flex-1 bg-white rounded-xl p-4 mb-3">

          <View className="flex-row items-start mb-2">
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900" numberOfLines={2}>
                {location.name}
              </Text>
              <Text className="text-sm text-gray-500 mt-0.5">
                {typeof location.category === 'string' 
                  ? location.category.replace(/_/g, ' ').split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')
                  : location.category}
              </Text>
            </View>
            {classificationInfo && (
              <View className={`${classificationInfo.bgColor} px-2 py-1 rounded ml-2`}>
                <Text className={`text-xs font-semibold ${classificationInfo.textColor}`}>
                  {classificationInfo.label}
                </Text>
              </View>
            )}
          </View>


          <View className="flex-row items-center gap-4 mb-3">
            {location.rating && (
              <View className="flex-row items-center">
                <Star size={14} color="#F59E0B" fill="#F59E0B" />
                <Text className="text-sm text-gray-700 ml-1 font-medium">{location.rating}</Text>
              </View>
            )}
            
            {formatCost(location) && (
              <Text className="text-sm text-gray-600">{formatCost(location)}</Text>
            )}
          </View>


          {imageUrl && (
            <RNImage
              source={{ uri: imageUrl }}
              className="w-full h-40 rounded-lg mb-3"
              resizeMode="cover"
            />
          )}


          {location.aiReasoning && (
            <View className="p-3 bg-purple-50 rounded-lg mb-3">
              <Text className="text-sm text-purple-800 leading-5">
                {location.aiReasoning}
              </Text>
            </View>
          )}


          {location.scamWarning && (
            <View className="p-3 bg-red-50 rounded-lg mb-3">
              <Text className="text-sm text-red-800 leading-5">
                {location.scamWarning}
              </Text>
            </View>
          )}


          <TouchableOpacity 
            className="flex-row items-center justify-center py-3 border border-gray-200 rounded-lg bg-gray-50"
            activeOpacity={0.7}
            onPress={handleGetDirections}
          >
            <Navigation size={16} color="#374151" />
            <Text className="text-sm font-medium text-gray-700 ml-2">Get Directions</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
