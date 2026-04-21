import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
} from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/contexts/SettingsContext";

// Visible content area height (icon + label row)
const TAB_BAR_CONTENT_HEIGHT = 56;

// Horizontal margin so the bar floats inset from screen edges
const TAB_BAR_HORIZONTAL_MARGIN = 16;

// Opacity for inactive tab items
const INACTIVE_TAB_OPACITY = 0.55;

export default function FloatingTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { colors } = useSettings();
  const insets = useSafeAreaInsets();

  // Keep a stable Animated.Value per route for the press-scale effect.
  const scaleAnims = React.useRef<Animated.Value[]>(
    state.routes.map(() => new Animated.Value(1))
  ).current;

  const handlePress = (index: number, routeKey: string, routeName: string) => {
    const isFocused = state.index === index;

    // Subtle bounce on press
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }),
    ]).start();

    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const handleLongPress = (routeKey: string) => {
    navigation.emit({
      type: "tabLongPress",
      target: routeKey,
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          borderTopWidth: 0.5,
          borderTopColor: "#E0E0E0",
          backgroundColor: "#FFFFFF",
          height: TAB_BAR_CONTENT_HEIGHT + insets.bottom,
        },
      ]}
    >
      <View style={[styles.bar, { height: TAB_BAR_CONTENT_HEIGHT, marginHorizontal: TAB_BAR_HORIZONTAL_MARGIN }]}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;

              const label =
                typeof options.tabBarLabel === "string"
                  ? options.tabBarLabel
                  : options.title ?? route.name;

              const iconColor = isFocused ? colors.primary : colors.textMuted;
              const labelColor = isFocused ? colors.primary : colors.textMuted;
              const iconScale = isFocused ? 1.05 : 1;
              const inactiveOpacity = isFocused ? 1 : INACTIVE_TAB_OPACITY;

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  onPress={() => handlePress(index, route.key, route.name)}
                  onLongPress={() => handleLongPress(route.key)}
                  activeOpacity={0.8}
                  // Ensure minimum 48dp touch target
                  style={styles.touchable}
                >
                  <Animated.View
                    style={[
                      styles.tabItem,
                      { transform: [{ scale: scaleAnims[index] }], opacity: inactiveOpacity },
                    ]}
                  >
                    {/* Active pill background */}
                    {isFocused && (
                      <View
                        style={[
                          styles.activePill,
                          { backgroundColor: colors.primaryLight },
                        ]}
                      />
                    )}

                    {/* Icon */}
                    <Animated.View
                      style={{ transform: [{ scale: iconScale }] }}
                    >
                      {options.tabBarIcon
                        ? options.tabBarIcon({
                            focused: isFocused,
                            color: iconColor,
                            size: 22,
                          })
                        : null}
                    </Animated.View>

                    {/* Label */}
                    <Text
                      style={[
                        styles.label,
                        { color: labelColor },
                        isFocused && styles.labelActive,
                      ]}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </Animated.View>
                </TouchableOpacity>
              );
            })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "flex-start",
  },
  bar: {
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  touchable: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 16,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: "600",
  },
});
