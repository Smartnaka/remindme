import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/contexts/SettingsContext";

// Base height of the interactive tab bar area (icon + label row), before
// the device's bottom safe-area inset is added.
const TAB_BAR_BASE_HEIGHT = Platform.select({
  ios: 60,
  android: 62,
  default: 64, // web
});

export default function TabLayout() {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();

  // Follow platform touch-target guidance:
  // iOS tabs should be at least 44pt high, Android at least 48dp.
  const minTabItemHeight = Platform.OS === "ios" ? 44 : 48;

  // Bottom padding = safe-area inset so content never overlaps the home
  // indicator (iOS) or the gesture navigation bar (Android).
  // We deliberately do NOT force an artificial minimum so the tab bar
  // doesn't over-pad on devices that report insets.bottom === 0
  // (e.g. Android 3-button nav where the nav bar height is already
  // accounted for by the system).
  const bottomInset = insets.bottom;

  // Total tab bar height = visible area + device inset.
  const tabBarHeight = TAB_BAR_BASE_HEIGHT + bottomInset;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          // Subtle top border – only needed on iOS; Android elevation handles the
          // visual separation, so a border there would be redundant.
          borderTopColor: colors.cardBackground,
          borderTopWidth: Platform.OS === "ios" ? 0.5 : 0,
          // Rounded top corners for a modern, premium look
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          // Vertical rhythm: a small fixed top pad + dynamic bottom pad
          paddingTop: 8,
          paddingBottom: bottomInset,
          height: tabBarHeight,
          // Platform-specific depth cues
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.07,
              shadowRadius: 8,
            },
            android: {
              // elevation replaces both border and shadow on Android
              elevation: 8,
            },
          }),
        },
        tabBarItemStyle: {
          minHeight: minTabItemHeight,
          paddingHorizontal: 6,
          // Keep icon + label vertically centred within the visible area
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600" as const,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="week"
        options={{
          title: "Schedule",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exams"
        options={{
          title: "Exams",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "hourglass" : "hourglass-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "settings" : "settings-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
