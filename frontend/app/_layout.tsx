import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { hideAsync, preventAutoHideAsync } from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/react-query';
import '../global.css';
import Toast from 'react-native-toast-message';
import { customToastConfig } from '../components/ui/ToastMessage';

import { useColorScheme } from '../hooks/use-color-scheme';
import { useAuth } from '../store/authStore';
import { useOnboarding } from '../store/onboardingStore';
import { useSocket } from '../hooks/useSocket';
import { useUser } from '../hooks/queries/useUser';

// Prevent the splash screen from auto-hiding before asset loading is complete.
preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, isRestoring } = useAuth();
  const { hasSeenOnboarding, isCheckingOnboarding, checkOnboardingForUser, resetOnboarding } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();
  
  // Initialize socket connection
  useSocket();
  
  // Fetch and cache user data at app root level
  const { data: user, isLoading: isLoadingUser } = useUser();

  // Check onboarding status when user data is available
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      console.log('[NAV] User authenticated, checking onboarding for:', user.id);
      checkOnboardingForUser(user.id);
    } else if (!isAuthenticated) {
      // Reset onboarding state when logged out
      resetOnboarding();
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    const isLoading = isRestoring || (isAuthenticated && (isLoadingUser || isCheckingOnboarding));
    console.log('[NAV] Auth state changed:', { isAuthenticated, isRestoring, isCheckingOnboarding, isLoadingUser, hasSeenOnboarding, segments: segments[0] });
    
    // Wait for all states to be ready
    if (isLoading) return;

    const inAuthGroup = (segments[0] as string) === 'auth';
    const inOnboarding = (segments[0] as string) === 'onboarding';
    
    console.log('[NAV] Navigation decision:', { inAuthGroup, inOnboarding, hasSeenOnboarding });

    if (isAuthenticated && inAuthGroup) {
      // User just authenticated from auth screen
      if (hasSeenOnboarding) {
        console.log('[NAV] Redirecting to tabs (authenticated user who has seen onboarding)');
        router.replace('/(tabs)' as any);
      } else {
        console.log('[NAV] Redirecting to onboarding (authenticated user who has NOT seen onboarding)');
        router.replace('/onboarding' as any);
      }
    } else if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if accessing protected route
      console.log('[NAV] Redirecting to login (unauthenticated user on protected page)');
      router.replace('/auth/login' as any);
    }
    // Don't redirect if already on onboarding screen
  }, [isAuthenticated, segments, isRestoring, router, hasSeenOnboarding, isCheckingOnboarding, isLoadingUser]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="chat" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
      <Stack.Screen name="itinerary" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="friends" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const { hydrate } = useAuth();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
      hideAsync();
  }, []);


  return (
    <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootLayoutNav />
          <StatusBar style="auto" />
          <Toast config={customToastConfig} visibilityTime={4000} />
        </ThemeProvider>
    </QueryClientProvider>
  );
}

