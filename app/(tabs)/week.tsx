import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform, Animated, StyleProp, ViewStyle, TextStyle, LayoutChangeEvent } from 'react-native';
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
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateToDayOfWeek(d: Date): DayOfWeek {
  const jsDay = d.getDay(); // 0=Sun..6=Sat
  const index = jsDay === 0 ? 6 : jsDay - 1;
  return DAYS_OF_WEEK[index];
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

/** Splits a formatted time string like "9:15 AM" into ["9:15", "AM"] */
function splitTimeAMPM(timeStr: string): [string, string] {
  const spaceIdx = timeStr.lastIndexOf(' ');
  return [timeStr.slice(0, spaceIdx), timeStr.slice(spaceIdx + 1)];
}

interface DatePillProps {
  iso: string;
  isSelected: boolean;
  isToday: boolean;
  dayAbbrev: string;
  dateNum: number;
  onPress: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  pillStyle: StyleProp<ViewStyle>;
  pillSelectedStyle: StyleProp<ViewStyle>;
  pillTodayStyle: StyleProp<ViewStyle>;
  dayTextStyle: StyleProp<TextStyle>;
  dayTextSelectedStyle: StyleProp<TextStyle>;
  numTextStyle: StyleProp<TextStyle>;
  numTextSelectedStyle: StyleProp<TextStyle>;
  todayDotStyle: StyleProp<ViewStyle>;
  todayDotSelectedStyle: StyleProp<ViewStyle>;
}

const DatePill = React.memo(({
  iso,
  isSelected,
  isToday,
  dayAbbrev,
  dateNum,
  onPress,
  onLayout,
  pillStyle,
  pillSelectedStyle,
  pillTodayStyle,
  dayTextStyle,
  dayTextSelectedStyle,
  numTextStyle,
  numTextSelectedStyle,
  todayDotStyle,
  todayDotSelectedStyle,
}: DatePillProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const selectionScale = useRef(new Animated.Value(isSelected ? 1.07 : 1.0)).current;

  useEffect(() => {
    Animated.spring(selectionScale, {
      toValue: isSelected ? 1.07 : 1.0,
      useNativeDriver: true,
      tension: 320,
      friction: 14,
    }).start();
  }, [isSelected, selectionScale]);

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.88,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  const combinedScale = Animated.multiply(scaleAnim, selectionScale);

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={onLayout}
      activeOpacity={1}
      style={[
        pillStyle,
        isToday && !isSelected && pillTodayStyle,
        isSelected && pillSelectedStyle,
        { transform: [{ scale: combinedScale }] },
      ]}
    >
      <Text style={[dayTextStyle, isSelected && dayTextSelectedStyle]}>
        {dayAbbrev}
      </Text>
      <Text style={[numTextStyle, isSelected && numTextSelectedStyle]}>
        {dateNum}
      </Text>
      {isToday && (
        <View style={[todayDotStyle, isSelected && todayDotSelectedStyle]} />
      )}
    </AnimatedTouchable>
  );
});

interface AnimatedCardProps {
  style: StyleProp<ViewStyle>;
  onPress: () => void;
  children: React.ReactNode;
}

const AnimatedCard = React.memo(({ style, onPress, children }: AnimatedCardProps) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, {
      toValue: 0.97,
      duration: 100,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 10,
    }).start();
  }, [scaleAnim]);

  return (
    <AnimatedTouchable
      style={[style, { transform: [{ scale: scaleAnim }] }]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      {children}
    </AnimatedTouchable>
  );
});

