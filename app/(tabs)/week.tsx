import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DAYS_OF_WEEK, getCurrentDayOfWeek } from '@/utils/dateTime';
import { formatTimeAMPM } from '@/utils/dateTime';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DayOfWeek } from '@/types/lecture';

export default function WeeklyScheduleScreen() {
  const router = useRouter();
  const { lectures } = useLectures();
  const { colors } = useSettings();
  const [refreshing, setRefreshing] = useState(false);
  const currentDay = getCurrentDayOfWeek();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLecturePress = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/lecture/${id}`);
  };

  const getLecturesForDay = (day: DayOfWeek) => {
    return lectures
      .filter(lecture => lecture.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Week</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {DAYS_OF_WEEK.map((day) => {
          const dayLectures = getLecturesForDay(day);

          return (
            <View key={day} style={styles.daySection}>
              <View style={[styles.dayHeader, currentDay === day && styles.dayHeaderActive]}>
                <View style={styles.dayNameContainer}>
                  <Text style={[styles.dayName, currentDay === day && styles.dayNameActive]}>{day}</Text>
                  {currentDay === day && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayText}>Today</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.countBadge, currentDay === day && styles.countBadgeActive]}>
                  <Text style={styles.countBadgeText}>{dayLectures.length}</Text>
                </View>
              </View>

              {dayLectures.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={styles.emptyDayText}>No lectures scheduled</Text>
                </View>
              ) : (
                <View style={styles.lecturesList}>
                  {dayLectures.map((lecture) => (
                    <TouchableOpacity
                      key={lecture.id}
                      style={styles.lectureItem}
                      onPress={() => handleLecturePress(lecture.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.accentBar} />
                      <View style={styles.timeColumn}>
                        <Text style={styles.timeText}>
                          {formatTimeAMPM(lecture.startTime)}
                        </Text>
                        <Text style={styles.timeSubtext}>
                          {formatTimeAMPM(lecture.endTime)}
                        </Text>
                      </View>

                      <View style={styles.lectureInfo}>
                        <Text style={styles.lectureName} numberOfLines={1}>
                          {lecture.courseName}
                        </Text>
                        {lecture.location && (
                          <Text style={styles.locationText} numberOfLines={1}>
                            {lecture.location}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.textDark,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  dayHeaderActive: {
    backgroundColor: colors.primaryLight,
  },
  dayNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dayName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  dayNameActive: {
    color: colors.primary,
  },
  todayBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  todayText: {
    color: colors.background,
    fontSize: 10,
    fontWeight: '700',
  },
  countBadge: {
    backgroundColor: colors.textMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: colors.primary,
  },
  countBadgeText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  emptyDay: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '500',
  },
  lecturesList: {
    gap: 8,
  },
  lectureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.cardBackground, // Subtle border
    overflow: 'hidden',
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  timeColumn: {
    minWidth: 70,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 2,
  },
  timeSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  lectureInfo: {
    flex: 1,
  },
  lectureName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
