import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useLectures } from '@/contexts/LectureContext';
import { useSettings } from '@/contexts/SettingsContext';
import { Ionicons } from '@expo/vector-icons';
import { formatTimeAMPM } from '@/utils/dateTime';
import { ColorTheme } from '@/types/theme';
import ConfirmationModal from '@/components/ConfirmationModal';

export default function LectureDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getLectureById, deleteLecture } = useLectures();
  const { colors } = useSettings();

  const lecture = useMemo(() => getLectureById(id as string), [id, getLectureById]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (!lecture) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textDark} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Lecture not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.returnButton}>
            <Text style={styles.returnButtonText}>Return to Schedule</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ... (keeping other handlers)

  // Replace handleDelete to just toggle modal
  const handleDeletePress = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    await deleteLecture(lecture.id);
    setShowDeleteModal(false);
    router.back();
  };

  const handleEdit = () => {
    router.push({ pathname: '/add-lecture', params: { id: lecture.id } });
  };


  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.titleContainer}>
          <Text style={styles.title}>{lecture.courseName}</Text>
          {lecture.location && <Text style={styles.subtitle}>{lecture.location}</Text>}
        </View>

        <View style={styles.groupedList}>
          <View style={styles.row}>
            <Text style={styles.label}>Day</Text>
            <Text style={styles.value}>{lecture.dayOfWeek}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.label}>Start Time</Text>
            <Text style={styles.value}>{formatTimeAMPM(lecture.startTime)}</Text>
          </View>
          <View style={styles.separator} />
          <View style={styles.row}>
            <Text style={styles.label}>End Time</Text>
            <Text style={styles.value}>{formatTimeAMPM(lecture.endTime)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeletePress}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteText}>Delete Lecture</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Delete Confirmation Modal */}
      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Lecture?"
        message={`Are you sure you want to remove "${lecture.courseName}"? This cannot be undone.`}
        confirmText="Delete"
        isDestructive
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.cardBackground === '#F8F9FA' ? '#F2F2F7' : '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 17,
    color: colors.primary,
    marginLeft: -4,
  },
  editButton: {
    padding: 8,
  },
  editText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    padding: 20,
  },
  titleContainer: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 17,
    color: colors.textMuted,
  },
  groupedList: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.cardBackground,
  },
  label: {
    fontSize: 16,
    color: colors.textDark,
  },
  value: {
    fontSize: 16,
    color: colors.textMuted,
  },
  separator: {
    height: 1,
    backgroundColor: colors.textMuted + '20',
    marginLeft: 16,
  },
  deleteButton: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteText: {
    color: colors.error,
    fontWeight: '600',
    fontSize: 17,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: 20,
    textAlign: 'center',
  },
  returnButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  returnButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background === '#000000' ? '#000' : '#FFF',
  },
});
