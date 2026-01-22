import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Calendar, Wallet } from 'lucide-react-native';
import { TripTag } from './TripTag';

const COUNTRY_IMAGES: Record<string, string> = {
  'Lebanon': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=1000&auto=format&fit=crop',
  'France': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1000&auto=format&fit=crop',
  'Italy': 'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?q=80&w=1000&auto=format&fit=crop',
  'Japan': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=1000&auto=format&fit=crop',
  'default': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=1000&auto=format&fit=crop',
};

const COUNTRY_CODES: Record<string, string> = {
  'Lebanon': 'lb',
  'France': 'fr',
  'Italy': 'it',
  'Japan': 'jp',
  'United States': 'us',
  'United Kingdom': 'gb',
  'Spain': 'es',
};

interface Trip {
  id: string;
  country: string;
  numberOfDays: number;
  budgetUSD: number;
  travelStyles?: string[];
  createdAt: string;
}

interface User {
  avatarUrl?: string;
  email?: string;
}

interface TripCardProps {
  trip: Trip;
  user?: User;
  onPress: (id: string, data: Trip) => void;
}

export function TripCard({ trip, user, onPress }: TripCardProps) {
  const countryName = trip.country || 'Unknown';
  const imageUri = COUNTRY_IMAGES[countryName] || COUNTRY_IMAGES['default'];
  const countryCode = COUNTRY_CODES[countryName] || 'un'; 
  const flagUrl = `https://flagcdn.com/w40/${countryCode}.png`;
  const dateString = new Date(trip.createdAt).toLocaleDateString();

  return (
    <View className="mb-5 mx-1 rounded-2xl bg-[#f5f5f5] overflow-hidden shadow-sm elevation-2"> 
      {/* Image Section */}
      <View className="h-[180px] w-full relative">
        <Image 
          source={{ uri: imageUri }} 
          className="w-full h-full"
          resizeMode="cover"
        />
        <View className="absolute inset-0 bg-black/20" />
        
        <View className="absolute bottom-4 left-4 z-10">
          <View className="flex-row items-center mb-2">
            {countryCode !== 'un' && (
              <Image source={{ uri: flagUrl }} className="w-6 h-4 rounded-sm mr-2" />
            )}
            <Text className="text-white text-2xl font-bold">{trip.country}</Text>
          </View>
          
          <View className="flex-row gap-2">
            <View className="flex-row items-center bg-white/20 px-2 py-1 rounded-lg">
              <Calendar size={12} color="white" />
              <Text className="text-white text-xs ml-1 font-semibold">{trip.numberOfDays} days</Text>
            </View>
            
            <View className="flex-row items-center bg-white/20 px-2 py-1 rounded-lg">
              <Wallet size={12} color="white" />
              <Text className="text-white text-xs ml-1 font-semibold">${trip.budgetUSD}</Text>
            </View>
          </View>
        </View>

        {/* User Profile Badge (Absolute positioned) */}
        <View className="absolute top-4 right-4 z-20">
          <View className="bg-white/90 p-0.5 rounded-full">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="w-8 h-8 rounded-full" />
            ) : (
              <View className="bg-purple-600 w-8 h-8 rounded-full items-center justify-center">
                <Text className="text-white text-sm font-bold">
                  {user?.email ? user.email[0].toUpperCase() : 'U'}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Content Section */}
      <View className="px-4 py-4">
        {/* Tags */}
        <View className="flex-row flex-wrap gap-2 mb-4">
          {trip.travelStyles?.map((style: string, index: number) => (
            <TripTag key={index} tag={style} />
          ))}
        </View>
        
        {/* Footer */}
        <View className="flex-row justify-between items-center">
          <Text className="text-gray-400 text-xs">Created {dateString}</Text>
          <TouchableOpacity 
            onPress={() => onPress(trip.id, trip)}
            className="bg-[#094772] px-4 py-2 rounded-xl"
          >
            <Text className="text-white font-bold text-xs">View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
