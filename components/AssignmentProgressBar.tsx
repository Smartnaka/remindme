import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSettings } from '@/contexts/SettingsContext';
import { ColorTheme } from '@/types/theme';

interface AssignmentProgressBarProps {
  /** ISO date string for the due date */
  dueDate: string;
  /** Whether the assignment is completed */
  isCompleted: boolean;
}

/**
 * Visual countdown bar that fills and changes color as a deadline approaches.
 * Green (>7 days) → Yellow (3-7 days) → Orange (1-3 days) → Red (<1 day)
 */
export default function AssignmentProgressBar({ dueDate, isCompleted }: AssignmentProgressBarProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // If completed, show a full green bar
  if (isCompleted) {
    return (
      <View style={styles.container}>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: '100%', backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.label, { color: colors.primary }]}>Done ✓</Text>
      </View>
    );
  }

  // If overdue
  if (diffMs <= 0) {
    return (
      <View style={styles.container}>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: '100%', backgroundColor: '#FF4757' }]} />
        </View>
        <Text style={[styles.label, { color: '#FF4757' }]}>Overdue!</Text>
      </View>
    );
  }

  // Calculate urgency (14 days = full planning window)
  const PLANNING_WINDOW = 14;
  const elapsed = Math.max(0, PLANNING_WINDOW - diffDays);
  const progress = Math.min(1, elapsed / PLANNING_WINDOW);

  // Color based on remaining days
  let barColor: string;
  let label: string;

  if (diffDays > 7) {
    barColor = colors.primary; // Green — plenty of time
    label = `${Math.ceil(diffDays)}d left`;
  } else if (diffDays > 3) {
    barColor = '#FFD700'; // Yellow — this week
    label = `${Math.ceil(diffDays)}d left`;
  } else if (diffDays > 1) {
    barColor = '#FF9F43'; // Orange — urgent
    label = `${Math.ceil(diffDays)}d left`;
  } else {
    // Less than 24 hours
    const hoursLeft = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    barColor = '#FF4757'; // Red — critical
    label = hoursLeft > 0 ? `${hoursLeft}h left` : 'Due soon!';
  }

  return (
    <View style={styles.container}>
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            {
              width: `${Math.max(5, progress * 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.label, { color: barColor }]}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  barBackground: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted + '20',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    minWidth: 55,
    textAlign: 'right',
  },
});
