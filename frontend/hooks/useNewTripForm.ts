/**
 * Custom hook that manages all form state and logic for creating a new trip.
 * Extracts form logic from the NewTripScreen for better separation of concerns.
 */

import { useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useCountries } from './queries/useCountries';
import { useGenerateItinerary } from './mutations/useItinerary';
import { useItineraryStore } from '../store/itineraryStore';
import type { Airport, TravelStyle, CountryConfig, BudgetLevel } from '../types/api';

/** Form state values exposed by the hook */
export interface NewTripFormState {
  selectedCountryKey: string;
  selectedAirportCode: string;
  numberOfDays: string;
  budgetUSD: string;
  selectedStyles: TravelStyle[];
  travelDate: Date | null;
  showDatePicker: boolean;
}

/** Computed values derived from form state */
export interface NewTripFormComputed {
  countries: CountryConfig[];
  selectedCountry: CountryConfig | undefined;
  availableAirports: Airport[];
  days: number;
  minBudget: number;
  isLoading: boolean;
  isPending: boolean;
}

/** Actions to modify form state */
export interface NewTripFormActions {
  handleCountryChange: (countryKey: string) => void;
  handleAirportChange: (airportCode: string) => void;
  handleDaysChange: (value: string) => void;
  handleBudgetChange: (value: string) => void;
  toggleStyle: (style: TravelStyle) => void;
  handleDateChange: (date: Date | null) => void;
  setShowDatePicker: (show: boolean) => void;
  handleGenerate: () => Promise<void>;
  incrementDays: () => void;
  decrementDays: () => void;
}

export interface UseNewTripFormReturn {
  state: NewTripFormState;
  computed: NewTripFormComputed;
  actions: NewTripFormActions;
}

const MAX_TRAVEL_STYLES = 3;
const MIN_DAYS = 1;
const MAX_DAYS = 30;
const DEFAULT_DAYS = 5;
const DEFAULT_MIN_BUDGET_PER_DAY = 50;

/**
 * Hook that encapsulates all new trip form logic.
 * 
 * @example
 * ```tsx
 * const { state, computed, actions } = useNewTripForm();
 * 
 * return (
 *   <Picker
 *     selectedValue={state.selectedCountryKey}
 *     onValueChange={actions.handleCountryChange}
 *   >
 *     {computed.countries.map(c => <Picker.Item key={c.key} ... />)}
 *   </Picker>
 * );
 * ```
 */
