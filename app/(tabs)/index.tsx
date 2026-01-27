import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTodayLectures, useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import LiveLectureCard from '@/components/LiveLectureCard';
import CourseItem from '@/components/CourseItem';
import SwipeableLectureRow from '@/components/SwipeableLectureRow';
import { getCurrentDayOfWeek } from '@/utils/dateTime';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ColorTheme } from '@/types/theme';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Lecture } from '@/types/lecture';

export default function TodayScreen() {
  const router = useRouter();
  const todayLectures = useTodayLectures();
  const { lectures, deleteLecture } = useLectures();
  const { colors, settings, updateSettings } = useSettings();
  const today = getCurrentDayOfWeek();
  const fabScale = useRef(new Animated.Value(1)).current;
  const [currentMinute, setCurrentMinute] = useState(new Date().getMinutes());

  // Auto-refresh the UI every minute to update "Live" status
  useEffect(() => {
    const intervalId = setInterval(() => {
      setCurrentMinute(new Date().getMinutes());
    }, 60000); // Update every minute

    return () => clearInterval(intervalId);
  }, []);

  // Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [lectureToDelete, setLectureToDelete] = useState<Lecture | null>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);
  // Get YYYY-MM-DD for today
  const todayDateString = new Date().toISOString().split('T')[0];
  const hasUnreadNotifications = todayLectures.length > 0 && settings.lastNotificationCheckDate !== todayDateString;

  const handleNotificationPress = () => {
    updateSettings({ lastNotificationCheckDate: todayDateString });
    router.push('/notifications');
  };

  const handleAddLecture = () => {
    // ... (keep existing handleAddLecture)
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Animated.sequence([
      Animated.timing(fabScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fabScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    router.push('/add-lecture');
  };

  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerContainer} edges={['top', 'left', 'right']}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.dateLabel}>{dateString.toUpperCase()}</Text>
            <Text style={styles.headerTitle}>Today</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.iconButton}
              activeOpacity={0.7}
              onPress={handleNotificationPress}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.primary} />
              {hasUnreadNotifications && <View style={styles.notificationDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleAddLecture}
              activeOpacity={0.7}
            >
              <Ionicons name="add-circle" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {todayLectures.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No Classes Today</Text>
            <Text style={styles.emptySubtitle}>Enjoy your free time!</Text>
            <TouchableOpacity onPress={handleAddLecture} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Add Class</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {/* Summary Subtitle */}
            <Text style={styles.summaryText}>
              You have {todayLectures.length} {todayLectures.length === 1 ? 'class' : 'classes'} scheduled
            </Text>

            {/* Live Lecture and List Logic */}
            {(() => {
              const now = new Date();

              // 1. Find the currently active lecture
              const currentLecture = todayLectures.find(l => {
                const [startH, startM] = l.startTime.split(':').map(Number);
                const [endH, endM] = l.endTime.split(':').map(Number);
                const start = new Date(); start.setHours(startH, startM, 0, 0);
                const end = new Date(); end.setHours(endH, endM, 0, 0);
                return now >= start && now < end;
              });

              // 2. Filter out the live lecture from the upcoming list
              const upcomingLectures = currentLecture
                ? todayLectures.filter(l => l.id !== currentLecture.id)
                : todayLectures;

              return (
                <>
                  {/* Live Section */}
                  {currentLecture && (
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionHeader}>HAPPENING NOW</Text>
                      <LiveLectureCard
                        lecture={currentLecture}
                        onPress={() => router.push(`/lecture/${currentLecture.id}`)}
                      />
                    </View>
                  )}

                  {/* Upcoming Section */}
                  {upcomingLectures.length > 0 && (
                    <View style={styles.sectionContainer}>
                      <Text style={styles.sectionHeader}>UPCOMING</Text>
                      <View style={styles.groupedList}>
                        {upcomingLectures.map((lecture, index) => {
                          const [endH, endM] = lecture.endTime.split(':').map(Number);
                          const end = new Date(); end.setHours(endH, endM, 0, 0);
                          const isPast = end < now;
                          const isLast = index === upcomingLectures.length - 1;

                          return (
                            <View key={lecture.id} style={{ opacity: isPast ? 0.6 : 1 }}>
                              <SwipeableLectureRow onDelete={() => {
                                setLectureToDelete(lecture);
                                setDeleteModalVisible(true);
                              }}>
                                <CourseItem
                                  lecture={lecture}
                                  isNext={false}
                                  onPress={() => router.push(`/lecture/${lecture.id}`)}
                                />
                              </SwipeableLectureRow>
                              {!isLast && <View style={styles.separator} />}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </>
              );
            })()}
            <View style={{ height: 100 }} />
          </View>
        )}
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
    </View>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
    borderBottomWidth: 0,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  dateLabel: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 34,
    fontFamily: 'Inter_700Bold',
    color: colors.textDark,
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingBottom: 4,
  },
  iconButton: {
    padding: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 4,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  summaryText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginBottom: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupedList: {
    gap: 12,
  },
  separator: {
    height: 1,
    backgroundColor: colors.textMuted + '20',
    marginLeft: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyIconContainer: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.textDark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
    marginBottom: 24,
  },
  emptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
  },
  emptyButtonText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  timelineContainer: {
    paddingBottom: 40,
  },
});
