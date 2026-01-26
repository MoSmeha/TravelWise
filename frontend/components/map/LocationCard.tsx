import React from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, Clock, DollarSign, Star, X } from 'lucide-react-native';
import { CLASSIFICATION_COLORS } from '../../constants/theme';
import type { Location } from '../../types/api';

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

interface LocationCardProps {
  location: Location;
  locationPhotos: LocationPhotosData | undefined;
  onClose: () => void;
}

export const LocationCard: React.FC<LocationCardProps> = ({ location, locationPhotos, onClose }) => {
  const formatCost = (loc: Location) => {
    if (loc.costMinUSD && loc.costMaxUSD) {
      return `$${loc.costMinUSD}-$${loc.costMaxUSD}`;
    }
    return 'Cost varies';
  };

  const getPriceLevelDisplay = (priceLevel: string) => {
    switch (priceLevel) {
      case 'INEXPENSIVE': return '$';
      case 'MODERATE': return '$$';
      case 'EXPENSIVE': return '$$$';
      default: return '$';
    }
  };

  const getImageUrl = () => {
    return location.imageUrl || location.imageUrls?.[0] || locationPhotos?.photos?.[0];
  };

  const getAllPhotos = () => {
    const photos = location.imageUrls?.length 
      ? location.imageUrls 
      : (locationPhotos?.photos || [location.imageUrl]);
    return photos.filter(Boolean) as string[];
  };

  const getOpeningHours = () => {
    return location.openingHours?.weekdayText 
      || location.openingHours?.weekday_text 
      || location.openingHours?.weekdayDescriptions;
  };

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-2xl elevation-10 z-50 h-[70%]">

      <TouchableOpacity
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 items-center justify-center z-10"
        onPress={onClose}
      >
        <X size={20} color="#6b7280" />
      </TouchableOpacity>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>

        <View className="mb-4">

          <View className="mb-3">
            {getImageUrl() ? (
              <Image 
                source={{ uri: getImageUrl() }} 
                className="w-full rounded-2xl h-56"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full bg-gray-200 rounded-2xl items-center justify-center h-56">
                <Image source={require('../../assets/images/icon.png')} className="w-16 h-16 opacity-20" />
              </View>
            )}
          </View>

          <View className="flex-row justify-between items-start">
            <View className="flex-1 pr-2">

              <View
                className="self-start px-3 py-1 rounded-full mb-2"
                style={{ backgroundColor: CLASSIFICATION_COLORS[location.classification as keyof typeof CLASSIFICATION_COLORS] || '#007AFF' }}
              >
                <Text className="text-white text-[10px] font-bold uppercase tracking-wider">
                  {location.classification.replace('_', ' ')}
                </Text>
              </View>
              
              <Text className="text-2xl font-bold text-gray-900 leading-tight mb-0.5">{location.name}</Text>
              <Text className="text-sm text-gray-500 capitalize font-medium">
                {location.category.toString().toLowerCase().replace(/_/g, ' ')}
              </Text>
            </View>
            

            {location.rating && (
              <View className="bg-amber-50 px-3 py-2 rounded-xl items-center border border-amber-100">
                <View className="flex-row items-center gap-1">
                  <Star size={14} color="#f59e0b" fill="#f59e0b" />
                  <Text className="text-amber-700 text-sm font-bold">{location.rating}</Text>
                </View>
                {location.totalRatings && (
                  <Text className="text-amber-600/70 text-[10px]">{location.totalRatings} reviews</Text>
                )}
              </View>
            )}
          </View>
        </View>


        <View>

          <View className="flex-row flex-wrap gap-2 mb-4">

            {location.priceLevel && (
              <View className="bg-green-50 px-3 py-2 rounded-xl flex-row items-center gap-1.5 border border-green-100">
                <DollarSign size={14} color="#15803d" />
                <Text className="text-green-700 text-xs font-semibold">
                  {getPriceLevelDisplay(location.priceLevel)}
                </Text>
              </View>
            )}

            {(location.costMinUSD || location.costMaxUSD) && (
              <View className="bg-emerald-50 px-3 py-2 rounded-xl flex-row items-center gap-1.5 border border-emerald-100">
                <Text className="text-emerald-700 text-xs font-semibold">{formatCost(location)}</Text>
              </View>
            )}
            
            {location.bestTimeToVisit && (
              <View className="bg-blue-50 px-3 py-2 rounded-xl flex-row items-center gap-1.5 border border-blue-100">
                <Clock size={14} color="#1d4ed8" />
                <Text className="text-blue-700 text-xs font-semibold">{location.bestTimeToVisit}</Text>
              </View>
            )}
          </View>

          {location.description && (
            <Text className="text-base text-gray-600 mb-6 leading-6">
              {location.description}
            </Text>
          )}


          <View className="mb-6 bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
            <View className="p-4 bg-gray-50 border-b border-gray-100 flex-row items-center gap-2">
              <Clock size={16} color="#374151" />
              <Text className="text-sm font-bold text-gray-900">Opening Hours</Text>
            </View>
            
            <View className="p-4 pt-3">
              {getOpeningHours() ? (
                (getOpeningHours() as string[]).map((day, idx) => (
                  <View key={idx} className="flex-row justify-between py-1 border-b border-gray-100 last:border-0">
                    <Text className="text-xs text-gray-600 font-medium">{day.split(': ')[0]}</Text>
                    <Text className="text-xs text-gray-800">{day.split(': ')[1] || 'Closed'}</Text>
                  </View>
                ))
              ) : (
                <Text className="text-xs text-gray-500 italic">Not provided</Text>
              )}
            </View>
          </View>


          <Text className="text-lg font-bold text-gray-900 mb-3">Photos</Text>
          <ScrollView horizontal className="mb-6 -mx-1" showsHorizontalScrollIndicator={false}>
            {getAllPhotos().map((url, i) => (
              <TouchableOpacity key={i} activeOpacity={0.8}>
                <Image source={{ uri: url }} className="w-40 h-28 rounded-xl mx-1 bg-gray-100" resizeMode="cover" />
              </TouchableOpacity>
            ))}
            {locationPhotos?.loading && (
              <View className="w-40 h-28 rounded-xl mx-1 bg-gray-50 items-center justify-center">
                <ActivityIndicator color="#007AFF" />
              </View>
            )}
          </ScrollView>


          <Text className="text-lg font-bold text-gray-900 mb-3">Reviews & Tips</Text>
          

          {location.aiReasoning && (
            <View className="mb-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <Text className="text-indigo-800 text-sm font-medium mb-1">💡 TravelWise Tip</Text>
              <Text className="text-indigo-700 text-sm leading-5">{location.aiReasoning}</Text>
            </View>
          )}


          {location.scamWarning && (
            <View className="mb-4 bg-red-50 p-4 rounded-xl border border-red-100 flex-row gap-3">
              <AlertTriangle size={20} color="#b91c1c" />
              <Text className="text-red-700 text-sm flex-1 leading-5">
                <Text className="font-bold">Caution: </Text>
                {location.scamWarning}
              </Text>
            </View>
          )}


          {locationPhotos?.loading ? (
            <ActivityIndicator className="my-4" color="#007AFF" />
          ) : (locationPhotos?.reviews?.length ?? 0) > 0 ? (
            locationPhotos?.reviews.map((review, idx) => (
              <View key={idx} className="mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="font-bold text-gray-900">{review.author || review.author_name}</Text>
                  <View className="flex-row gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={12} 
                        color={i < Math.round(review.rating) ? "#f59e0b" : "#d1d5db"} 
                        fill={i < Math.round(review.rating) ? "#f59e0b" : "transparent"}
                      />
                    ))}
                  </View>
                </View>
                <Text className="text-gray-600 text-sm leading-5">{review.text}</Text>
              </View>
            ))
          ) : (
            <Text className="text-gray-400 italic mb-8">No community reviews available yet.</Text>
          )}
          
          <View className="h-20" />
        </View>
      </ScrollView>
    </View>
  );
};
