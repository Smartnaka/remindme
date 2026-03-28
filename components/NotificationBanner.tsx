import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { useTodayLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { useRouter } from 'expo-router';

export default function NotificationBanner() {
  const todayLectures = useTodayLectures();
  const { colors } = useSettings();
  const router = useRouter();

  const [activeAlert, setActiveAlert] = useState<{ id: string; title: string; time: string; location?: string } | null>(null);
  const [snoozedAlerts, setSnoozedAlerts] = useState<Map<string, number>>(new Map());
  const translateY = useRef(new Animated.Value(-100)).current;
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snoozedAlertsRef = useRef(snoozedAlerts);

  useEffect(() => {
    snoozedAlertsRef.current = snoozedAlerts;
  }, [snoozedAlerts]);

  useEffect(() => {
    const checkUpcomingLectures = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Cleanup expired snoozes
      setSnoozedAlerts(prev => {
          const nowMs = Date.now();
          const next = new Map(prev);
          for (const [id, expiry] of next.entries()) {
              if (nowMs > expiry) next.delete(id);
          }
          return next;
      });

      // Find a lecture starting soon (within next 15 mins) that isn't snoozed
      const upcoming = todayLectures.find(lecture => {
        if (snoozedAlertsRef.current.has(lecture.id)) return false;

        const [hours, minutes] = lecture.startTime.split(':').map(Number);
        const lectureMinutes = hours * 60 + minutes;
        const diff = lectureMinutes - currentMinutes;

        // Alert if within 5 mins and hasn't started yet (reduced from 15)
        return diff > 0 && diff <= 5;
      });

      if (upcoming) {
        // Only show if different from current active alert
        setActiveAlert(prev => {
          if (prev?.id !== upcoming.id) {
            // Clear any existing timer
            if (dismissTimerRef.current) {
              clearTimeout(dismissTimerRef.current);
            }

            // Show banner
            showBanner();

            // Set new auto-dismiss timer
            dismissTimerRef.current = setTimeout(() => {
              hideBanner();
              dismissTimerRef.current = null;
            }, 5000);

            return {
              id: upcoming.id,
              title: upcoming.courseName,
              time: upcoming.startTime,
              location: upcoming.location
            };
          }
          return prev;
        });
      } else {
        setActiveAlert(prev => {
          if (prev) {
            // Clear timer if exists
            if (dismissTimerRef.current) {
              clearTimeout(dismissTimerRef.current);
              dismissTimerRef.current = null;
            }
            hideBanner();
          }
          return null;
        });
      }
    };

    // Check immediately and then every minute
    checkUpcomingLectures();
    const interval = setInterval(checkUpcomingLectures, 60000);

    return () => {
      clearInterval(interval);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [todayLectures]);

  const showBanner = () => {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  const hideBanner = () => {
    Animated.timing(translateY, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setActiveAlert(null));
  };

  const handleSnooze = () => {
    if (activeAlert) {
      setSnoozedAlerts(prev => {
        const next = new Map(prev);
        next.set(activeAlert.id, Date.now() + 10 * 60 * 1000); // 10 minutes
        return next;
      });
      hideBanner();
    }
  };

  if (!activeAlert) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], backgroundColor: colors.cardBackground }]}>
      <TouchableOpacity
        style={styles.content}
        onPress={() => {
          router.push(`/lecture/${activeAlert.id}`);
          hideBanner();
        }}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="time" size={24} color={colors.primary} />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.textDark }]}>Class Starting Soon!</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>
            {activeAlert.title} starts at {formatTimeAMPM(activeAlert.time)}
            {activeAlert.location ? ` in ${activeAlert.location}` : ''}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={handleSnooze} style={[styles.snoozeButton, { backgroundColor: colors.textMuted + '20' }]}>
              <Text style={[styles.snoozeText, { color: colors.textDark }]}>Snooze</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={hideBanner} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40,
    left: 16,
    right: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    fontSize: 13,
  },
  snoozeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  snoozeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 6,
  },
});