export default function WeeklyScheduleScreen() {
  const router = useRouter();
  const { lectures, deleteLecture, restoreLecture } = useLectures();
  const { colors } = useSettings();

  const today = new Date();
  const todayISO = toISODate(today);

  const dateList = useMemo(() => buildDateList(today), [todayISO]);

  const [selectedISO, setSelectedISO] = useState<string>(todayISO);

  // Snap-to-center state for horizontal date strip
  const dateStripRef = useRef<ScrollView>(null);
  const pillLayoutsRef = useRef<Map<string, { x: number; width: number }>>(new Map());
  const [dateStripWidth, setDateStripWidth] = useState(0);

  useEffect(() => {
    const layout = pillLayoutsRef.current.get(selectedISO);
    if (layout && dateStripWidth > 0) {
      const scrollX = layout.x - (dateStripWidth - layout.width) / 2;
      dateStripRef.current?.scrollTo({ x: Math.max(0, scrollX), animated: true });
    }
  }, [selectedISO, dateStripWidth]);

  // Animation values for class list fade-in + slide-up on date change
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    fadeAnim.setValue(0);
    slideAnim.setValue(10);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [selectedISO, fadeAnim, slideAnim]);

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

  const classListAnimStyle = useMemo(
    () => ({ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }),
    [fadeAnim, slideAnim],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule</Text>
      </View>

      {/* Horizontal date strip */}
      <ScrollView
        ref={dateStripRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStripContent}
        style={styles.dateStrip}
        onLayout={(e) => setDateStripWidth(e.nativeEvent.layout.width)}
      >
        {dateList.map((d) => {
          const iso = toISODate(d);
          const isSelected = iso === selectedISO;
          const isToday = iso === todayISO;
          const dayAbbrev = DAY_ABBREVS[dateToDayOfWeek(d)];
          const dateNum = d.getDate();

          return (
            <DatePill
              key={iso}
              iso={iso}
              isSelected={isSelected}
              isToday={isToday}
              dayAbbrev={dayAbbrev}
              dateNum={dateNum}
              onPress={() => handleDateSelect(iso)}
              onLayout={(e) => {
                pillLayoutsRef.current.set(iso, {
                  x: e.nativeEvent.layout.x,
                  width: e.nativeEvent.layout.width,
                });
              }}
              pillStyle={styles.datePill}
              pillSelectedStyle={styles.datePillSelected}
              pillTodayStyle={styles.datePillToday}
              dayTextStyle={styles.datePillDay}
              dayTextSelectedStyle={styles.datePillDaySelected}
              numTextStyle={styles.datePillNum}
              numTextSelectedStyle={styles.datePillNumSelected}
              todayDotStyle={styles.todayDot}
              todayDotSelectedStyle={styles.todayDotSelected}
            />
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
        <Animated.View style={classListAnimStyle}>
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
              const isLast = index === dayLectures.length - 1;
              return (
                <View key={lecture.id} style={styles.timelineRow}>
                  {/* Time column */}
                  <View style={styles.timeColumn}>
                    {splitTimeAMPM(formatTimeAMPM(lecture.startTime)).map((part, i) => (
                      <Text key={i} style={i === 0 ? styles.timeLabel : styles.timePeriod}>{part}</Text>
                    ))}
                  </View>

                  {/* Timeline track: dot + vertical connector */}
                  <View style={[styles.timelineTrack, !isLast && styles.timelineTrackStretch]}>
                    <View style={[styles.timelineDot, styles.timelineDotGlow, { backgroundColor: accentColor, shadowColor: accentColor }]} />
                    {!isLast && <View style={styles.timelineConnector} />}
                  </View>

                  {/* Card column */}
                  <View style={[styles.cardColumn, !isLast && styles.cardColumnSpaced]}>
                    <SwipeableLectureRow onDelete={() => handleDeleteClass(lecture)}>
                      <AnimatedCard
                        style={styles.card}
                        onPress={() => handleLecturePress(lecture.id)}
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
                      </AnimatedCard>
                    </SwipeableLectureRow>
                  </View>
                </View>
              );
            })}
          </View>
        )}
        </Animated.View>
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

