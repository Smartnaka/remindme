import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Lecture } from '@/types/lecture';
import { formatTimeAMPM, isLectureNow, getNextLectureTime } from '@/utils/dateTime';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface LectureCardProps {
  lecture: Lecture;
  onPress: () => void;
  showTimeUntil?: boolean;
}

export default function LectureCard({ lecture, onPress, showTimeUntil = false }: LectureCardProps) {
  const isNow = isLectureNow(lecture.startTime, lecture.endTime);
  const timeUntil = showTimeUntil ? getNextLectureTime(lecture.startTime) : '';
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isNow) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.02,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isNow]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Animated.View style={{ transform: [{ scale: isNow ? pulseAnim : 1 }] }}>
      <TouchableOpacity
        style={[styles.card, isNow && styles.liveCard]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {isNow && (
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE NOW</Text>
            </View>
          )}
          {!isNow && timeUntil && (
            <Text style={styles.nextText}>{timeUntil}</Text>
          )}
          <Text style={styles.courseName}>{lecture.courseName}</Text>

          {lecture.location && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoText}>{lecture.location}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={16} color={Colors.primary} />
            <Text style={styles.infoText}>
              {formatTimeAMPM(lecture.startTime)} - {formatTimeAMPM(lecture.endTime)}
            </Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} style={styles.chevron} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  liveCard: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
  },
  cardContent: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.background,
  },
  liveText: {
    color: Colors.background,
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 0.5,
  },
  nextText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.textDark,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '400' as const,
  },
  chevron: {
    marginLeft: 12,
  },
});
