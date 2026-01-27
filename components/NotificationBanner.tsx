import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { useTodayLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { useRouter } from 'expo-router';

export default function NotificationBanner() {
  const todayLectures = useTodayLectures();
  const { settings } = useSettings();
  const { colors } = useSettings();
  const router = useRouter();
  
  const [activeAlert, setActiveAlert] = useState<{ id: string; title: string; time: string; location?: string } | null>(null);
  const translateY = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const checkUpcomingLectures = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Find a lecture starting soon (within next 15 mins)
      const upcoming = todayLectures.find(lecture => {
        const [hours, minutes] = lecture.startTime.split(':').map(Number);
        const lectureMinutes = hours * 60 + minutes;
        const diff = lectureMinutes - currentMinutes;
        
        // Alert if within 15 mins and hasn't started yet
        return diff > 0 && diff <= 15;
      });

      if (upcoming) {
        // Only show if different from current active alert
        if (activeAlert?.id !== upcoming.id) {
            setActiveAlert({
            id: upcoming.id,
            title: upcoming.courseName,
            time: upcoming.startTime,
            location: upcoming.location
          });
          showBanner();
        }
      } else {
        if (activeAlert) {
          hideBanner();
        }
      }
    };

    // Check immediately and then every minute
    checkUpcomingLectures();
    const interval = setInterval(checkUpcomingLectures, 60000);
    return () => clearInterval(interval);
  }, [todayLectures, activeAlert]);

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
        <TouchableOpacity onPress={hideBanner} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </TouchableOpacity>
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
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
