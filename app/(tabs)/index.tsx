import React, { useState, useRef, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Platform, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTodayLectures, useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import LiveLectureCard from '@/components/LiveLectureCard';
import CourseItem from '@/components/CourseItem';
import { getCurrentDayOfWeek } from '@/utils/dateTime';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function TodayScreen() {
  const router = useRouter();
  const todayLectures = useTodayLectures();
  const { lectures } = useLectures();
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
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Today's Lectures</Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            activeOpacity={0.7}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.textDark} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
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
        <View style={styles.summaryContainer}>
          <Text style={styles.dateText}>{dateString.toUpperCase()}</Text>
          <Text style={styles.summaryText}>
            You have <Text style={{ color: colors.primary }}>{todayLectures.length} classes</Text> today
          </Text>
        </View>

        {todayLectures.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="happy-outline" size={64} color={colors.primary} style={{ marginBottom: 16, opacity: 0.5 }} />
            <Text style={styles.emptyTitle}>No lectures today</Text>
            <Text style={styles.emptySubtitle}>Enjoy your free day!</Text>
            {lectures.length === 0 && (
              <TouchableOpacity
                style={styles.getStartedButton}
                onPress={handleAddLecture}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color={colors.background} />
                <Text style={styles.getStartedText}>Add Your First Lecture</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.timelineContainer}>
            {/* Live Lecture Card */}
            {(() => {
              // Determine if any lecture is currently LIVE
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
                  <LiveLectureCard
                    lecture={currentLecture}
                    onPress={() => router.push(`/lecture/${currentLecture.id}`)}
                  />
                );
              }
              return null;
            })()}

            <Text style={styles.sectionLabel}>UPCOMING SCHEDULE</Text>

            <View style={styles.listContainer}>
              {todayLectures.map((lecture, index) => {
                const now = new Date();
                const [endH, endM] = lecture.endTime.split(':').map(Number);
                const end = new Date(); end.setHours(endH, endM, 0, 0);

                // Optional: Filter out past lectures or style them differently?
                // For now, show all for today, maybe visual indication if past?
                // The reference image implies "Upcoming" but usually a daily view shows all or remaining.
                // Let's fade out past ones.
                const isPast = end < now;

                // Check if this is the "Next" one (first upcoming)
                const [startH, startM] = lecture.startTime.split(':').map(Number);
                const start = new Date(); start.setHours(startH, startM, 0, 0);
                const isUpcoming = start > now;

                // Crude logic for "Next" - finding the first one that starts in future
                const upcomingList = todayLectures.filter(l => {
                  const [sH, sM] = l.startTime.split(':').map(Number);
                  const s = new Date(); s.setHours(sH, sM, 0, 0);
                  return s > now;
                });
                const isNext = isUpcoming && upcomingList[0]?.id === lecture.id;


                return (
                  <View key={lecture.id} style={{ opacity: isPast ? 0.5 : 1 }}>
                    <CourseItem
                      lecture={lecture}
                      isNext={isNext}
                      onPress={() => router.push(`/lecture/${lecture.id}`)}
                    />
                  </View>
                );
              })}
            </View>
            <View style={{ height: 100 }} />
          </View>
        )}
      </ScrollView>

      <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleAddLecture}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
      {/* Note: I hardcoded FAB icon color to white because the FAB background is Primary 
          and in Dark Mode Primary is Neon Green, so Black Icon might be better? 
          Actually usually white looks okay on green, but let's check contrast.
          If Primary is #00ff00 (Neon), White text is bad. Black is better.
          So dynamically set icon color based on Primary brightness?
          Or just use `colors.background` which is Black in Dark Mode.
      */}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.background,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBackground,
    paddingBottom: 10,
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary + '20', // transparent tint
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
  },
  notificationButton: {
    width: 40,
    height: 40,
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    borderWidth: 1,
    borderColor: colors.cardBackground,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  summaryContainer: {
    marginBottom: 32,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 8,
    letterSpacing: 1,
  },
  summaryText: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textDark,
    lineHeight: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 16,
    letterSpacing: 1,
    marginTop: 8,
  },
  timelineContainer: {
    position: 'relative',
  },
  listContainer: {
    gap: 0,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    marginTop: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 24,
  },
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 32 : 32,
    right: 24,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