const createStyles = (colors: ColorTheme) => {
  const isDark = colors.background === '#000000';

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#000000' : '#F2F2F7',
    },
    header: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 12,
    },
    headerTitle: {
      fontSize: 34,
      fontWeight: '800',
      color: colors.textDark,
      letterSpacing: -0.5,
      fontFamily: 'Inter_700Bold',
    },

    // Date strip
    dateStrip: {
      flexGrow: 0,
    },
    dateStripContent: {
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 14,
      gap: 10,
    },
    datePill: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 16,
      backgroundColor: colors.cardBackground,
      minWidth: 54,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      ...Platform.select({
        ios: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.2 : 0.05,
          shadowRadius: 6,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    datePillToday: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    datePillSelected: {
      backgroundColor: colors.primary,
      borderColor: 'transparent',
      ...Platform.select({
        ios: {
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.55 : 0.38,
          shadowRadius: 10,
        },
        android: {
          elevation: 6,
        },
      }),
    },
    datePillDay: {
      fontSize: 11,
      fontFamily: 'Inter_600SemiBold',
      color: colors.textMuted,
      letterSpacing: 0.8,
      opacity: 0.75,
    },
    datePillDaySelected: {
      color: '#FFFFFF',
      opacity: 1,
    },
    datePillNum: {
      fontSize: 20,
      fontFamily: 'Inter_700Bold',
      color: colors.textDark,
      marginTop: 2,
    },
    datePillNumSelected: {
      color: '#FFFFFF',
    },
    todayDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      marginTop: 5,
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
      paddingTop: 16,
      paddingBottom: 12,
    },
    dayLabelText: {
      fontSize: 22,
      fontFamily: 'Inter_700Bold',
      color: colors.textDark,
      letterSpacing: -0.3,
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
      paddingTop: 8,
    },

    // Empty state
    emptyState: {
      alignItems: 'center',
      paddingTop: 80,
      gap: 12,
    },
    emptyStateEmoji: {
      fontSize: 48,
    },
    emptyStateTitle: {
      fontSize: 18,
      fontFamily: 'Inter_600SemiBold',
      color: colors.textDark,
      letterSpacing: -0.2,
    },
    emptyStateSubtitle: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },

    // Timeline layout
    cardList: {
      gap: 0,
    },
    timelineRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    timeColumn: {
      width: 58,
      paddingTop: 12,
      paddingRight: 8,
      alignItems: 'flex-end',
    },
    timeLabel: {
      fontSize: 12,
      fontFamily: 'Inter_600SemiBold',
      color: colors.textMuted,
      lineHeight: 15,
    },
    timePeriod: {
      fontSize: 10,
      fontFamily: 'Inter_400Regular',
      color: colors.textMuted,
      opacity: 0.65,
      lineHeight: 13,
    },
    timelineTrack: {
      width: 28,
      alignItems: 'center',
      paddingTop: 13,
    },
    timelineTrackStretch: {
      alignSelf: 'stretch',
    },
    timelineDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    timelineDotGlow: {
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.75,
      shadowRadius: 6,
      elevation: 6,
    },
    timelineConnector: {
      flex: 1,
      width: 1.5,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
      marginTop: 5,
    },
    cardColumn: {
      flex: 1,
      paddingLeft: 10,
    },
    cardColumnSpaced: {
      paddingBottom: 14,
    },

    // Cards
    card: {
      flexDirection: 'row',
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      ...Platform.select({
        ios: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.32 : 0.10,
          shadowRadius: 12,
        },
        android: {
          elevation: 5,
        },
      }),
    },
    cardAccent: {
      width: 5,
      borderTopLeftRadius: 18,
      borderBottomLeftRadius: 18,
    },
    cardBody: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 16,
      gap: 7,
    },
    cardTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardCourseName: {
      fontSize: 16,
      fontFamily: 'Inter_700Bold',
      color: colors.textDark,
      flex: 1,
      marginRight: 6,
      letterSpacing: -0.3,
    },
    cardMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    metaIcon: {
      opacity: 0.65,
    },
    cardTime: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: isDark ? '#AEAEB2' : '#6C6C70',
    },
    cardLocation: {
      fontSize: 13,
      fontFamily: 'Inter_500Medium',
      color: isDark ? '#AEAEB2' : '#6C6C70',
    },
  });
};
