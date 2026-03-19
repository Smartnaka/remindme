import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Exam } from '@/types/exam';
import { ColorTheme } from '@/types/theme';
import { useSettings } from '@/contexts/SettingsContext';
import { useExams } from '@/contexts/ExamContext';
import { Ionicons } from '@expo/vector-icons';
import ConfirmationModal from './ConfirmationModal';
import * as Haptics from 'expo-haptics';

interface ExamCardProps {
  exam: Exam;
}

export default function ExamCard({ exam }: ExamCardProps) {
  const { colors } = useSettings();
  const { deleteExam } = useExams();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);

  const daysLeft = useMemo(() => {
    const examDate = new Date(exam.date);
    const now = new Date();
    const diffTime = examDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [exam.date]);

  const timeLeftColor = useMemo(() => {
    if (daysLeft < 0) return colors.textMuted; // Past
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

  const handleLongPress = () => {
    if (Haptics?.impactAsync) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    await deleteExam(exam.id);
    setIsDeleteModalVisible(false);
    if (Haptics?.notificationAsync) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        activeOpacity={0.7}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        <View style={styles.mainContent}>
          <Text style={styles.courseName}>{exam.courseName}</Text>
          <View style={styles.detailsRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
            <Text style={styles.detailText}>{formatDate(exam.date)}</Text>
          </View>
          {exam.location && (
            <View style={styles.detailsRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <Text style={styles.detailText}>{exam.location}</Text>
            </View>
          )}
        </View>

        <View style={styles.rightContent}>
          <Text style={[styles.daysNumber, { color: timeLeftColor }]}>
            {daysLeft < 0 ? 'Done' : daysLeft === 0 ? 'Today' : daysLeft}
          </Text>
          {daysLeft > 0 && <Text style={[styles.daysLabel, { color: timeLeftColor }]}>Days</Text>}
        </View>
      </TouchableOpacity>

      <ConfirmationModal
        visible={isDeleteModalVisible}
        title="Delete Exam"
        message={`Are you sure you want to delete the exam for "${exam.courseName}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        isDestructive
        onConfirm={handleConfirmDelete}
        onCancel={() => setIsDeleteModalVisible(false)}
      />
    </>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    // Removed shadows for a cleaner, flatter look
  },
  mainContent: {
    flex: 1,
    paddingRight: 12,
  },
  courseName: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: colors.textDark,
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.textMuted,
  },
  rightContent: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingLeft: 12,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.textMuted + '30',
  },
  daysNumber: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  daysLabel: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    marginTop: -2,
  },
});
