import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Modal } from 'react-native';
import { Calendar, Wallet, MoreVertical, Eye, Trash2, UserPlus, Users } from 'lucide-react-native';
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
  onDelete?: (id: string) => void;
  onInvite?: (id: string) => void;
  onManageCollaborators?: (id: string) => void;
}

export function TripCard({ trip, user, onPress, onDelete, onInvite, onManageCollaborators }: TripCardProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  
  const countryName = trip.country || 'Unknown';
  const imageUri = COUNTRY_IMAGES[countryName] || COUNTRY_IMAGES['default'];
  const countryCode = COUNTRY_CODES[countryName] || 'un'; 
  const flagUrl = `https://flagcdn.com/w40/${countryCode}.png`;
  const dateString = new Date(trip.createdAt).toLocaleDateString();

  const handleViewDetails = () => {
    setMenuVisible(false);
    onPress(trip.id, trip);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    onDelete?.(trip.id);
  };

  const handleInvite = () => {
    setMenuVisible(false);
    onInvite?.(trip.id);
  };

  const handleManageCollaborators = () => {
    setMenuVisible(false);
    onManageCollaborators?.(trip.id);
  };

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
          
          {/* 3-dots menu button */}
          <TouchableOpacity 
            onPress={() => setMenuVisible(true)}
            className="bg-[#094772] p-2 rounded-xl"
          >
            <MoreVertical size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/50 justify-center items-center"
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View className="bg-white rounded-2xl w-64 overflow-hidden shadow-lg">
            {/* View Details Option */}
            <TouchableOpacity
              onPress={handleViewDetails}
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <Eye size={20} color="#094772" />
              <Text className="ml-3 text-gray-800 font-semibold">View Details</Text>
            </TouchableOpacity>

            {/* Invite Friends Option */}
            <TouchableOpacity
              onPress={handleInvite}
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <UserPlus size={20} color="#10b981" />
              <Text className="ml-3 text-gray-800 font-semibold">Invite Friends</Text>
            </TouchableOpacity>

            {/* Manage Collaborators Option */}
            <TouchableOpacity
              onPress={handleManageCollaborators}
              className="flex-row items-center px-5 py-4 border-b border-gray-100"
            >
              <Users size={20} color="#6366F1" />
              <Text className="ml-3 text-gray-800 font-semibold">Manage Collaborators</Text>
            </TouchableOpacity>

            {/* Delete Itinerary Option */}
            <TouchableOpacity
              onPress={handleDelete}
              className="flex-row items-center px-5 py-4"
            >
              <Trash2 size={20} color="#ef4444" />
              <Text className="ml-3 text-red-500 font-semibold">Delete Itinerary</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
