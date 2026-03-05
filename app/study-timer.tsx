import React, { useMemo, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Platform, Animated, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/contexts/SettingsContext';
import { useLectures } from '@/contexts/LectureContext';
import { useStudyTimer } from '@/contexts/StudyTimerContext';
import { ColorTheme } from '@/types/theme';
import * as Haptics from 'expo-haptics';

export default function StudyTimerScreen() {
  const router = useRouter();
  const { colors, settings } = useSettings();
  const { lectures } = useLectures();
  const timer = useStudyTimer();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const progressAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Course names for picker
  const courseNames = useMemo(() => {
    const names = [...new Set(lectures.map(l => l.courseName))];
    return names.sort();
  }, [lectures]);

  // Animate progress
  useEffect(() => {
    const total = timer.DURATIONS[timer.mode];
    const progress = timer.secondsLeft / total;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [timer.secondsLeft, timer.mode]);

  // Pulse animation when running
  useEffect(() => {
    if (timer.isRunning && !settings.reduceMotion) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [timer.isRunning, settings.reduceMotion]);

  // Format time as MM:SS
  const minutes = Math.floor(timer.secondsLeft / 60);
  const secs = timer.secondsLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const modeColor = timer.mode === 'focus' ? colors.primary
    : timer.mode === 'shortBreak' ? '#4ECDC4'
    : '#A78BFA';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar
        barStyle={colors.cardBackground === '#F8F9FA' ? 'dark-content' : 'light-content'}
        backgroundColor="transparent"
        translucent
      />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Study Timer</Text>
        <View style={styles.sessionBadge}>
          <Ionicons name="flame" size={16} color="#FF6B6B" />
          <Text style={styles.sessionText}>{timer.sessions}</Text>
        </View>
      </View>

      {/* Mode Tabs */}
      <View style={styles.modeTabs}>
        {(['focus', 'shortBreak', 'longBreak'] as const).map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.modeTab, timer.mode === m && { backgroundColor: modeColor }]}
            onPress={() => timer.switchMode(m)}
          >
            <Text style={[styles.modeTabText, timer.mode === m && styles.modeTabTextActive]}>
              {timer.LABELS[m]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Course Picker */}
      {courseNames.length > 0 && (
        <View style={styles.coursePicker}>
          <Ionicons name="book-outline" size={16} color={colors.textMuted} />
          <Text style={styles.coursePickerLabel}>Studying:</Text>
          <View style={styles.courseChips}>
            {courseNames.slice(0, 4).map(name => (
              <TouchableOpacity
                key={name}
                style={[
                  styles.courseChip,
                  timer.selectedCourse === name && { backgroundColor: modeColor, borderColor: modeColor },
                ]}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  timer.setSelectedCourse(timer.selectedCourse === name ? null : name);
                }}
              >
                <Text
                  style={[
                    styles.courseChipText,
                    timer.selectedCourse === name && { color: '#FFF' },
                  ]}
                  numberOfLines={1}
                >
                  {name.length > 12 ? name.slice(0, 12) + '…' : name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Timer Circle */}
      <View style={styles.timerContainer}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={styles.circleContainer}>
            {/* Background circle */}
            <View style={[styles.circleBackground, { borderColor: modeColor + '20' }]} />

            {/* Timer display */}
            <View style={styles.timerTextContainer}>
              <Text style={[styles.timerText, { color: modeColor }]}>{timeString}</Text>
              <Text style={styles.modeLabel}>{timer.LABELS[timer.mode]}</Text>
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={timer.resetTimer}>
          <Ionicons name="refresh" size={28} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: modeColor }]}
          onPress={timer.toggleTimer}
          activeOpacity={0.8}
        >
          <Ionicons
            name={timer.isRunning ? 'pause' : 'play'}
            size={36}
            color="#FFF"
            style={!timer.isRunning ? { marginLeft: 4 } : undefined}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => {
            const nextMode = timer.mode === 'focus' ? 'shortBreak' : 'focus';
            timer.switchMode(nextMode);
          }}
        >
          <Ionicons name="play-skip-forward" size={28} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Session counter */}
      <View style={styles.sessionInfo}>
        <View style={styles.sessionDots}>
          {[0, 1, 2, 3].map(i => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < (timer.sessions % 4) ? modeColor : colors.textMuted + '30',
                },
              ]}
            />
          ))}
        </View>
        <Text style={styles.sessionInfoText}>
          {timer.sessions} session{timer.sessions !== 1 ? 's' : ''} completed
          {timer.selectedCourse ? ` • ${timer.selectedCourse}` : ''}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark,
  },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardBackground,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sessionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
  },
  modeTabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 4,
    marginTop: 8,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeTabTextActive: {
    color: '#FFF',
  },
  coursePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 16,
    gap: 8,
  },
  coursePickerLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
  courseChips: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    flexWrap: 'wrap',
  },
  courseChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.textMuted + '30',
    backgroundColor: colors.cardBackground,
  },
  courseChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textDark,
  },
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleContainer: {
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleBackground: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 8,
  },
  timerTextContainer: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 64,
    fontWeight: '200',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingBottom: 24,
  },
  secondaryBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  sessionInfo: {
    alignItems: 'center',
    paddingBottom: 32,
    gap: 10,
  },
  sessionDots: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sessionInfoText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '500',
  },
});
