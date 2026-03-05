import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useStudyTimer } from '@/contexts/StudyTimerContext';
import { useSettings } from '@/contexts/SettingsContext';
import { ColorTheme } from '@/types/theme';

/**
 * A persistent mini-bar that shows when the study timer is active.
 * Displays countdown, course name, and pause/play controls.
 * Tapping the bar navigates to the full timer screen.
 */
export default function MiniTimerBar() {
  const timer = useStudyTimer();
  const { colors } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Only show when timer is running or paused with remaining time
  const hasActiveSession = timer.isRunning || timer.secondsLeft < timer.DURATIONS[timer.mode];
  if (!hasActiveSession) return null;

  const minutes = Math.floor(timer.secondsLeft / 60);
  const secs = timer.secondsLeft % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  const modeColor = timer.mode === 'focus' ? colors.primary
    : timer.mode === 'shortBreak' ? '#4ECDC4'
    : '#A78BFA';

  return (
    <TouchableOpacity
      style={[styles.container, { borderLeftColor: modeColor }]}
      onPress={() => router.push('/study-timer')}
      activeOpacity={0.8}
    >
      <View style={[styles.modeIndicator, { backgroundColor: modeColor }]}>
        <Ionicons
          name={timer.mode === 'focus' ? 'book' : 'cafe'}
          size={14}
          color="#FFF"
        />
      </View>

      <View style={styles.info}>
        <Text style={styles.timerText}>{timeString}</Text>
        <Text style={styles.label} numberOfLines={1}>
          {timer.LABELS[timer.mode]}
          {timer.selectedCourse ? ` · ${timer.selectedCourse}` : ''}
        </Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation?.();
            timer.toggleTimer();
          }}
          style={[styles.controlBtn, { backgroundColor: modeColor }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={timer.isRunning ? 'pause' : 'play'}
            size={16}
            color="#FFF"
            style={!timer.isRunning ? { marginLeft: 2 } : undefined}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  modeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    marginTop: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
