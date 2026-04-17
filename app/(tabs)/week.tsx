import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { DAYS_OF_WEEK } from '@/utils/dateTime';
import SwipeableLectureRow from '@/components/SwipeableLectureRow';
import { formatTimeAMPM } from '@/utils/dateTime';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DayOfWeek, Lecture } from '@/types/lecture';
import { ColorTheme } from '@/types/theme';
import UndoToast from '@/components/UndoToast';

const DAY_ABBREVS: Record<DayOfWeek, string> = {
  Monday: 'MON',
  Tuesday: 'TUE',
  Wednesday: 'WED',
  Thursday: 'THU',
  Friday: 'FRI',
  Saturday: 'SAT',
  Sunday: 'SUN',
};

// Returns the Monday of the current week
function getWeekStart(from: Date): Date {
  const d = new Date(from);
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Build a flat list of date objects for two consecutive weeks
function buildDateList(from: Date): Date[] {
  const start = getWeekStart(from);
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function dateToDayOfWeek(d: Date): DayOfWeek {
  const jsDay = d.getDay(); // 0=Sun..6=Sat
  const index = jsDay === 0 ? 6 : jsDay - 1;
  return DAYS_OF_WEEK[index];
}

export default function WeeklyScheduleScreen() {
  const router = useRouter();
  const { lectures, deleteLecture, restoreLecture } = useLectures();
  const { colors } = useSettings();

  const today = new Date();
  const todayISO = toISODate(today);

  const dateList = useMemo(() => buildDateList(today), [todayISO]);

  const [selectedISO, setSelectedISO] = useState<string>(todayISO);

  // Action States
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const [deletedLecture, setDeletedLecture] = useState<Lecture | null>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const selectedDate = useMemo(
    () => dateList.find(d => toISODate(d) === selectedISO) ?? today,
    [selectedISO, dateList, today],
  );
  const selectedDayOfWeek = useMemo(() => dateToDayOfWeek(selectedDate), [selectedDate]);

  const dayLectures = useMemo(() =>
    lectures
      .filter(l => l.dayOfWeek === selectedDayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [lectures, selectedDayOfWeek],
  );

  const handleLecturePress = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push(`/lecture/${id}`);
  };

  const handleDeleteClass = (lecture: Lecture) => {
    setDeletedLecture(lecture);
    deleteLecture(lecture.id);
    setUndoToastVisible(true);
  };

  const handleUndoDelete = () => {
    if (deletedLecture) {
      restoreLecture(deletedLecture);
      setUndoToastVisible(false);
      setDeletedLecture(null);
    }
  };

  const handleDateSelect = (iso: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setSelectedISO(iso);
  };

  const isSelectedDayToday = selectedISO === todayISO;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
      </View>

      {/* Horizontal date strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStripContent}
        style={styles.dateStrip}
      >
        {dateList.map((d) => {
          const iso = toISODate(d);
          const isSelected = iso === selectedISO;
          const isToday = iso === todayISO;
          const dayAbbrev = DAY_ABBREVS[dateToDayOfWeek(d)];
          const dateNum = d.getDate();

          return (
            <TouchableOpacity
              key={iso}
              onPress={() => handleDateSelect(iso)}
              activeOpacity={0.7}
              style={[styles.datePill, isSelected && styles.datePillSelected]}
            >
              <Text style={[styles.datePillDay, isSelected && styles.datePillDaySelected]}>
                {dayAbbrev}
              </Text>
              <Text style={[styles.datePillNum, isSelected && styles.datePillNumSelected]}>
                {dateNum}
              </Text>
              {isToday && (
                <View style={[styles.todayDot, isSelected && styles.todayDotSelected]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Day label */}
      <View style={styles.dayLabelRow}>
        <Text style={styles.dayLabelText}>
          {isSelectedDayToday ? 'Today' : selectedDayOfWeek}
        </Text>
        {dayLectures.length > 0 && (
          <Text style={styles.classCountText}>
            {dayLectures.length} {dayLectures.length === 1 ? 'class' : 'classes'}
          </Text>
        )}
      </View>

      {/* Class list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {dayLectures.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>{isSelectedDayToday ? '🎉' : '📭'}</Text>
            <Text style={styles.emptyStateTitle}>
              {isSelectedDayToday ? 'Free Day!' : 'No classes'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {isSelectedDayToday ? 'Nothing scheduled for today.' : `Nothing scheduled for ${selectedDayOfWeek}.`}
            </Text>
          </View>
        ) : (
          <View style={styles.cardList}>
            {dayLectures.map((lecture, index) => {
              const accentColor = lecture.color ?? colors.primary;
              return (
                <View key={lecture.id}>
                  <SwipeableLectureRow onDelete={() => handleDeleteClass(lecture)}>
                    <TouchableOpacity
                      style={styles.card}
                      onPress={() => handleLecturePress(lecture.id)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.cardAccent, { backgroundColor: accentColor }]} />
                      <View style={styles.cardBody}>
                        <View style={styles.cardTop}>
                          <Text style={styles.cardCourseName} numberOfLines={1}>
                            {lecture.courseName}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.textMuted + '80'} />
                        </View>
                        <View style={styles.cardMeta}>
                          <Ionicons name="time-outline" size={13} color={colors.textMuted} style={styles.metaIcon} />
                          <Text style={styles.cardTime}>
                            {formatTimeAMPM(lecture.startTime)} – {formatTimeAMPM(lecture.endTime)}
                          </Text>
                        </View>
                        {lecture.location ? (
                          <View style={styles.cardMeta}>
                            <Ionicons name="location-outline" size={13} color={colors.textMuted} style={styles.metaIcon} />
                            <Text style={styles.cardLocation}>{lecture.location}</Text>
                          </View>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  </SwipeableLectureRow>
                  {index < dayLectures.length - 1 && <View style={styles.cardGap} />}
                </View>
              );
            })}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <UndoToast
        visible={undoToastVisible}
        message={`Deleted "${deletedLecture?.courseName}"`}
        onUndo={handleUndoDelete}
        onDismiss={() => {
          setUndoToastVisible(false);
          setDeletedLecture(null);
        }}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardBackground === '#F8F9FA' ? '#F2F2F7' : '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.textDark,
    letterSpacing: -0.5,
    fontFamily: 'Inter_800ExtraBold',
  },

  // Date strip
  dateStrip: {
    flexGrow: 0,
  },
  dateStripContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  datePill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.cardBackground,
    minWidth: 52,
  },
  datePillSelected: {
    backgroundColor: colors.primary,
  },
  datePillDay: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  datePillDaySelected: {
    color: '#FFFFFF',
  },
  datePillNum: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: colors.textDark,
    marginTop: 2,
  },
  datePillNumSelected: {
    color: '#FFFFFF',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  todayDotSelected: {
    backgroundColor: '#FFFFFF',
  },

  // Day label row
  dayLabelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  dayLabelText: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.textDark,
  },
  classCountText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },

  // Scroll / content
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyStateEmoji: {
    fontSize: 40,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textDark,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    textAlign: 'center',
  },

  // Cards
  cardList: {
    gap: 0,
  },
  cardGap: {
    height: 10,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    overflow: 'hidden',
  },
  cardAccent: {
    width: 4,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  cardBody: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardCourseName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textDark,
    flex: 1,
    marginRight: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    marginTop: 1,
  },
  cardTime: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  cardLocation: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
});
