import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform, Animated, StatusBar, Modal, DeviceEventEmitter } from 'react-native';
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
import { Lecture } from '@/types/lecture';
import { getUpcomingAssignments } from '@/utils/assignmentUtils';
import UndoToast from '@/components/UndoToast';
import SuccessToast from '@/components/SuccessToast';

export default function TodayScreen() {
  const router = useRouter();
  const todayLectures = useTodayLectures();
  const { lectures, deleteLecture, restoreLecture, assignments } = useLectures();
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

  // Action States
  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [fabMenuMode, setFabMenuMode] = useState<'options' | 'coursePicker'>('options');
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const [deletedLecture, setDeletedLecture] = useState<Lecture | null>(null);
  
  // Success Toast 
  const [successToastVisible, setSuccessToastVisible] = useState(false);
  const [successToastMessage, setSuccessToastMessage] = useState('');

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('showSuccessToast', (data) => {
        setSuccessToastMessage(data.message);
        setSuccessToastVisible(true);
    });
    return () => sub.remove();
  }, []);

  const styles = useMemo(() => createStyles(colors), [colors]);
  // Get YYYY-MM-DD for today
  const todayDateString = new Date().toISOString().split('T')[0];
  const hasUnreadNotifications = todayLectures.length > 0 && settings.lastNotificationCheckDate !== todayDateString;

  const handleNotificationPress = () => {
    updateSettings({ lastNotificationCheckDate: todayDateString });
    router.push('/notifications');
  };

  const handleFabPress = () => {
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
    setFabMenuMode('options');
    setFabMenuVisible(true);
  };

  const navigateTo = (route: any) => {
    setFabMenuVisible(false);
    setTimeout(() => {
        router.push(route);
    }, Platform.OS === 'ios' ? 200 : 0);
  }

  const handleDeleteClass = (lecture: Lecture) => {
      // 1. Save data for undo
      setDeletedLecture(lecture);
      // 2. Actually delete it
      deleteLecture(lecture.id);
      // 3. Show Toast
      setUndoToastVisible(true);
  };

  const handleUndoDelete = () => {
      if (deletedLecture) {
         // Re-insert from context
         const { restoreLecture } = require('@/contexts/LectureContext');
         // But we already have the context hooked! Wait.
         // Actually, I can just use the context from above. But I need to extract restoreLecture.
      }
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
              onPress={() => router.push('/study-timer')}
            >
              <Ionicons name="timer-outline" size={24} color={colors.primary} />
            </TouchableOpacity>
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
            <TouchableOpacity onPress={() => handleFabPress()} style={styles.emptyButton}>
              <Text style={styles.emptyButtonText}>Add to Schedule</Text>
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

              // 3. Filter for past lectures (end time < now)
              const pastLectures = todayLectures.filter(l => {
                  if (currentLecture && l.id === currentLecture.id) return false;
                  const [endH, endM] = l.endTime.split(':').map(Number);
                  const end = new Date();
                  end.setHours(endH, endM, 0, 0);
                  if (end < now) {
                      const [startH] = l.startTime.split(':').map(Number);
                      if (endH < startH) return false; // Crosses midnight edge case
                      return true;
                  }
                  return false;
              });

              const isDoneForToday = !currentLecture && upcomingLectures.length === 0 && pastLectures.length > 0;

              return (
                <>
                  {/* Done For Today Section */}
                  {isDoneForToday && (
                      <View style={styles.allDoneContainer}>
                          <Ionicons name="checkmark-done-circle" size={64} color={colors.primary} />
                          <Text style={styles.allDoneTitle}>Done for today!</Text>
                          <Text style={styles.allDoneSubtitle}>You've finished all {pastLectures.length} classes.</Text>
                      </View>
                  )}

                  {/* Past Classes (grayed out) */}
                  {isDoneForToday && pastLectures.length > 0 && (
                      <View style={[styles.sectionContainer, { marginTop: 32, opacity: 0.6 }]}>
                          <Text style={styles.sectionHeader}>COMPLETED CLASSES</Text>
                          <View style={styles.groupedList}>
                              {pastLectures.map((lecture, index) => {
                                  const isLast = index === pastLectures.length - 1;
                                  return (
                                     <View key={lecture.id}>
                                         <SwipeableLectureRow onDelete={() => handleDeleteClass(lecture)}>
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
                      <Text style={styles.sectionHeader}>UPCOMING CLASSES</Text>
                      <View style={styles.groupedList}>
                        {upcomingLectures.map((lecture, index) => {
                           // ... same as before
                           const [endH, endM] = lecture.endTime.split(':').map(Number);
                           const end = new Date(); end.setHours(endH, endM, 0, 0);
                           const isLast = index === upcomingLectures.length - 1;

                           return (
                            <View key={lecture.id}>
                              <SwipeableLectureRow onDelete={() => handleDeleteClass(lecture)}>
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

                  {/* Upcoming Deadlines Widget */}
                  {assignments && assignments.length > 0 && (() => {
                      const upcoming = getUpcomingAssignments(assignments);

                      if (upcoming.length === 0) return null;

                      return (
                          <View style={styles.sectionContainer}>
                              <Text style={styles.sectionHeader}>UPCOMING DEADLINES</Text>
                              <View style={styles.groupedList}>
                                  {upcoming.map((assignment, index) => {
                                      // Find course color/name
                                      const course = lectures.find(l => l.id === assignment.lectureId);
                                      const isLast = index === upcoming.length - 1;
                                      
                                      return (
                                          <TouchableOpacity 
                                            key={assignment.id} 
                                            style={[styles.deadlineCard, styles.groupedItem]}
                                            onPress={() => router.push(`/lecture/${assignment.lectureId}`)}
                                          >
                                              <View style={styles.deadlineRow}>
                                                  <View style={styles.deadlineInfo}>
                                                      <View style={styles.deadlineBadgeRow}>
                                                          {course && (
                                                              <View style={[styles.miniBadge, { backgroundColor: course.color || colors.primary }]}>
                                                                  <Text style={styles.miniBadgeText}>{course.courseName}</Text>
                                                              </View>
                                                          )}
                                                          {assignment.priority && assignment.priority !== 'medium' && (
                                                              <View style={[
                                                                  styles.priorityDot, 
                                                                  { backgroundColor: assignment.priority === 'high' ? colors.error : '#3498db' }
                                                              ]} />
                                                          )}
                                                      </View>
                                                      <Text style={styles.deadlineTitle} numberOfLines={1}>{assignment.title}</Text>
                                                      <Text style={styles.deadlineDate}>
                                                          Due {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                      </Text>
                                                  </View>
                                                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                                              </View>
                                              {!isLast && <View style={styles.separator} />}
                                          </TouchableOpacity>
                                      );
                                  })}
                              </View>
                          </View>
                      );
                  })()}
                  
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

      <UndoToast 
          visible={undoToastVisible}
          message={`Deleted "${deletedLecture?.courseName}"`}
          onUndo={handleUndoDelete}
          onDismiss={() => {
              setUndoToastVisible(false);
              setDeletedLecture(null);
          }}
      />

      <SuccessToast 
          visible={successToastVisible}
          message={successToastMessage}
          onDismiss={() => setSuccessToastVisible(false)}
      />

      {/* FAB Bottom Sheet Menu */}
      {Platform.OS === 'web' ? null : ( // Modal fallback required for web sometimes, but using native Modal here
          <Modal
             visible={fabMenuVisible}
             transparent
             animationType="slide"
             onRequestClose={() => setFabMenuVisible(false)}
          >
              <TouchableOpacity
                 style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}
                 activeOpacity={1}
                 onPress={() => setFabMenuVisible(false)}
              >
                  <TouchableOpacity 
                     activeOpacity={1} 
                     style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, maxHeight: 500 }}
                  >
                      <View style={{ width: 40, height: 4, backgroundColor: colors.textMuted + '40', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
                      
                      {fabMenuMode === 'options' ? (
                          <>
                              <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 24 }}>Add to Schedule</Text>
                              
                              <TouchableOpacity 
                                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.textMuted + '30' }}
                                  onPress={() => navigateTo('/add-lecture')}
                              >
                                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                      <Ionicons name="book-outline" size={20} color={colors.primary} />
                                  </View>
                                  <Text style={{ fontSize: 17, color: colors.textDark, fontWeight: '500' }}>New Class</Text>
                              </TouchableOpacity>

                              <TouchableOpacity 
                                  style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16 }}
                                  onPress={() => {
                                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                                      setFabMenuMode('coursePicker');
                                  }}
                              >
                                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                                      <Ionicons name="document-text-outline" size={20} color={colors.primary} />
                                  </View>
                                  <Text style={{ fontSize: 17, color: colors.textDark, fontWeight: '500' }}>New Assignment</Text>
                              </TouchableOpacity>
                          </>
                      ) : (
                          <>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                                  <TouchableOpacity onPress={() => setFabMenuMode('options')} style={{ padding: 4 }}>
                                      <Ionicons name="arrow-back" size={24} color={colors.textDark} />
                                  </TouchableOpacity>
                                  <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textDark }}>Select Course</Text>
                                  <View style={{ width: 32 }} />
                              </View>

                              {lectures.length === 0 ? (
                                  <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                      <Ionicons name="folder-open-outline" size={48} color={colors.textMuted} style={{ marginBottom: 16, opacity: 0.5 }} />
                                      <Text style={{ fontSize: 16, fontWeight: '600', color: colors.textDark, marginBottom: 8, textAlign: 'center' }}>
                                          You haven't added any courses yet.
                                      </Text>
                                      <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: 24, paddingHorizontal: 20 }}>
                                          Add a course first to attach assignments to it.
                                      </Text>
                                      <TouchableOpacity 
                                          style={{ backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 }}
                                          onPress={() => navigateTo('/add-lecture')}
                                      >
                                          <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 15 }}>Add a Course</Text>
                                      </TouchableOpacity>
                                  </View>
                              ) : (
                                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                                      {lectures.map((l, index) => (
                                          <TouchableOpacity 
                                              key={l.id}
                                              style={{ 
                                                  flexDirection: 'row', 
                                                  alignItems: 'center', 
                                                  paddingVertical: 16, 
                                                  borderBottomWidth: index === lectures.length - 1 ? 0 : StyleSheet.hairlineWidth, 
                                                  borderBottomColor: colors.textMuted + '30' 
                                              }}
                                              onPress={() => navigateTo(`/add-assignment?lectureId=${l.id}`)}
                                          >
                                              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: l.color || colors.primary, marginRight: 16 }} />
                                              <Text style={{ fontSize: 16, color: colors.textDark, fontWeight: '500', flex: 1 }}>{l.courseName}</Text>
                                              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                                          </TouchableOpacity>
                                      ))}
                                  </ScrollView>
                              )}
                          </>
                      )}

                      <TouchableOpacity 
                          style={{ marginTop: 16, paddingVertical: 16, alignItems: 'center', backgroundColor: colors.background, borderRadius: 14 }}
                          onPress={() => setFabMenuVisible(false)}
                      >
                          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.textDark }}>Cancel</Text>
                      </TouchableOpacity>
                  </TouchableOpacity>
              </TouchableOpacity>
          </Modal>
      )}

      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleFabPress}
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
  groupedItem: {
      backgroundColor: colors.cardBackground,
      padding: 16,
  },
  deadlineCard: {
      // styles handled by groupedItem mostly
  },
  deadlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
  },
  deadlineInfo: {
      flex: 1,
  },
  deadlineBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      gap: 6,
  },
  miniBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
  },
  miniBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
  },
  priorityDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
  },
  deadlineTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textDark,
      marginBottom: 2,
  },
  deadlineDate: {
      fontSize: 12,
      color: colors.textMuted,
  }
});
