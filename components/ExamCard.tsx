import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Exam } from '@/types/exam';
import { ColorTheme } from '@/types/theme';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';

interface ExamCardProps {
  exam: Exam;
}

export default function ExamCard({ exam }: ExamCardProps) {
  const { colors } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const daysLeft = useMemo(() => {
    const examDate = new Date(exam.date);
    const now = new Date();
    const diffTime = examDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [exam.date]);

  const timeLeftColor = useMemo(() => {
    if (daysLeft <= 3) return colors.error; // Panic mode!
    if (daysLeft <= 7) return '#FF9500'; // Warning (Orange)
    return colors.primary; // Safe (Green)
  }, [daysLeft, colors]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
        <View style={styles.leftContent}>
            <View style={[styles.daysContainer, { backgroundColor: timeLeftColor }]}>
                <Text style={styles.daysNumber}>{Math.max(0, daysLeft)}</Text>
                <Text style={styles.daysLabel}>DAYS</Text>
            </View>
        </View>
        
        <View style={styles.mainContent}>
            <Text style={styles.courseName}>{exam.courseName}</Text>
            <Text style={styles.dateText}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} /> {formatDate(exam.date)}
            </Text>
            {exam.location && (
                <Text style={styles.locationText}>
                    <Ionicons name="location-outline" size={14} color={colors.textMuted} /> {exam.location}
                </Text>
            )}
        </View>
    </View>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  leftContent: {
    marginRight: 16,
  },
  daysContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
  },
  daysLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    marginTop: -2,
  },
  mainContent: {
    flex: 1,
  },
  courseName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textDark,
    marginBottom: 6,
  },
  dateText: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
