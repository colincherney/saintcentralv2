import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useCallback } from 'react';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/supabaseConfig';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [navigationComplete, setNavigationComplete] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  // Listen for auth state changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle routing based on auth state
  useEffect(() => {
    if (!isReady || isAuthenticated === null) return;

    const inProtectedRoute = segments[0] === '(tabs)';

    if (isAuthenticated && !inProtectedRoute) {
      router.replace('/(tabs)/home');
    } else if (!isAuthenticated && inProtectedRoute) {
      router.replace('/');
    } else {
      // Already on the correct route
      setNavigationComplete(true);
    }
  }, [isReady, isAuthenticated, segments]);

  // Mark navigation complete after redirect
  useEffect(() => {
    if (!isReady || isAuthenticated === null) return;
    
    const inProtectedRoute = segments[0] === '(tabs)';
    
    // Check if we're now on the correct route
    if (isAuthenticated && inProtectedRoute) {
      setNavigationComplete(true);
    } else if (!isAuthenticated && !inProtectedRoute) {
      setNavigationComplete(true);
    }
  }, [isReady, isAuthenticated, segments]);

  // Hide splash screen only after navigation is complete
  useEffect(() => {
    if (navigationComplete) {
      const timer = setTimeout(() => {
        SplashScreen.hideAsync();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [navigationComplete]);

  // Don't render anything until ready
  if (!isReady || isAuthenticated === null) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false, gestureEnabled: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', headerShown: true }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}