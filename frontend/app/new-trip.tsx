/**
 * New Trip Screen - Creates a new travel itinerary.
 * 
 * Form logic is extracted to useNewTripForm hook for separation of concerns.
 * This component focuses purely on presentation.
 */

import { Picker } from '@react-native-picker/picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Calendar, DollarSign } from 'lucide-react-native';

import { useNewTripForm } from '../hooks/useNewTripForm';
import { TRAVEL_STYLES } from '../constants/travelStyles';
import { BRAND_COLORS } from '../constants/theme';

export default function NewTripScreen() {
  const router = useRouter();
  const { state, computed, actions } = useNewTripForm();

  // Loading state
  if (computed.isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        <Text className="mt-3 text-lg text-gray-600">Loading destinations...</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="pt-14 px-5 pb-4 bg-white border-b border-gray-100">
        <View className="flex-row items-start">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 mt-1">
            <ArrowLeft size={24} color="#000" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 leading-tight">Plan Your Trip</Text>
            <Text className="text-sm text-gray-500 mt-0.5">Tell us about your dream destination</Text>
          </View>
        </View>
      </View>

      <View className="p-5 gap-6 pb-12">
        {/* Country Picker */}
        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">Where do you want to go?</Text>
          <View className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <Picker
              selectedValue={state.selectedCountryKey}
              onValueChange={actions.handleCountryChange}
              style={{ height: 50, color: '#333' }}
            >
              {computed.countries.map((country) => (
                <Picker.Item
                  key={country.code}
                  label={country.name}
                  value={country.key}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Airport Picker */}
        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">Landing airport</Text>
          <View className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <Picker
              selectedValue={state.selectedAirportCode}
              onValueChange={actions.handleAirportChange}
              style={{ height: 50, color: '#333' }}
            >
              {computed.availableAirports.map((airport) => (
                <Picker.Item
                  key={airport.code}
                  label={`${airport.name} (${airport.code})`}
                  value={airport.code}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Days Selector */}
        <View>
          <Text className="text-base font-bold text-gray-800 mb-1">Trip duration</Text>
          <View className="flex-row items-center rounded-lg border border-white">
            <TouchableOpacity
              onPress={actions.decrementDays}
              className="w-9 h-9 bg-gray-200 rounded-md justify-center items-center m-0.5"
            >
              <Text className="text-2xl text-gray-600 font-medium">-</Text>
            </TouchableOpacity>

            <View className="flex-1 flex-row items-center justify-center py-1">
              <TextInput
                value={state.numberOfDays}
                onChangeText={actions.handleDaysChange}
                keyboardType="numeric"
                className="text-base font-bold text-center w-10"
              />
              <Text className="text-xs text-gray-500">days</Text>
            </View>

            <TouchableOpacity
              onPress={actions.incrementDays}
              className="w-9 h-9 bg-gray-200 rounded-md justify-center items-center m-0.5"
            >
              <Text className="text-xl text-gray-600 font-medium">+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Budget Input */}
        <View>
          <Text className="text-sm font-bold text-gray-800 mb-1">Budget level</Text>
          <View className="bg-white border border-gray-200 rounded-lg py-1 px-3 flex-row items-center">
            <DollarSign size={16} color="#666" />
            <TextInput
              className="flex-1 text-sm ml-1.5 text-gray-900"
              value={state.budgetUSD}
              onChangeText={actions.handleBudgetChange}
              keyboardType="numeric"
              placeholder={`Min: $${computed.minBudget}`}
            />
            <Text className="text-xs text-gray-400">min ${computed.minBudget}</Text>
          </View>
        </View>

        {/* Travel Styles */}
        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">
            What interests you? (select at least one)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {TRAVEL_STYLES.map((style) => {
              const isActive = state.selectedStyles.includes(style.key);
              const Icon = style.icon;
              return (
                <TouchableOpacity
                  key={style.key}
                  className={`flex-row items-center w-[48%] p-3 rounded-xl border ${
                    isActive 
                      ? 'bg-[#0A4974]/10 border-[#0A4974]' 
                      : 'bg-white border-gray-200'
                  }`}
                  onPress={() => actions.toggleStyle(style.key)}
                >
                  <Icon size={18} color={isActive ? BRAND_COLORS.primary : '#666'} />
                  <Text 
                    className={`text-sm ml-2 ${
                      isActive ? 'text-[#0A4974] font-semibold' : 'text-gray-700'
                    }`}
                  >
                    {style.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Travel Date */}
        <View>
          <Text className="text-base font-bold text-gray-800 mb-2">Travel Date (Optional)</Text>
          <TouchableOpacity
            onPress={() => actions.setShowDatePicker(true)}
            className="bg-white border border-gray-200 rounded-xl p-3 flex-row items-center shadow-sm"
          >
            <Calendar size={18} color="#666" />
            <Text className={`flex-1 text-sm ml-2 ${state.travelDate ? 'text-gray-900' : 'text-gray-400'}`}>
              {state.travelDate 
                ? state.travelDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  }) 
                : 'Select a date'}
            </Text>
          </TouchableOpacity>
          
          {state.showDatePicker && (
            <DateTimePicker
              value={state.travelDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              accentColor={BRAND_COLORS.primary}
              textColor={BRAND_COLORS.primary}
              themeVariant="light"
              onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                actions.setShowDatePicker(Platform.OS === 'ios');
                if (event.type === 'set' && selectedDate) {
                  actions.handleDateChange(selectedDate);
                }
              }}
            />
          )}
          
          {state.travelDate && (
            <TouchableOpacity 
              onPress={() => actions.handleDateChange(null)} 
              className="mt-1 ml-1"
            >
              <Text className="text-xs text-red-500">Clear date</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={`bg-[#0A4974] p-4 rounded-xl items-center mt-2 shadow-md ${
            computed.isPending ? 'opacity-80' : ''
          }`}
          onPress={actions.handleGenerate}
          disabled={computed.isPending}
        >
          {computed.isPending ? (
            <View className="flex-row items-center">
              <ActivityIndicator color="#fff" />
              <Text className="text-white text-lg font-semibold ml-2">Planning Trip...</Text>
            </View>
          ) : (
            <Text className="text-white text-lg font-semibold">Generate Itinerary</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
