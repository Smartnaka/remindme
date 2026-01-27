import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LectureProvider } from "@/contexts/LectureContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { requestNotificationPermissions } from "@/utils/notifications";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Optional font loading - only if package is installed
// If @expo-google-fonts/inter is not installed, the app will use system fonts
let fontLoader: (() => [boolean, Error | null]) | null = null;

try {
  // Dynamic import to avoid errors if package is not installed
  const fontModule = require('@expo-google-fonts/inter');
  if (fontModule.useFonts && fontModule.Inter_400Regular) {
    fontLoader = () => fontModule.useFonts({
      Inter_400Regular: fontModule.Inter_400Regular,
      Inter_600SemiBold: fontModule.Inter_600SemiBold,
      Inter_700Bold: fontModule.Inter_700Bold,
    });
  }
} catch (e) {
  // Fonts package not installed, will use system fonts
  console.log('[Layout] Custom fonts not available, using system fonts');
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="add-lecture"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="lecture/[id]"
        options={{
          headerShown: true,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  // Only use fonts if package is available
  const [fontsLoaded] = fontLoader ? fontLoader() : [true]; // If fonts not available, consider them "loaded" (use system fonts)

  useEffect(() => {
    if (fontsLoaded) {
      requestNotificationPermissions();
    }
  }, [fontsLoaded]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00C896" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SettingsProvider>
              <LectureProvider>
                <RootLayoutNav />
              </LectureProvider>
            </SettingsProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
