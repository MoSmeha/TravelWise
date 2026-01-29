import React from 'react';
import { View, Text, TouchableOpacity, ImageBackground, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, Wallet } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface ItineraryHeaderProps {
  countryName: string;
  days: number;
  budget: number;
  airport: string;
  totalCost?: number;
}

export const ItineraryHeader: React.FC<ItineraryHeaderProps> = ({
  countryName,
  days,
  budget,
  airport,
  totalCost,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // A gradient-like background using a darker blue container
  return (

    <View className="pb-4 rounded-b-[24px] overflow-hidden shadow-md z-10" style={{ backgroundColor: '#004e89' }}>
      <View 
        style={{ paddingTop: insets.top + 10 }} 
        className="px-4 pb-2"
      >
        {/* Compact Top Bar */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 mr-2">
            <TouchableOpacity 
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-white/10 items-center justify-center backdrop-blur-md mr-3"
            >
              <ArrowLeft size={20} color="white" />
            </TouchableOpacity>
            
            <Text className="text-white font-bold text-xl flex-1" numberOfLines={1}>
              {countryName}
            </Text>
          </View>
          
          <View className="flex-row gap-2">
            <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
              <Calendar size={14} color="#e0f2fe" />
              <Text className="text-white text-xs font-semibold ml-2">
                {days}d
              </Text>
            </View>

            <View className="flex-row items-center bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
              <Wallet size={14} color="#e0f2fe" />
              <Text className="text-white text-xs font-semibold ml-2">
                ${budget}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};
