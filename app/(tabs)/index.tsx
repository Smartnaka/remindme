import React, { useState, useRef, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform, Animated, RefreshControl } from 'react-native';
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

export default function TodayScreen() {
  const router = useRouter();
  const todayLectures = useTodayLectures();
  const { lectures, deleteLecture } = useLectures();
  const { colors } = useSettings();
  const today = getCurrentDayOfWeek();
  const [refreshing, setRefreshing] = useState(false);
  const fabScale = useRef(new Animated.Value(1)).current;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleAddLecture = () => {
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
              onPress={() => router.push('/notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={colors.primary} />
              <View style={styles.notificationDot} />
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
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

            {/* Live Lecture Card */}
            {(() => {
              const now = new Date();
              const currentLecture = todayLectures.find(l => {
                const [startH, startM] = l.startTime.split(':').map(Number);
                const [endH, endM] = l.endTime.split(':').map(Number);
                const start = new Date(); start.setHours(startH, startM, 0, 0);
                const end = new Date(); end.setHours(endH, endM, 0, 0);
                return now >= start && now <= end;
              });

              if (currentLecture) {
                return (
                  <View style={styles.sectionContainer}>
                    <Text style={styles.sectionHeader}>HAPPENING NOW</Text>
                    <LiveLectureCard
                      lecture={currentLecture}
                      onPress={() => router.push(`/lecture/${currentLecture.id}`)}
                    />
                  </View>
                );
              }
              return null;
            })()}

            <View style={styles.sectionContainer}>
              <Text style={styles.sectionHeader}>UPCOMING</Text>
              <View style={styles.groupedList}>
                {todayLectures.map((lecture, index) => {
                  const now = new Date();
                  const [endH, endM] = lecture.endTime.split(':').map(Number);
                  const end = new Date(); end.setHours(endH, endM, 0, 0);
                  const isPast = end < now;

                  const isLast = index === todayLectures.length - 1;

                  return (
                    <View key={lecture.id} style={{ opacity: isPast ? 0.6 : 1 }}>
                      <SwipeableLectureRow onDelete={() => deleteLecture(lecture.id)}>
                        <CourseItem
                          lecture={lecture}
                          isNext={false} // Clean list look, remove "Next" highlight for now or restyle it
                          onPress={() => router.push(`/lecture/${lecture.id}`)}
                        />
                      </SwipeableLectureRow>
                      {!isLast && <View style={styles.separator} />}
                    </View>
                  );
                })}
              </View>
            </View>
            <View style={{ height: 100 }} />
          </View>
        )}
      </ScrollView>
      {/* Removed FAB in favor of Header Add Button */}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background, // Should be light gray in future, but keeping existing for now
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
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
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
    color: colors.textMuted,
    marginBottom: 24,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupedList: {
    // No background/border for now if using existing cards, 
    // but typically grouped list puts them in a container.
    // CourseItem likely returns a card. Let's stack them.
    gap: 12,
  },
  separator: {
    // If cards are separated, no divider needed.
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
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
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
    fontWeight: '600',
    color: colors.primary,
  },
  timelineContainer: {
    paddingBottom: 40,
  },
});
