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
        <View style={styles.headerRow}>
          <View style={styles.courseInfo}>
            <Text style={styles.courseName} numberOfLines={1}>{exam.courseName}</Text>
          </View>
          
          <View style={[styles.badge, { backgroundColor: timeLeftColor + '15' }]}>
            <Text style={[styles.badgeText, { color: timeLeftColor }]}>
              {daysLeft < 0 ? 'Done' : daysLeft === 0 ? 'Today' : `${daysLeft} Days Left`}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.footerRow}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textDark} style={{ opacity: 0.6 }} />
            <Text style={styles.detailText}>{formatDate(exam.date)}</Text>
          </View>
          
          {exam.location && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color={colors.textDark} style={{ opacity: 0.6 }} />
              <Text style={styles.detailText} numberOfLines={1}>{exam.location}</Text>
            </View>
          )}
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.textMuted + '20',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  courseInfo: {
    flex: 1,
    marginRight: 12,
  },
  courseName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.textDark,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.textMuted + '15',
    marginBottom: 12,
  },
  footerRow: {
    flexDirection: 'column',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: colors.textMuted,
    flex: 1,
  },
});
