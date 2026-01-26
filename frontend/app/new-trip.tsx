import { Picker } from '@react-native-picker/picker';
import { useRouter, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useCountries } from '../hooks/queries/useCountries';
import { useGenerateItinerary } from '../hooks/mutations/useItinerary';
import { useItineraryStore } from '../store/itineraryStore';
import type { Airport, TravelStyle } from '../types/api';
import { 
  ArrowLeft, 
  Database, 
  Calendar, 
  DollarSign, 
  Compass, 
  Landmark, 
  Leaf, 
  Sun, 
  Building2, 
  Users 
} from 'lucide-react-native';


const TRAVEL_STYLES: { key: TravelStyle; label: string; icon: any }[] = [
  { key: 'ADVENTURE', label: 'Adventure', icon: Compass },
  { key: 'CULTURAL', label: 'Culture & History', icon: Landmark },
  { key: 'NATURE_ECO', label: 'Nature & Included', icon: Leaf },
  { key: 'BEACH_RELAXATION', label: 'Relaxation', icon: Sun },
  { key: 'URBAN_CITY', label: 'Urban', icon: Building2 },
  { key: 'FAMILY_GROUP', label: 'Family', icon: Users },
];

export default function NewTripScreen() {
  const router = useRouter();
  

  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const generateItineraryMutation = useGenerateItinerary();
  

  const setActiveItinerary = useItineraryStore((state) => state.setActiveItinerary);
  

  const [selectedCountryKey, setSelectedCountryKey] = useState<string>('');
  const [selectedAirportCode, setSelectedAirportCode] = useState<string>('');
  const [numberOfDays, setNumberOfDays] = useState('5');
  const [budgetUSD, setBudgetUSD] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>(['CULTURAL', 'ADVENTURE']);
  const [travelDate, setTravelDate] = useState('');


  useEffect(() => {
    if (countries.length > 0 && !selectedCountryKey) {
      const firstCountry = countries[0];
      setSelectedCountryKey(firstCountry.key);
      if (firstCountry.airports.length > 0) {
        setSelectedAirportCode(firstCountry.airports[0].code);
      }

      const defaultDays = 5;
      setBudgetUSD(String(firstCountry.minBudgetPerDay * defaultDays));
    }
  }, [countries, selectedCountryKey]);


  const selectedCountry = countries.find(c => c.key === selectedCountryKey);
  

  const availableAirports: Airport[] = selectedCountry?.airports || [];
  

  const days = parseInt(numberOfDays) || 1;
  const minBudget = (selectedCountry?.minBudgetPerDay || 50) * days;


  const toggleStyle = (style: TravelStyle) => {
    setSelectedStyles(prev => {
      if (prev.includes(style)) {

        if (prev.length === 1) return prev;
        return prev.filter(s => s !== style);
      } else {

        if (prev.length >= 3) {
          Alert.alert('Maximum 3 Styles', 'You can select up to 3 travel styles. Deselect one to add another.');
          return prev;
        }
        return [...prev, style];
      }
    });
  };


  const handleCountryChange = (countryKey: string) => {
    setSelectedCountryKey(countryKey);
    const country = countries.find(c => c.key === countryKey);
    if (country && country.airports.length > 0) {
      setSelectedAirportCode(country.airports[0].code);

      const currentBudget = parseInt(budgetUSD) || 0;
      const newMin = country.minBudgetPerDay * days;
      if (currentBudget < newMin) {
        setBudgetUSD(String(newMin));
      }
    }
  };


  const handleDaysChange = (value: string) => {
    setNumberOfDays(value);
    const newDays = parseInt(value) || 1;
    if (selectedCountry) {
      const newMin = selectedCountry.minBudgetPerDay * newDays;
      const currentBudget = parseInt(budgetUSD) || 0;
      if (currentBudget < newMin) {
        setBudgetUSD(String(newMin));
      }
    }
  };

  const handleGenerate = async () => {
    const daysNum = parseInt(numberOfDays);
    if (isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      Alert.alert('Error', 'Please enter a valid number of days (1-30)');
      return;
    }

    const budgetNum = parseInt(budgetUSD);
    if (isNaN(budgetNum) || budgetNum < minBudget) {
      Alert.alert('Error', `Minimum budget for ${selectedCountry?.name || 'this country'} is $${minBudget} USD for ${daysNum} days`);
      return;
    }

    if (!selectedCountryKey || !selectedAirportCode) {
      Alert.alert('Error', 'Please select a country and airport');
      return;
    }


    const dailyBudget = budgetNum / daysNum;
    let budgetLevel = 'LOW';
    if (dailyBudget >= 150) budgetLevel = 'HIGH';
    else if (dailyBudget >= 80) budgetLevel = 'MEDIUM';

    try {

      const payload: any = {
        cityId: selectedCountryKey,
        airportCode: selectedAirportCode,
        numberOfDays: daysNum,
        budgetUSD: budgetNum,
        budgetLevel: budgetLevel,
        travelStyles: selectedStyles,
        startDate: travelDate || undefined,
      };

      const response = await generateItineraryMutation.mutateAsync(payload);
      
      if (response.itinerary?.id) {
        setActiveItinerary(response.itinerary.id);
      }

      router.push({
        pathname: '/map',
        params: { data: JSON.stringify(response) },
      });
    } catch (error: any) {
      console.error('Error generating itinerary:', error);
      let title = 'Generation Failed';
      let message = error.response?.data?.message || error.response?.data?.error || error.message || 'Unknown error';

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        title = 'Request Timeout';
        message = 'The AI is taking a bit longer to generate your nationwide itinerary. We\'ve increased the limit, but complex routes can take 1-2 minutes. Please check your backend terminal for progress and try again.';
      } else if (error.message?.includes('Network Error')) {
        title = 'Network Error';
        message = 'Could not reach the backend. Ensure it is running and your device is on the same network. Check the IP in config/api.ts.';
      }

      Alert.alert(title, message);
    }
  };

  if (loadingCountries) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#0A4974" />
        <Text className="mt-3 text-lg text-gray-600">Loading destinations...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ headerShown: false }} />

      <View className="pt-14 px-5 pb-4 bg-white border-b border-gray-100">
        <View className="flex-row justify-between items-start">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 mt-1">
             <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 leading-tight">Plan Your Trip</Text>
            <Text className="text-sm text-gray-500 mt-0.5">Tell us about your dream destination</Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push('/places')}
            className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full"
          >
            <Database size={14} color="#0A4974" />
            <Text className="text-xs font-semibold ml-1.5 text-[#0A4974]">Check DB</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="p-5 gap-6 pb-12">

        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">Where do you want to go?</Text>
          <View className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <Picker
              selectedValue={selectedCountryKey}
              onValueChange={handleCountryChange}
              style={{ height: 50, color: '#333' }}
            >
              {countries.map((country) => (
                <Picker.Item
                  key={country.code}
                  label={`${country.name}`}
                  value={country.key}
                />
              ))}
            </Picker>
          </View>
        </View>


        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">Landing airport</Text>
          <View className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
             <Picker
               selectedValue={selectedAirportCode}
               onValueChange={setSelectedAirportCode}
               style={{ height: 50, color: '#333' }}
             >
               {availableAirports.map((airport) => (
                 <Picker.Item
                   key={airport.code}
                   label={`${airport.name} (${airport.code})`}
                   value={airport.code}
                 />
               ))}
             </Picker>
          </View>
        </View>


        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">Trip duration</Text>
          <View className="flex-row items-center bg-gray-50 rounded-xl p-1 border border-gray-200">
            <TouchableOpacity 
              onPress={() => {
                const current = parseInt(numberOfDays) || 1;
                if (current > 1) handleDaysChange(String(current - 1));
              }}
              className="w-12 h-12 bg-gray-200 rounded-lg justify-center items-center"
            >
              <Text className="text-2xl text-gray-600 font-medium">-</Text>
            </TouchableOpacity>
            
            <View className="flex-1 items-center">
              <TextInput
                value={numberOfDays}
                onChangeText={handleDaysChange}
                keyboardType="numeric"
                className="text-lg font-bold text-center w-full"
              />
              <Text className="text-xs text-gray-500">days</Text>
            </View>

            <TouchableOpacity 
              onPress={() => {
                const current = parseInt(numberOfDays) || 1;
                if (current < 30) handleDaysChange(String(current + 1));
              }}
              className="w-12 h-12 bg-gray-200 rounded-lg justify-center items-center"
            >
              <Text className="text-2xl text-gray-600 font-medium">+</Text>
            </TouchableOpacity>
          </View>
        </View>


        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">Budget level</Text>
          <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center shadow-sm">
            <DollarSign size={20} color="#666" className="mr-2" />
            <TextInput
              className="flex-1 text-base ml-2 text-gray-900"
              value={budgetUSD}
              onChangeText={setBudgetUSD}
              keyboardType="numeric"
              placeholder={`Min: $${minBudget}`}
            />
          </View>
          <Text className="text-xs text-gray-500 mt-1 ml-1">
             Minimum for {days} days: ${minBudget}
          </Text>
        </View>


        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">What interests you? (select at least one)</Text>
          <View className="flex-row flex-wrap gap-2">
            {TRAVEL_STYLES.map((style) => {
              const isActive = selectedStyles.includes(style.key);
              const Icon = style.icon;
              return (
                <TouchableOpacity
                  key={style.key}
                  className={`flex-row items-center w-[48%] p-3 rounded-xl border ${isActive ? 'bg-[#0A4974]/10 border-[#0A4974]' : 'bg-white border-gray-200'}`}
                  onPress={() => toggleStyle(style.key)}
                >
                  <Icon size={18} color={isActive ? '#0A4974' : '#666'} />
                  <Text className={`text-sm ml-2 ${isActive ? 'text-[#0A4974] font-semibold' : 'text-gray-700'}`}>
                    {style.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        

        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">Travel Date (Optional)</Text>
          <View className="bg-white border border-gray-200 rounded-xl p-4 flex-row items-center shadow-sm">
            <Calendar size={20} color="#666" className="mr-2" />
            <TextInput
              className="flex-1 text-base ml-2 text-gray-900"
              value={travelDate}
              onChangeText={setTravelDate}
              placeholder="YYYY-MM-DD"
            />
          </View>
        </View>

        <TouchableOpacity
          className={`bg-[#0A4974] p-4 rounded-xl items-center mt-2 shadow-md ${generateItineraryMutation.isPending ? 'opacity-80' : ''}`}
          onPress={handleGenerate}
          disabled={generateItineraryMutation.isPending}
        >
          {generateItineraryMutation.isPending ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#fff" />
              <Text className="text-white text-lg font-semibold ml-2"> Planning Trip...</Text>
            </View>
          ) : (
            <Text className="text-white text-lg font-semibold">Generate Itinerary</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
