import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { countryService, itineraryService } from '../services/api';
import type { Airport, CountryConfig, TravelStyle } from '../types/api';

// Available travel styles
const TRAVEL_STYLES: { key: TravelStyle; label: string; emoji: string }[] = [
  { key: 'food', label: 'Food', emoji: '🍽️' },
  { key: 'culture', label: 'Culture', emoji: '🏛️' },
  { key: 'nature', label: 'Nature', emoji: '🌿' },
  { key: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { key: 'adventure', label: 'Adventure', emoji: '🏔️' },
];

export default function HomeScreen() {
  const router = useRouter();
  
  // Countries data from API
  const [countries, setCountries] = useState<CountryConfig[]>([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  
  // Form state
  const [selectedCountryKey, setSelectedCountryKey] = useState<string>('');
  const [selectedAirportCode, setSelectedAirportCode] = useState<string>('');
  const [numberOfDays, setNumberOfDays] = useState('5');
  const [budgetUSD, setBudgetUSD] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>(['food', 'culture']);
  const [travelDate, setTravelDate] = useState(''); // Format: YYYY-MM-DD
  const [loading, setLoading] = useState(false);

  // Load countries on mount
  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const data = await countryService.getCountries();
      setCountries(data);
      
      // Select first country by default
      if (data.length > 0) {
        const firstCountry = data[0];
        setSelectedCountryKey(firstCountry.key);
        if (firstCountry.airports.length > 0) {
          setSelectedAirportCode(firstCountry.airports[0].code);
        }
        // Set default budget to minimum * days
        const defaultDays = 5;
        setBudgetUSD(String(firstCountry.minBudgetPerDay * defaultDays));
      }
    } catch (error) {
      console.error('Failed to load countries:', error);
      Alert.alert('Error', 'Failed to load countries. Check your backend connection.');
    } finally {
      setLoadingCountries(false);
    }
  };

  // Get currently selected country
  const selectedCountry = countries.find(c => c.key === selectedCountryKey);
  
  // Get airports for selected country
  const availableAirports: Airport[] = selectedCountry?.airports || [];
  
  // Calculate minimum budget
  const days = parseInt(numberOfDays) || 1;
  const minBudget = (selectedCountry?.minBudgetPerDay || 50) * days;

  // Toggle travel style
  const toggleStyle = (style: TravelStyle) => {
    setSelectedStyles(prev => {
      if (prev.includes(style)) {
        // Don't remove if it's the last one
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== style);
      } else {
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

    setLoading(true);
    try {
      // Backend expects: cityId, budgetLevel, travelStyle (singular)
      // We map country -> cityId (MVP behavior)
      const payload: any = {
        cityId: selectedCountryKey, // e.g., 'lebanon'
        airportCode: selectedAirportCode, // passed but might be ignored by backend schema if not in z.object
        numberOfDays: daysNum,
        budgetUSD: budgetNum,
        budgetLevel: budgetLevel,
        travelStyle: selectedStyles[0] ? selectedStyles[0].toUpperCase() : 'MIXED',
        startDate: travelDate || undefined,
      };

      const response = await itineraryService.generateItinerary(payload);

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
    } finally {
      setLoading(false);
    }
  };

  if (loadingCountries) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading destinations...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>TravelWise</Text>
      <Text style={styles.subtitle}>AI-Powered Travel Planning</Text>

      <View style={styles.form}>
        {/* Country Selector */}
        <Text style={styles.label}>Select Country</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedCountryKey}
            onValueChange={handleCountryChange}
            style={styles.picker}
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
        <Text style={styles.label}>Landing Airport</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedAirportCode}
            onValueChange={setSelectedAirportCode}
            style={styles.picker}
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
        <Text style={styles.label}>Number of Days</Text>
        <TextInput
          style={styles.input}
          value={numberOfDays}
          onChangeText={handleDaysChange}
          keyboardType="numeric"
          placeholder="1-30"
        />

        {/* Budget */}
        <Text style={styles.label}>Total Budget (USD)</Text>
        <TextInput
          style={styles.input}
          value={budgetUSD}
          onChangeText={setBudgetUSD}
          keyboardType="numeric"
          placeholder={`Minimum: $${minBudget}`}
        />
        <Text style={styles.helperText}>
          Minimum for {selectedCountry?.name}: ${selectedCountry?.minBudgetPerDay}/day × {days} days = ${minBudget}
        </Text>

        {/* Travel Styles */}
        <Text style={styles.label}>Travel Style</Text>
        <Text style={styles.helperText}>Select what you want to experience (tap to toggle)</Text>
        <View style={styles.chipsContainer}>
          {TRAVEL_STYLES.map((style) => (
            <TouchableOpacity
              key={style.key}
              style={[
                styles.chip,
                selectedStyles.includes(style.key) && styles.chipSelected,
              ]}
              onPress={() => toggleStyle(style.key)}
            >
              <Text style={[
                styles.chipText,
                selectedStyles.includes(style.key) && styles.chipTextSelected,
              ]}>
                {style.emoji} {style.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Travel Date */}
        <Text style={styles.label}>Travel Date (Optional)</Text>
        <TextInput
          style={styles.input}
          value={travelDate}
          onChangeText={setTravelDate}
          placeholder="YYYY-MM-DD (e.g. 2026-02-15)"
          keyboardType="default"
        />
        <Text style={styles.helperText}>
          Set your flight date for weather-based checklist and notifications
        </Text>

        <TouchableOpacity
          style={[styles.generateButton, loading && styles.generateButtonDisabled]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingButton}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.generateButtonText}> Generating with AI...</Text>
            </View>
          ) : (
            <Text style={styles.generateButtonText}>🤖 Generate Itinerary</Text>
          )}
        </TouchableOpacity>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>What you&apos;ll get:</Text>
          <Text style={styles.infoItem}>✨ Hidden gems locals love</Text>
          <Text style={styles.infoItem}>🏨 Hotel recommendations with booking links</Text>
          <Text style={styles.infoItem}>⚠️ Tourist traps to avoid</Text>
          <Text style={styles.infoItem}>🗺️ Optimized route from your airport</Text>
          <Text style={styles.infoItem}>🚨 Scam & safety warnings</Text>
        </View>

        {/* Explore Places Button */}
        <TouchableOpacity
          style={styles.explorePlacesButton}
          onPress={() => router.push('/places')}
        >
          <Text style={styles.explorePlacesButtonText}>📍 Explore Places from Database</Text>
        </TouchableOpacity>
        <Text style={styles.helperText}>
          View pre-loaded places, checklist, and ask questions about your trip
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 50,
    marginBottom: 4,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  form: {
    gap: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  helperText: {
    fontSize: 13,
    color: '#888',
    marginTop: -8,
  },
  generateButton: {
    backgroundColor: '#007AFF',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  loadingButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e8f4ff',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0066cc',
  },
  infoItem: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    color: '#333',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  explorePlacesButton: {
    backgroundColor: '#34C759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  explorePlacesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
