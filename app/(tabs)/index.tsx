import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform, Animated, StatusBar } from 'react-native';
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
      <StatusBar
        barStyle={colors.cardBackground === '#F8F9FA' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
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
            <Text style={styles.emptyTitle}>No Classes Scheduled</Text>
            <Text style={styles.emptySubtitle}>You're free for the day! 🎉</Text>
            <TouchableOpacity onPress={handleAddLecture} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Add a Class</Text>
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

                const start = new Date();
                start.setHours(startH, startM, 0, 0);

                const end = new Date();
                end.setHours(endH, endM, 0, 0);

                // Handle case where lecture spans to next day (rare but possible logic)
                if (end < start) end.setDate(end.getDate() + 1);

                return now >= start && now < end;
              });

              // 2. Filter for strictly upcoming lectures (start time > now)
              const upcomingLectures = todayLectures.filter(l => {
                // If it's the current lecture, it's not "upcoming"
                if (currentLecture && l.id === currentLecture.id) return false;

                const [startH, startM] = l.startTime.split(':').map(Number);
                const start = new Date();
                start.setHours(startH, startM, 0, 0);
                return start > now;
              });

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
                          const isLast = index === upcomingLectures.length - 1;

                          return (
                            <View key={lecture.id}>
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

                  {todayLectures.length > 0 && (
                    <Text style={styles.swipeHint}>Tip: Swipe left to delete a class</Text>
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

      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddLecture}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
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
  swipeHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 24,
    opacity: 0.7,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  allDoneContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    marginTop: 20,
  },
  allDoneTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textDark,
    marginTop: 12,
    marginBottom: 4,
  },
  allDoneSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
});
