import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { LectureProvider } from "@/contexts/LectureContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { ErrorBoundary } from "@/app/components/ErrorBoundary";
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { requestNotificationPermissions, handleNotificationResponse } from "@/utils/notifications";
import { useEffect, useRef } from "react";
import * as Notifications from 'expo-notifications';
import NotificationBanner from "@/components/NotificationBanner";
import { ExamProvider } from "@/contexts/ExamContext";
import { StudyTimerProvider } from "@/contexts/StudyTimerContext";
import { AlertProvider } from "@/contexts/AlertContext";
import CustomAlert from "@/components/CustomAlert";
import OnboardingCarousel from "@/components/OnboardingCarousel";

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
  const { theme, colors, settings, updateSettings, isLoading: isSettingsLoading } = useSettings();

  // Gate: show onboarding if not completed
  if (!isSettingsLoading && !settings.hasOnboarded) {
    return (
      <OnboardingCarousel
        onComplete={() => updateSettings({ hasOnboarded: true })}
      />
    );
  }

  const navTheme = {
    ...(theme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.cardBackground,
      text: colors.textDark,
      border: 'transparent',
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} backgroundColor="transparent" translucent={true} />
      <Stack screenOptions={{ 
        headerBackTitle: "Back", 
        contentStyle: { backgroundColor: colors.background },
        animation: settings.reduceMotion ? 'none' : 'default',
      }}>
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
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Only use fonts if package is available
  const [fontsLoaded] = fontLoader ? fontLoader() : [true]; // If fonts not available, consider them "loaded" (use system fonts)

  useEffect(() => {
    if (fontsLoaded) {
      requestNotificationPermissions();
      
      // Handle notification responses (Snooze/Dismiss/Tap)
      const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
        const data = await handleNotificationResponse(response);
        
        if (data) {
          // Deep Linking: navigate to the relevant screen based on notification data
          if (data.lectureId) {
            // Lecture or lecture-related reminder → go to lecture detail
            router.push(`/lecture/${data.lectureId}`);
          } else if (data.examId || data.type === 'exam-reminder') {
            // Exam reminder → go to Exams tab
            router.push('/(tabs)/exams');
          } else if (data.assignmentId) {
            // Assignment reminder without lectureId → go to Today tab
            router.push('/(tabs)');
          }
        }
      });

      return () => {
        subscription.remove();
      };
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
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <SettingsProvider>
              <AlertProvider>
                <LectureProvider>
                  <ExamProvider>
                    <StudyTimerProvider>
                      <>
                        <RootLayoutNav />
                        <NotificationBanner />
                        <CustomAlert />
                      </>
                    </StudyTimerProvider>
                  </ExamProvider>
                </LectureProvider>
              </AlertProvider>
            </SettingsProvider>
            </SafeAreaProvider>
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
