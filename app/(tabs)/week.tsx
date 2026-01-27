import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DAYS_OF_WEEK, getCurrentDayOfWeek } from '@/utils/dateTime';
import SwipeableLectureRow from '@/components/SwipeableLectureRow';
import { formatTimeAMPM } from '@/utils/dateTime';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DayOfWeek } from '@/types/lecture';
import { ColorTheme } from '@/types/theme';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Lecture } from '@/types/lecture';

export default function WeeklyScheduleScreen() {
  const router = useRouter();
  const { lectures, deleteLecture } = useLectures();
  const { colors } = useSettings();
  const currentDay = getCurrentDayOfWeek();

  // Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [lectureToDelete, setLectureToDelete] = useState<Lecture | null>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

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
      <StatusBar
        barStyle={colors.cardBackground === '#F8F9FA' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Week</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {DAYS_OF_WEEK.map((day) => {
          const dayLectures = getLecturesForDay(day);

          return (
            <View key={day} style={styles.section}>
              <View style={styles.sectionHeaderContainer}>
                <Text style={[styles.sectionHeaderTitle, currentDay === day && styles.currentDayTitle]}>
                  {day.toUpperCase()}
                </Text>
                {currentDay === day && <Text style={styles.todayLabel}>TODAY</Text>}
              </View>

              <View style={styles.groupedList}>
                {dayLectures.length === 0 ? (
                  <View style={styles.emptyRow}>
                    <Text style={[styles.emptyText, currentDay === day && styles.freeDayText]}>
                      {currentDay === day ? "Free Day! 🎉" : "No classes"}
                    </Text>
                  </View>
                ) : (
                  dayLectures.map((lecture, index) => (
                    <View key={lecture.id}>
                      <SwipeableLectureRow onDelete={() => {
                        setLectureToDelete(lecture);
                        setDeleteModalVisible(true);
                      }}>
                        <TouchableOpacity
                          style={styles.row}
                          onPress={() => handleLecturePress(lecture.id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.timeContainer}>
                            <Text style={styles.startTime}>{formatTimeAMPM(lecture.startTime)}</Text>
                            <Text style={styles.endTime}>{formatTimeAMPM(lecture.endTime)}</Text>
                          </View>
                          <View style={styles.detailsContainer}>
                            <Text style={styles.lectureTitle}>{lecture.courseName}</Text>
                            {lecture.location ? (
                              <Text style={styles.lectureLocation}>{lecture.location}</Text>
                            ) : null}
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.textMuted + '80'} />
                        </TouchableOpacity>
                      </SwipeableLectureRow>
                      {index !== dayLectures.length - 1 && <View style={styles.separator} />}
                    </View>
                  ))
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      <ConfirmationModal
        visible={deleteModalVisible}
        title="Delete Lecture?"
        message={`Are you sure you want to remove "${lectureToDelete?.courseName}"?`}
        confirmText="Delete"
        isDestructive
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={() => {
          if (lectureToDelete) {
            deleteLecture(lectureToDelete.id);
          }
          setDeleteModalVisible(false);
          setLectureToDelete(null);
        }}
      />
    </SafeAreaView >
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardBackground === '#F8F9FA' ? '#F2F2F7' : '#000000', // iOS System Gray 6 equivalent for Light Mode
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textDark,
    letterSpacing: -0.5,
  },
  headerIcon: {
    padding: 8,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 8,
    paddingLeft: 4,
  },
  sectionHeaderTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: -0.2,
  },
  currentDayTitle: {
    color: colors.primary,
    fontWeight: '800',
  },
  todayLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  groupedList: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
  },
  emptyRow: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  freeDayText: {
    color: colors.primary,
    fontWeight: '600',
    fontStyle: 'normal',
  },
  timeContainer: {
    width: 70,
  },
  startTime: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textDark,
  },
  endTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  detailsContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  lectureTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textDark,
    marginBottom: 2,
  },
  lectureLocation: {
    fontSize: 13,
    color: colors.textMuted,
  },
  separator: {
    height: 1, // Hairline
    backgroundColor: colors.textMuted + '20',
    marginLeft: 16, // Inset separator
  },
});