export function useNewTripForm(): UseNewTripFormReturn {
  const router = useRouter();
  
  // Data fetching
  const { data: countries = [], isLoading: loadingCountries } = useCountries();
  const generateItineraryMutation = useGenerateItinerary();
  
  // Store
  const setActiveItinerary = useItineraryStore((state) => state.setActiveItinerary);
  
  // Form state
  const [selectedCountryKey, setSelectedCountryKey] = useState<string>('');
  const [selectedAirportCode, setSelectedAirportCode] = useState<string>('');
  const [numberOfDays, setNumberOfDays] = useState<string>(String(DEFAULT_DAYS));
  const [budgetUSD, setBudgetUSD] = useState<string>('');
  const [selectedStyles, setSelectedStyles] = useState<TravelStyle[]>(['CULTURAL', 'ADVENTURE']);
  const [travelDate, setTravelDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Computed values
  const selectedCountry = countries.find(c => c.key === selectedCountryKey);
  const availableAirports: Airport[] = selectedCountry?.airports || [];
  const days = parseInt(numberOfDays) || MIN_DAYS;
  const minBudget = (selectedCountry?.minBudgetPerDay || DEFAULT_MIN_BUDGET_PER_DAY) * days;

  // Initialize form with first country when countries load
  useEffect(() => {
    if (countries.length > 0 && !selectedCountryKey) {
      const firstCountry = countries[0];
      setSelectedCountryKey(firstCountry.key);
      
      if (firstCountry.airports.length > 0) {
        setSelectedAirportCode(firstCountry.airports[0].code);
      }
      
      setBudgetUSD(String(firstCountry.minBudgetPerDay * DEFAULT_DAYS));
    }
  }, [countries, selectedCountryKey]);

  // Action: Handle country change
  const handleCountryChange = useCallback((countryKey: string) => {
    setSelectedCountryKey(countryKey);
    const country = countries.find(c => c.key === countryKey);
    
    if (country && country.airports.length > 0) {
      setSelectedAirportCode(country.airports[0].code);

      // Auto-adjust budget if below new minimum
      const currentBudget = parseInt(budgetUSD) || 0;
      const newMin = country.minBudgetPerDay * days;
      if (currentBudget < newMin) {
        setBudgetUSD(String(newMin));
      }
    }
  }, [countries, budgetUSD, days]);

  // Action: Handle airport change
  const handleAirportChange = useCallback((airportCode: string) => {
    setSelectedAirportCode(airportCode);
  }, []);

  // Action: Handle days change with budget auto-adjustment
  const handleDaysChange = useCallback((value: string) => {
    setNumberOfDays(value);
    const newDays = parseInt(value) || MIN_DAYS;
    
    if (selectedCountry) {
      const newMin = selectedCountry.minBudgetPerDay * newDays;
      const currentBudget = parseInt(budgetUSD) || 0;
      if (currentBudget < newMin) {
        setBudgetUSD(String(newMin));
      }
    }
  }, [selectedCountry, budgetUSD]);

  // Action: Handle budget change
  const handleBudgetChange = useCallback((value: string) => {
    setBudgetUSD(value);
  }, []);

  // Action: Increment days
  const incrementDays = useCallback(() => {
    const current = parseInt(numberOfDays) || MIN_DAYS;
    if (current < MAX_DAYS) {
      handleDaysChange(String(current + 1));
    }
  }, [numberOfDays, handleDaysChange]);

  // Action: Decrement days
  const decrementDays = useCallback(() => {
    const current = parseInt(numberOfDays) || MIN_DAYS;
    if (current > MIN_DAYS) {
      handleDaysChange(String(current - 1));
    }
  }, [numberOfDays, handleDaysChange]);

  // Action: Toggle travel style selection
  const toggleStyle = useCallback((style: TravelStyle) => {
    setSelectedStyles(prev => {
      if (prev.includes(style)) {
        // Don't allow deselecting the last style
        if (prev.length === 1) return prev;
        return prev.filter(s => s !== style);
      } else {
        // Max 3 styles
        if (prev.length >= MAX_TRAVEL_STYLES) {
          Alert.alert(
            'Maximum 3 Styles', 
            'You can select up to 3 travel styles. Deselect one to add another.'
          );
          return prev;
        }
        return [...prev, style];
      }
    });
  }, []);

  // Action: Handle date change
  const handleDateChange = useCallback((date: Date | null) => {
    setTravelDate(date);
  }, []);

  // Action: Validate and submit form
  const handleGenerate = useCallback(async () => {
    // Validation
    const daysNum = parseInt(numberOfDays);
    if (isNaN(daysNum) || daysNum < MIN_DAYS || daysNum > MAX_DAYS) {
      Alert.alert('Error', `Please enter a valid number of days (${MIN_DAYS}-${MAX_DAYS})`);
      return;
    }

    const budgetNum = parseInt(budgetUSD);
    if (isNaN(budgetNum) || budgetNum < minBudget) {
      Alert.alert(
        'Error', 
        `Minimum budget for ${selectedCountry?.name || 'this country'} is $${minBudget} USD for ${daysNum} days`
      );
      return;
    }

    if (!selectedCountryKey || !selectedAirportCode) {
      Alert.alert('Error', 'Please select a country and airport');
      return;
    }

    // Calculate budget level
    const dailyBudget = budgetNum / daysNum;
    let budgetLevel: BudgetLevel = 'LOW';
    if (dailyBudget >= 150) budgetLevel = 'HIGH';
    else if (dailyBudget >= 80) budgetLevel = 'MEDIUM';

    try {
      const payload = {
        country: selectedCountryKey,
        airportCode: selectedAirportCode,
        numberOfDays: daysNum,
        budgetUSD: budgetNum,
        budgetLevel,
        travelStyles: selectedStyles,
        flightDate: travelDate ? travelDate.toISOString().split('T')[0] : undefined,
      };

      const response = await generateItineraryMutation.mutateAsync(payload);
      
      if (response.itinerary?.id) {
        setActiveItinerary(response.itinerary.id);
      }

      router.push({
        pathname: '/map',
        params: { data: JSON.stringify(response) },
      });
    } catch (error: unknown) {
      console.error('Error generating itinerary:', error);
      
      const err = error as { 
        code?: string; 
        message?: string; 
        response?: { data?: { message?: string; error?: string } } 
      };
      
      let title = 'Generation Failed';
      let message = err.response?.data?.message || err.response?.data?.error || err.message || 'Unknown error';

      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        title = 'Request Timeout';
        message = "The AI is taking a bit longer to generate your nationwide itinerary. We've increased the limit, but complex routes can take 1-2 minutes. Please check your backend terminal for progress and try again.";
      } else if (err.message?.includes('Network Error')) {
        title = 'Network Error';
        message = 'Could not reach the backend. Ensure it is running and your device is on the same network. Check the IP in config/api.ts.';
      }

      Alert.alert(title, message);
    }
  }, [
    numberOfDays, 
    budgetUSD, 
    minBudget, 
    selectedCountry, 
    selectedCountryKey, 
    selectedAirportCode, 
    selectedStyles, 
    travelDate,
    generateItineraryMutation,
    setActiveItinerary,
    router
  ]);

  return {
    state: {
      selectedCountryKey,
      selectedAirportCode,
      numberOfDays,
      budgetUSD,
      selectedStyles,
      travelDate,
      showDatePicker,
    },
    computed: {
      countries,
      selectedCountry,
      availableAirports,
      days,
      minBudget,
      isLoading: loadingCountries,
      isPending: generateItineraryMutation.isPending,
    },
    actions: {
      handleCountryChange,
      handleAirportChange,
      handleDaysChange,
      handleBudgetChange,
      toggleStyle,
      handleDateChange,
      setShowDatePicker,
      handleGenerate,
      incrementDays,
      decrementDays,
    },
  };
}
