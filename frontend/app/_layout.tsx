import { Stack } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/react-query';
import '../global.css';

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen 
          name="index" 
          options={{ 
            title: 'TravelWise',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="map" 
          options={{ 
            title: 'Map View',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="itinerary" 
          options={{ 
            title: 'Itinerary',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="checklist" 
          options={{ 
            title: 'Packing Checklist',
            headerShown: true,
          }} 
        />
        <Stack.Screen 
          name="places" 
          options={{ 
            title: 'Explore Places',
            headerShown: true,
          }} 
        />
      </Stack>
    </QueryClientProvider>
  );
}

