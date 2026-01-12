import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
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

// Available travel styles (6 new categories, max 3 selections)
const TRAVEL_STYLES: { key: TravelStyle; label: string; emoji: string }[] = [
  { key: 'ADVENTURE', label: 'Adventure Travel', emoji: '🏔️' },
  { key: 'CULTURAL', label: 'Cultural & Historical', emoji: '🏛️' },
  { key: 'NATURE_ECO', label: 'Nature & Eco', emoji: '🌿' },
  { key: 'BEACH_RELAXATION', label: 'Beach & Relaxation', emoji: '🏖️' },
  { key: 'URBAN_CITY', label: 'Urban Exploration', emoji: '🌃' },
  { key: 'FAMILY_GROUP', label: 'Family & Group', emoji: '👨‍👩‍👧‍👦' },
];

export default function NewTripScreen() {
  const router = useRouter();
  
  // React Query Hooks
  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const generateItineraryMutation = useGenerateItinerary();
  
  // Itinerary store for persisting active itinerary
  const setActiveItinerary = useItineraryStore((state) => state.setActiveItinerary);
  
  // Form state
  const [selectedCountryKey, setSelectedCountryKey] = useState<string>('');
  const [selectedAirportCode, setSelectedAirportCode] = useState<string>('');
  const [numberOfDays, setNumberOfDays] = useState('5');
  const [budgetUSD, setBudgetUSD] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>(['CULTURAL', 'ADVENTURE']);
  const [travelDate, setTravelDate] = useState(''); // Format: YYYY-MM-DD
  // const [loading, setLoading] = useState(false); // Handled by mutation status

  // Set defaults when countries load
  useEffect(() => {
    if (countries.length > 0 && !selectedCountryKey) {
      const firstCountry = countries[0];
      setSelectedCountryKey(firstCountry.key);
      if (firstCountry.airports.length > 0) {
        setSelectedAirportCode(firstCountry.airports[0].code);
      }
      // Set default budget to minimum * days
      const defaultDays = 5;
      setBudgetUSD(String(firstCountry.minBudgetPerDay * defaultDays));
    }
  }, [countries, selectedCountryKey]);

  // Get currently selected country
  const selectedCountry = countries.find(c => c.key === selectedCountryKey);
  
  // Get airports for selected country
  const availableAirports: Airport[] = selectedCountry?.airports || [];
  
  // Calculate minimum budget
  const days = parseInt(numberOfDays) || 1;
  const minBudget = (selectedCountry?.minBudgetPerDay || 50) * days;

  // Toggle travel style (max 3 selections)
  const toggleStyle = (style: TravelStyle) => {
    setSelectedStyles(prev => {
      if (prev.includes(style)) {
        // Don't remove if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== style);
      } else {
        // Don't add if already at max 3
        if (prev.length >= 3) {
          Alert.alert('Maximum 3 Styles', 'You can select up to 3 travel styles. Deselect one to add another.');
          return prev;
        }
        return [...prev, style];
      }
    });
  };

  // Handle country change
  const handleCountryChange = (countryKey: string) => {
    setSelectedCountryKey(countryKey);
    const country = countries.find(c => c.key === countryKey);
    if (country && country.airports.length > 0) {
      setSelectedAirportCode(country.airports[0].code);
      // Update budget to meet minimum
      const currentBudget = parseInt(budgetUSD) || 0;
      const newMin = country.minBudgetPerDay * days;
      if (currentBudget < newMin) {
        setBudgetUSD(String(newMin));
      }
    }
  };

  // Handle days change
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

    // Derive budget level
    const dailyBudget = budgetNum / daysNum;
    let budgetLevel = 'LOW';
    if (dailyBudget >= 150) budgetLevel = 'HIGH';
    else if (dailyBudget >= 80) budgetLevel = 'MEDIUM';

    // setLoading(true);
    try {
      // Backend expects: cityId, budgetLevel, travelStyles (array)
      // We map country -> cityId (MVP behavior)
      const payload: any = {
        cityId: selectedCountryKey, // e.g., 'lebanon'
        airportCode: selectedAirportCode,
        numberOfDays: daysNum,
        budgetUSD: budgetNum,
        budgetLevel: budgetLevel,
        travelStyles: selectedStyles, // Send all selected styles as array
        startDate: travelDate || undefined,
      };

      const response = await generateItineraryMutation.mutateAsync(payload);
      
      // Set active itinerary in store for checklist tab access
      if (response.itinerary?.id) {
        setActiveItinerary(response.itinerary.id);
      }

      // Navigate to map screen with data
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
      <View className="flex-1 justify-center items-center bg-gray-100">
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-3 text-lg text-gray-600">Loading destinations...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-100 p-5">
      <Text className="text-4xl font-bold mt-12 mb-1 text-gray-900">TravelWise</Text>
      <Text className="text-lg text-gray-600 mb-8">AI-Powered Travel Planning</Text>

      <View className="gap-4 pb-10">
        {/* Country Selector */}
        <Text className="text-base font-semibold mb-1 text-gray-800">Select Country</Text>
        <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Picker
            selectedValue={selectedCountryKey}
            onValueChange={handleCountryChange}
            style={{ height: 50 }}
          >
            {countries.map((country) => (
              <Picker.Item
                key={country.code}
                label={`${country.name} (min $${country.minBudgetPerDay}/day)`}
                value={country.key}
              />
            ))}
          </Picker>
        </View>

        {/* Airport Selector */}
        <Text className="text-base font-semibold mb-1 text-gray-800">Landing Airport</Text>
        <View className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <Picker
            selectedValue={selectedAirportCode}
            onValueChange={setSelectedAirportCode}
            style={{ height: 50 }}
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

        {/* Number of Days */}
        <Text className="text-base font-semibold mb-1 text-gray-800">Number of Days</Text>
        <TextInput
          className="bg-white border border-gray-200 rounded-xl p-3.5 text-base"
          value={numberOfDays}
          onChangeText={handleDaysChange}
          keyboardType="numeric"
          placeholder="1-30"
        />

        {/* Budget */}
        <Text className="text-base font-semibold mb-1 text-gray-800">Total Budget (USD)</Text>
        <TextInput
          className="bg-white border border-gray-200 rounded-xl p-3.5 text-base"
          value={budgetUSD}
          onChangeText={setBudgetUSD}
          keyboardType="numeric"
          placeholder={`Minimum: $${minBudget}`}
        />
        <Text className="text-xs text-gray-500 -mt-2">
          Minimum for {selectedCountry?.name}: ${selectedCountry?.minBudgetPerDay}/day × {days} days = ${minBudget}
        </Text>

        {/* Travel Styles */}
        <Text className="text-base font-semibold mb-1 text-gray-800">Travel Style</Text>
        <Text className="text-xs text-gray-500 -mt-2">Select what you want to experience (tap to toggle)</Text>
        <View className="flex-row flex-wrap gap-2 mt-2">
          {TRAVEL_STYLES.map((style) => (
            <TouchableOpacity
              key={style.key}
              className={`px-3.5 py-2.5 rounded-full border ${selectedStyles.includes(style.key) ? 'bg-blue-500 border-blue-500' : 'bg-gray-100 border-gray-200'}`}
              onPress={() => toggleStyle(style.key)}
            >
              <Text className={`text-sm ${selectedStyles.includes(style.key) ? 'text-white font-semibold' : 'text-gray-800'}`}>
                {style.emoji} {style.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Travel Date */}
        <Text className="text-base font-semibold mb-1 text-gray-800">Travel Date (Optional)</Text>
        <TextInput
          className="bg-white border border-gray-200 rounded-xl p-3.5 text-base"
          value={travelDate}
          onChangeText={setTravelDate}
          placeholder="YYYY-MM-DD (e.g. 2026-02-15)"
          keyboardType="default"
        />
        <Text className="text-xs text-gray-500 -mt-2">
          Set your flight date for weather-based checklist and notifications
        </Text>

        <TouchableOpacity
          className={`bg-blue-500 p-4.5 rounded-xl items-center mt-3 shadow-lg shadow-blue-500/30 ${generateItineraryMutation.isPending ? 'opacity-70' : ''}`}
          onPress={handleGenerate}
          disabled={generateItineraryMutation.isPending}
        >
          {generateItineraryMutation.isPending ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#fff" />
              <Text className="text-white text-lg font-semibold ml-2"> Generating with AI...</Text>
            </View>
          ) : (
            <Text className="text-white text-lg font-semibold">🤖 Generate Itinerary</Text>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View className="bg-blue-50 p-4 rounded-xl mt-2">
          <Text className="text-sm font-semibold mb-2 text-blue-700">What you&apos;ll get:</Text>
          <Text className="text-sm text-gray-800 mb-1">✨ Hidden gems locals love</Text>
          <Text className="text-sm text-gray-800 mb-1">🏨 Hotel recommendations with booking links</Text>
          <Text className="text-sm text-gray-800 mb-1">⚠️ Tourist traps to avoid</Text>
          <Text className="text-sm text-gray-800 mb-1">🗺️ Optimized route from your airport</Text>
          <Text className="text-sm text-gray-800 mb-1">🚨 Scam & safety warnings</Text>
        </View>

        {/* Explore Places Button */}
        <TouchableOpacity
          className="bg-green-500 p-4 rounded-xl items-center mt-4"
          onPress={() => router.push('/places')}
        >
          <Text className="text-white text-base font-semibold">📍 Explore Places from Database</Text>
        </TouchableOpacity>
        <Text className="text-xs text-gray-500 -mt-2 text-center">
          View pre-loaded places, checklist, and ask questions about your trip
        </Text>
      </View>
    </ScrollView>
  );
}
