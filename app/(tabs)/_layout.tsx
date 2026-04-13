import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/contexts/SettingsContext";

export default function TabLayout() {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();

  // Follow platform touch-target guidance:
  // iOS tabs should be at least 44pt high, Android at least 48dp.
  const minTabItemHeight = Platform.OS === "ios" ? 44 : 48;
  const androidBottomPadding = Math.max(insets.bottom, 8);
  const iosBottomPadding = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.cardBackground,
          borderTopWidth: 1,
          paddingTop: Platform.OS === "ios" ? 8 : 10,
          paddingBottom: Platform.OS === "ios" ? iosBottomPadding : androidBottomPadding,
          height:
            Platform.OS === "ios"
              ? 49 + iosBottomPadding
              : Platform.OS === "web"
                ? 68
                : 56 + androidBottomPadding,
        },
        tabBarItemStyle: {
          minHeight: minTabItemHeight,
          paddingHorizontal: 6,
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
