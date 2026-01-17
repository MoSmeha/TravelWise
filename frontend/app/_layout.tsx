import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
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

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { isAuthenticated, isRestoring } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('[NAV] Auth state changed:', { isAuthenticated, isRestoring, segments: segments[0] });
    if (isRestoring) return;

    const inAuthGroup = (segments[0] as string) === 'auth';
    console.log('[NAV] Navigation decision:', { inAuthGroup, shouldRedirect: !isAuthenticated && !inAuthGroup });

    if (isAuthenticated && inAuthGroup) {
      console.log('[NAV] Redirecting to tabs (authenticated user on auth page)');
      router.replace('/(tabs)' as any);
    } else if (!isAuthenticated && !inAuthGroup) {
        // Redirect to login if accessing protected route
        // Allow access to auth screens
        console.log('[NAV] Redirecting to login (unauthenticated user on protected page)');
        router.replace('/auth/login' as any);
    }
  }, [isAuthenticated, segments, isRestoring, router]);

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
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
      SplashScreen.hideAsync();
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

