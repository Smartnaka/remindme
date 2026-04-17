import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform, Animated, StatusBar, Modal, DeviceEventEmitter } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTodayLectures, useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import LiveLectureCard from '@/components/LiveLectureCard';
import CourseItem from '@/components/CourseItem';
import SwipeableLectureRow from '@/components/SwipeableLectureRow';
import { getCurrentDayOfWeek, formatTimeAMPM } from '@/utils/dateTime';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ColorTheme } from '@/types/theme';
import { Lecture } from '@/types/lecture';
import { Assignment } from '@/types/assignment';
import { getUpcomingAssignments } from '@/utils/assignmentUtils';
import UndoToast from '@/components/UndoToast';
import SuccessToast from '@/components/SuccessToast';
import MiniTimerBar from '@/components/MiniTimerBar';

import LectureContextMenu from '@/components/LectureContextMenu';
import { FlatList } from 'react-native';

export default function TodayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const todayLectures = useTodayLectures();
  const { lectures, deleteLecture, restoreLecture, assignments } = useLectures();
  const { colors, settings, updateSettings, isLoading: isSettingsLoading } = useSettings();
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

  // FAB Pulsing Animation for new users
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (lectures.length === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [lectures.length]);

  // Action States

  const [fabMenuVisible, setFabMenuVisible] = useState(false);
  const [fabMenuMode, setFabMenuMode] = useState<'options' | 'coursePicker'>('options');
  const [undoToastVisible, setUndoToastVisible] = useState(false);
  const [deletedLecture, setDeletedLecture] = useState<Lecture | null>(null);

  const { updateAssignment } = useLectures();
  const [assignmentUndoToastVisible, setAssignmentUndoToastVisible] = useState(false);
  const [completedAssignment, setCompletedAssignment] = useState<Assignment | null>(null);
  const [hiddenAssignmentIds, setHiddenAssignmentIds] = useState<Set<string>>(new Set());

  // Context Menu State
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextLecture, setContextLecture] = useState<Lecture | null>(null);

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
  const hasUnreadNotifications = false; // Mock dot removed for HCI clarity

  const handleNotificationPress = useCallback(() => {
    updateSettings({ lastNotificationCheckDate: todayDateString });
    router.push('/notifications');
  }, [todayDateString, updateSettings, router]);

  const handleFabPress = useCallback(() => {
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
  }, [fabScale]);

  const navigateTo = useCallback((route: any) => {
    setFabMenuVisible(false);
    setTimeout(() => {
      router.push(route);
    }, Platform.OS === 'ios' ? 200 : 0);
  }, [router]);

  const handleDeleteClass = useCallback((lecture: Lecture) => {
    // 1. Save data for undo
    setDeletedLecture(lecture);
    // 2. Actually delete it
    deleteLecture(lecture.id);
    // 3. Show Toast
    setUndoToastVisible(true);
  }, [deleteLecture]);

  const handleLongPress = useCallback((lecture: Lecture) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setContextLecture(lecture);
    setContextMenuVisible(true);
  }, []);

  const handleUndoDelete = useCallback(() => {
    if (deletedLecture) {
      // Use context function directly to avoid runtime module-call crashes
      restoreLecture(deletedLecture);
    }
    setUndoToastVisible(false);
    setDeletedLecture(null);
  }, [deletedLecture, restoreLecture]);

  const handleCompleteAssignment = useCallback((assignment: Assignment) => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Temporarily hide it from the list immediately
    setHiddenAssignmentIds(prev => new Set(prev).add(assignment.id));
    setCompletedAssignment(assignment);
    setAssignmentUndoToastVisible(true);

    // Commit the change to the database backend
    updateAssignment(assignment.id, { isCompleted: true });
  }, [updateAssignment]);

  const handleUndoCompleteAssignment = useCallback(() => {
    if (completedAssignment) {
      // Revert the change in the database backend
      updateAssignment(completedAssignment.id, { isCompleted: false });
      // Show it in the list again
      setHiddenAssignmentIds(prev => {
        const next = new Set(prev);
        next.delete(completedAssignment.id);
        return next;
      });
    }
    setAssignmentUndoToastVisible(false);
    setCompletedAssignment(null);
  }, [completedAssignment, updateAssignment]);

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
      {(() => {
        // Prepare Data for FlatList to avoid ScrollView performance issues
        if (todayLectures.length === 0) {
          return (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                </View>
                {lectures.length === 0 ? (
                  <>
                    <Text style={styles.emptyTitle}>No Classes Yet</Text>
                    <Text style={styles.emptySubtitle}>Tap + to add your first class</Text>
                    <TouchableOpacity onPress={() => handleFabPress()} style={styles.emptyButton}>
                      <Text style={styles.emptyButtonText}>Add to Schedule</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyTitle}>No Classes Today</Text>
                    <Text style={styles.emptySubtitle}>You're free for the day! 🎉</Text>
                    {(() => {
                      const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                      const todayIdx = new Date().getDay();
                      let nextLecture: typeof lectures[0] | null = null;
                      let daysAway = 7;
                      for (const lec of lectures) {
                        const lecIdx = dayOrder.indexOf(lec.dayOfWeek);
                        if (lecIdx === -1) continue;
                        let diff = lecIdx - todayIdx;
                        if (diff <= 0) diff += 7;
                        if (diff < daysAway) { daysAway = diff; nextLecture = lec; }
                      }
                      if (!nextLecture) return null;
                      const validNextLecture = nextLecture;
                      const dayLabel = daysAway === 1 ? 'Tomorrow' : validNextLecture.dayOfWeek;
                      return (
                        <View style={styles.nextClassContainer}>
                          <Text style={styles.nextClassHeader}>UPCOMING</Text>
                          <TouchableOpacity
                            style={styles.nextClassCard}
                            activeOpacity={0.7}
                            onPress={() => router.push(`/lecture/${validNextLecture.id}`)}
                          >
                            <View style={styles.nextClassInfo}>
                              <Text style={styles.nextClassName} numberOfLines={1}>{validNextLecture.courseName}</Text>
                              <Text style={styles.nextClassTime}>
                                {dayLabel} • {formatTimeAMPM(validNextLecture.startTime)} {validNextLecture.location ? ` • ${validNextLecture.location}` : ''}
                              </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ opacity: 0.5 }} />
                          </TouchableOpacity>
                        </View>
                      );
                    })()}
                  </>
                )}
              </View>
            </ScrollView>
          );
        }

        const now = new Date();
        const currentLecture = todayLectures.find(l => {
          const [startH, startM] = l.startTime.split(':').map(Number);
          const [endH, endM] = l.endTime.split(':').map(Number);
          const start = new Date(); start.setHours(startH, startM, 0, 0);
          const end = new Date(); end.setHours(endH, endM, 0, 0);
          if (end < start) end.setDate(end.getDate() + 1);
          return now >= start && now < end;
        });

        const upcomingLectures = todayLectures.filter(l => {
          if (currentLecture && l.id === currentLecture.id) return false;
          const [startH, startM] = l.startTime.split(':').map(Number);
          const start = new Date(); start.setHours(startH, startM, 0, 0);
          return start > now;
        });

        const pastLectures = todayLectures.filter(l => {
          if (currentLecture && l.id === currentLecture.id) return false;
          const [endH, endM] = l.endTime.split(':').map(Number);
          const end = new Date(); end.setHours(endH, endM, 0, 0);
          if (end < now) {
            const [startH] = l.startTime.split(':').map(Number);
            if (endH < startH) return false;
            return true;
          }
          return false;
        });

        const isDoneForToday = !currentLecture && upcomingLectures.length === 0 && pastLectures.length > 0;
        const upcomingDeadlines = assignments ? getUpcomingAssignments(assignments) : [];

        // Build FlatList Data Array
        const listData: any[] = [];

        listData.push({ type: 'summary', text: `You have ${todayLectures.length} ${todayLectures.length === 1 ? 'class' : 'classes'} scheduled`, id: 'summary' });

        if (isDoneForToday) {
          listData.push({ type: 'all_done', count: pastLectures.length, id: 'all_done' });
        }

        if (isDoneForToday && pastLectures.length > 0) {
          listData.push({ type: 'header', title: 'COMPLETED CLASSES', id: 'past_header', marginTop: 32 });
          pastLectures.forEach((lecture, idx) => {
            listData.push({ type: 'lecture', lecture, isLast: idx === pastLectures.length - 1, id: `past_${lecture.id}`, opacity: 0.6 });
          });
        }

        if (currentLecture) {
          listData.push({ type: 'header', title: 'HAPPENING NOW', id: 'live_header' });
          listData.push({ type: 'live_lecture', lecture: currentLecture, id: `live_${currentLecture.id}` });
        }

        if (upcomingLectures.length > 0) {
          listData.push({ type: 'header', title: 'UPCOMING CLASSES', id: 'upcoming_header' });
          upcomingLectures.forEach((lecture, idx) => {
            listData.push({ type: 'lecture', lecture, isLast: idx === upcomingLectures.length - 1, id: `upcoming_${lecture.id}` });
          });
        }

        if (upcomingDeadlines.length > 0) {
          let hasAddedHeader = false;
          upcomingDeadlines.forEach((assignment, idx) => {
            // Skip if we just marked it complete
            if (hiddenAssignmentIds.has(assignment.id)) return;
            if (!hasAddedHeader) {
              listData.push({ type: 'header', title: 'UPCOMING DEADLINES', id: 'deadline_header' });
              hasAddedHeader = true;
            }
            const course = lectures.find(l => l.id === assignment.lectureId);
            listData.push({ type: 'deadline', assignment, course, isLast: idx === upcomingDeadlines.length - 1, id: `deadline_${assignment.id}` });
          });
        }

        listData.push({ type: 'footer_hint', id: 'footer_hint' });
        listData.push({ type: 'spacer', id: 'bottom_spacer' });

        const renderItem = ({ item }: { item: any }) => {
          switch (item.type) {
            case 'summary':
              return <Text style={styles.summaryText}>{item.text}</Text>;
            case 'all_done':
              return (
                <View style={styles.allDoneContainer}>
                  <Ionicons name="checkmark-done-circle" size={64} color={colors.primary} />
                  <Text style={styles.allDoneTitle}>Done for today!</Text>
                  <Text style={styles.allDoneSubtitle}>You've finished all {item.count} classes.</Text>
                </View>
              );
            case 'header':
              return <Text style={[styles.sectionHeader, item.marginTop ? { marginTop: item.marginTop } : null]}>{item.title}</Text>;
            case 'live_lecture':
              return (
                <View style={[styles.sectionContainer, { marginTop: 0 }]}>
                  <LiveLectureCard lecture={item.lecture} onPress={() => router.push(`/lecture/${item.lecture.id}`)} />
                </View>
              );
            case 'lecture':
              return (
                <View style={[styles.sectionContainer, { marginTop: 0, opacity: item.opacity || 1 }]}>
                  <View style={[styles.groupedList, item.isLast ? {} : { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]}>
                    <SwipeableLectureRow onDelete={() => handleDeleteClass(item.lecture)}>
                      <CourseItem
                        lecture={item.lecture}
                        isNext={false}
                        onPress={() => router.push(`/lecture/${item.lecture.id}`)}
                        onLongPress={() => handleLongPress(item.lecture)}
                      />
                    </SwipeableLectureRow>
                    {!item.isLast && <View style={styles.separator} />}
                  </View>
                </View>
              );
            case 'deadline':
              return (
                <View style={[styles.sectionContainer, { marginTop: 0 }]}>
                  <View style={[styles.groupedList, item.isLast ? {} : { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0 }]}>
                    <TouchableOpacity
                      style={[styles.deadlineCard, styles.groupedItem]}
                      onPress={() => router.push(`/lecture/${item.assignment.lectureId}`)}
                    >
                      <View style={styles.deadlineRow}>
                        <TouchableOpacity
                          style={styles.checkboxContainer}
                          onPress={() => handleCompleteAssignment(item.assignment)}
                          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                        >
                          <View style={styles.checkboxOutline} />
                        </TouchableOpacity>
                        <View style={styles.deadlineInfo}>
                          <View style={styles.deadlineBadgeRow}>
                            {item.course && (
                              <View style={[styles.miniBadge, { backgroundColor: item.course.color || colors.primary }]}>
                                <Text style={styles.miniBadgeText}>{item.course.courseName}</Text>
                              </View>
                            )}
                            {item.assignment.priority && item.assignment.priority !== 'medium' && (
                              <View style={[
                                styles.priorityDot,
                                { backgroundColor: item.assignment.priority === 'high' ? colors.error : '#3498db' }
                              ]} />
                            )}
                          </View>
                          <Text style={styles.deadlineTitle} numberOfLines={1}>{item.assignment.title}</Text>
                          <Text style={styles.deadlineDate}>
                            Due {new Date(item.assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                      </View>
                      {!item.isLast && <View style={styles.separator} />}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            case 'footer_hint':
              return <Text style={styles.swipeHint}>Tip: Swipe left to delete a class</Text>;
            case 'spacer':
              return <View style={{ height: 100 }} />;
            default:
              return null;
          }
        };

        return (
          <FlatList
            data={listData}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          />
        );
      })()}

      {/* Mini Study Timer Bar pinned just above the tab bar */}
      <View style={{ position: 'absolute', bottom: 80, left: 0, right: 0, paddingHorizontal: 16 }}>
        <MiniTimerBar />
      </View>

      <UndoToast
        visible={undoToastVisible}
        message={`Deleted "${deletedLecture?.courseName}"`}
        onUndo={handleUndoDelete}
        onDismiss={() => {
          setUndoToastVisible(false);
          setDeletedLecture(null);
        }}
      />

      <UndoToast
        visible={assignmentUndoToastVisible}
        message={`Marked "${completedAssignment?.title}" complete`}
        onUndo={handleUndoCompleteAssignment}
        onDismiss={() => {
          setAssignmentUndoToastVisible(false);
          setCompletedAssignment(null);
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
              style={{ backgroundColor: colors.cardBackground, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Math.max(insets.bottom, 24), maxHeight: 500 }}
            >
              <View style={{ width: 40, height: 4, backgroundColor: colors.textMuted + '40', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />

              {fabMenuMode === 'options' ? (
                <>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 24 }}>Add to Schedule</Text>

                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.textMuted + '30' }}
                    onPress={() => navigateTo('/add-lecture?source=Today')}
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
                        onPress={() => navigateTo('/add-lecture?source=Today')}
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
                          onPress={() => navigateTo(`/add-assignment?lectureId=${l.id}&source=Today`)}
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
          {lectures.length === 0 && (
            <Animated.View
              style={[
                styles.fabPulseDot,
                { transform: [{ scale: pulseAnim }] }
              ]}
            />
          )}
        </TouchableOpacity>
      </Animated.View>

      <LectureContextMenu
        visible={contextMenuVisible}
        lecture={contextLecture}
        onClose={() => setContextMenuVisible(false)}
        onView={(lec) => router.push(`/lecture/${lec.id}`)}
        onEdit={(lec) => router.push(`/add-lecture?id=${lec.id}`)}
        onDelete={handleDeleteClass}
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
    paddingBottom: 100, // accommodate fixed MiniTimerBar and FAB
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
  nextClassContainer: {
    width: '100%',
    marginTop: 24,
  },
  nextClassHeader: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    color: colors.textMuted,
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
    alignSelf: 'flex-start',
  },
  nextClassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  nextClassInfo: {
    flex: 1,
    paddingRight: 16,
  },
  nextClassName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textDark,
    marginBottom: 4,
  },
  nextClassTime: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
  },
  timelineContainer: {
    paddingBottom: 40,
  },
  swipeHint: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    textAlign: 'center',
    marginTop: 32,
    marginBottom: 16,
    opacity: 0.9,
    letterSpacing: 0.3,
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
  fabPulseDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFD700', // Gold color for attention
    borderWidth: 2,
    borderColor: '#FFF',
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
  checkboxContainer: {
    marginRight: 16,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  checkboxOutline: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textMuted + '60',
  },
  deadlineDate: {
    fontSize: 12,
    color: colors.textMuted,
  }
});
